const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const CollectionMetadata = require("../models/CollectionMetadata");
const logger = require("../utils/logger"); // or console

// In-memory progress tracker
const uploadProgress = {};
/*
  uploadProgress[collectionName] = {
    totalItems: number,
    processedItems: number,
    done: boolean,
    error: string (optional)
  }
*/

// 1) SSE Endpoint for Progress
router.get("/progress/:collectionName", (req, res) => {
  const { collectionName } = req.params;

  // SSE headers
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // For NGINX proxy

  // CORS headers for cross-domain requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // Set a longer timeout for the connection
  req.socket.setTimeout(30 * 60 * 1000);

  // Ensure compression is disabled for SSE
  res.setHeader("Content-Encoding", "identity");

  // Explicit flush for all Express versions
  if (typeof res.flush === "function") {
    res.flush();
  }

  if (!uploadProgress[collectionName]) {
    // If no data yet, init or return zero
    uploadProgress[collectionName] = {
      totalItems: 0,
      processedItems: 0,
      done: false,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      failedSamples: [],
    };
  }

  // Send initial comment to establish connection
  res.write(":ok\n\n");

  if (typeof res.flush === "function") {
    res.flush();
  }

  const sendProgress = () => {
    try {
      const prog = uploadProgress[collectionName];
      if (prog) {
        // Calculate processing time in milliseconds
        const processingTime = Date.now() - prog.startTime;

        const progressPercent =
          prog.totalItems > 0
            ? Math.min(
                Math.floor((prog.processedItems * 100) / prog.totalItems),
                100
              )
            : 0;

        // Create a response object without sending the raw startTime
        const responseData = {
          totalItems: prog.totalItems,
          processedItems: prog.processedItems,
          progressPercent: progressPercent,
          done: prog.done,
          processingTime: processingTime,
          lastUpdate: Date.now(),
        };

        // Add additional properties if they exist
        if (prog.totalInserted !== undefined)
          responseData.totalInserted = prog.totalInserted;
        if (prog.totalFailed !== undefined)
          responseData.totalFailed = prog.totalFailed;
        if (prog.error) responseData.error = prog.error;
        if (prog.failedSamples) responseData.failedSamples = prog.failedSamples;

        res.write(`data: ${JSON.stringify(responseData)}\n\n`);

        // Update last update time in the progress tracker
        prog.lastUpdate = Date.now();

        // Explicitly flush the data
        if (typeof res.flush === "function") {
          res.flush();
        }
      } else {
        // If progress was deleted, send empty progress
        res.write(
          `data: ${JSON.stringify({
            totalItems: 0,
            processedItems: 0,
            progressPercent: 0,
            done: false,
            processingTime: 0,
          })}\n\n`
        );

        if (typeof res.flush === "function") {
          res.flush();
        }
      }
    } catch (err) {
      logger.error(`Error sending SSE progress for ${collectionName}:`, err);
      try {
        res.write(
          `data: ${JSON.stringify({
            error: "Server error while sending progress",
          })}\n\n`
        );
        if (typeof res.flush === "function") {
          res.flush();
        }
      } catch (writeErr) {
        // Connection likely already closed, ignore
      }
    }
  };

  // Send initial progress
  sendProgress();

  // Send heartbeat every 15 seconds to prevent timeout
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(":ping\n\n");
      if (typeof res.flush === "function") {
        res.flush();
      }
    } catch (err) {
      clearInterval(heartbeatInterval);
      clearInterval(progressInterval);
    }
  }, 15000);

  // Send progress updates at regular intervals
  const progressInterval = setInterval(() => {
    try {
      const prog = uploadProgress[collectionName];

      // Handle case where upload process has been completed or removed
      if (!prog) {
        clearInterval(heartbeatInterval);
        clearInterval(progressInterval);
        res.end();
        return;
      }

      sendProgress();

      // Close connection if done
      if (prog.done) {
        clearInterval(heartbeatInterval);
        clearInterval(progressInterval);

        // Send one final update
        sendProgress();

        // Keep progress data for a short time after completion
        setTimeout(() => {
          delete uploadProgress[collectionName];
        }, 60000); // 1 minute

        res.end();
      }
    } catch (err) {
      logger.error(`SSE interval error for ${collectionName}:`, err);
      clearInterval(heartbeatInterval);
      clearInterval(progressInterval);
      try {
        res.end();
      } catch (endErr) {
        // Already closed, ignore
      }
    }
  }, 1000);

  // Handle client disconnection
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(progressInterval);
  });

  // Handle connection errors
  req.on("error", (err) => {
    logger.error(`SSE connection error for ${collectionName}:`, err);
    clearInterval(heartbeatInterval);
    clearInterval(progressInterval);
    try {
      res.end();
    } catch (endErr) {
      // Already closed, ignore
    }
  });
});

// 2) multer setup for large JSON files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads/temp");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniquePrefix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 10 }, // up to 10GB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/json",
      "text/json",
      "text/plain", // Some browsers might send JSON as text/plain
    ];
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".json")
    ) {
      return cb(null, true);
    }
    const error = new Error("Only JSON files are allowed");
    error.code = "LIMIT_FILE_TYPES";
    return cb(error, false);
  },
});

// Helper function to safely parse JSON with streaming for large files
async function parseJsonWithStreaming(filePath, encoding = "utf-8") {
  // We'll use a simple file read approach but with careful error handling
  // and a separate processing thread to avoid blocking
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, encoding, (err, data) => {
      if (err) return reject(err);

      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON: ${parseErr.message}`));
      }
    });
  });
}

// Helper function to navigate to a specific path in a JSON object
function getByPath(obj, path) {
  if (!path || path === "") return obj;

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle array index notation (e.g., items[0])
    const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [_, propName, index] = arrayMatch;
      current = current[propName]?.[parseInt(index, 10)];
    } else {
      current = current[part];
    }
  }

  return current;
}

// Helper to flatten JSON objects into documents for MongoDB
function flattenJsonObjects(data, rootPath = "", pathMappings = {}) {
  // Get the target data at rootPath if specified
  const targetData = rootPath ? getByPath(data, rootPath) : data;
  if (!targetData) {
    throw new Error(`Root path "${rootPath}" not found in JSON data`);
  }

  const documents = [];
  const failedItems = [];

  // Process based on data type
  if (Array.isArray(targetData)) {
    // If it's an array, each item becomes a document
    targetData.forEach((item, index) => {
      try {
        if (typeof item === "object" && item !== null) {
          documents.push(item);
        } else {
          // Handle primitive values in array
          documents.push({ value: item, arrayIndex: index });
        }
      } catch (err) {
        failedItems.push({
          path: `${rootPath}[${index}]`,
          error: err.message,
        });
      }
    });
  } else if (typeof targetData === "object" && targetData !== null) {
    // If it's a single object, it becomes one document
    documents.push(targetData);
  } else {
    // Handle primitive root value
    documents.push({ value: targetData });
  }

  // Apply path mappings if provided
  if (Object.keys(pathMappings).length > 0) {
    documents.forEach((doc) => {
      Object.entries(pathMappings).forEach(([sourcePath, targetPath]) => {
        const value = getByPath(doc, sourcePath);
        if (value !== undefined) {
          // Create nested structure based on targetPath
          let current = doc;
          const parts = targetPath.split(".");

          // Create nested objects for all parts except the last one
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }

          // Set the value at the final part
          const lastPart = parts[parts.length - 1];
          current[lastPart] = value;
        }
      });
    });
  }

  return { documents, failedItems };
}

// 3) Main POST route for JSON
router.post("/:collectionName", upload.single("jsonFile"), async (req, res) => {
  const { collectionName } = req.params;
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    // Validate and setup phase
    if (!/^[a-zA-Z0-9_]+$/.test(collectionName)) {
      await fs.unlink(uploadedFile.path);
      return res.status(400).json({ message: "Invalid collection name" });
    }

    const encoding = req.body.encoding || "utf-8";
    const rootPath = req.body.rootPath || "";
    const batchSizeParam = parseInt(req.body.batchSize, 10);
    const batchSize = isNaN(batchSizeParam) ? 1000 : batchSizeParam;

    // Parse path mappings if provided
    let pathMappings = {};
    if (req.body.pathMappings) {
      try {
        pathMappings = JSON.parse(req.body.pathMappings);
      } catch (e) {
        logger.warn(`Failed to parse pathMappings: ${e.message}`);
      }
    }

    // Check if the collection exists (optional) - can remove if not needed
    try {
      const meta = await CollectionMetadata.findOne({ collectionName });
      if (!meta) {
        await fs.unlink(uploadedFile.path);
        return res
          .status(404)
          .json({ message: "Collection metadata not found" });
      }
    } catch (metaErr) {
      logger.error(`Error checking collection metadata: ${metaErr.message}`);
      // Continue with upload even if metadata check fails
    }

    // Initialize progress
    uploadProgress[collectionName] = {
      totalItems: 0,
      processedItems: 0,
      done: false,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      failedSamples: [],
    };

    // Respond early to client
    res.status(202).json({
      message: "File upload accepted, processing started",
      statusEndpoint: `/api/upload-json/progress/${collectionName}`,
    });

    // Move the file to a non-watched directory to prevent nodemon restarts
    const processingDir = path.join(__dirname, "../uploads/processing");
    fs.mkdirSync(processingDir, { recursive: true });
    const processingPath = path.join(
      processingDir,
      path.basename(uploadedFile.path)
    );

    // Move file to processing directory
    await fs.move(uploadedFile.path, processingPath, { overwrite: true });
    logger.info(`Moved JSON file to processing directory: ${processingPath}`);

    // Parse JSON file
    logger.info(`Starting to parse JSON file: ${processingPath}`);
    const jsonData = await parseJsonWithStreaming(processingPath, encoding);

    // Flatten JSON structure based on rootPath and pathMappings
    logger.info(`Flattening JSON data with rootPath: ${rootPath}`);
    const { documents, failedItems } = flattenJsonObjects(
      jsonData,
      rootPath,
      pathMappings
    );

    // Update total count
    uploadProgress[collectionName].totalItems = documents.length;
    uploadProgress[collectionName].lastUpdate = Date.now();

    // Create reference to collection
    const collection = mongoose.connection.collection(collectionName);

    // Set up counters
    let totalInserted = 0;
    let totalFailed = 0;
    let processedItems = 0;
    const startTime = Date.now();

    // Process in batches
    logger.info(
      `Processing ${documents.length} items in batches of ${batchSize}`
    );

    // Process a batch of documents
    const processBatch = async (batch) => {
      if (batch.length === 0) return;

      const operations = batch.map((doc) => ({
        insertOne: {
          document: {
            ...doc,
            lastUpdate: new Date(),
          },
        },
      }));

      try {
        const result = await collection.bulkWrite(operations, {
          ordered: false,
          writeConcern: { w: 1 },
        });

        totalInserted += result.insertedCount;
        return result;
      } catch (err) {
        // Even with errors, some documents may have been inserted
        if (err.result) {
          totalInserted += err.result.nInserted || 0;
        }

        if (err.writeErrors) {
          totalFailed += err.writeErrors.length;

          // Sample some errors to report back
          if (!uploadProgress[collectionName].failedSamples) {
            uploadProgress[collectionName].failedSamples = [];
          }

          if (uploadProgress[collectionName].failedSamples.length < 10) {
            err.writeErrors.slice(0, 5).forEach((writeError, idx) => {
              if (writeError.err) {
                uploadProgress[collectionName].failedSamples.push({
                  index: writeError.index,
                  error:
                    writeError.err.errmsg ||
                    writeError.err.message ||
                    "Unknown error",
                  path: batch[writeError.index]
                    ? `item-${processedItems + writeError.index}`
                    : "unknown",
                });
              }
            });
          }
        } else {
          totalFailed += batch.length;
          if (!uploadProgress[collectionName].failedSamples) {
            uploadProgress[collectionName].failedSamples = [];
          }

          if (uploadProgress[collectionName].failedSamples.length < 10) {
            uploadProgress[collectionName].failedSamples.push({
              error: err.message || "Batch insert failed",
              path: `batch-${processedItems}`,
            });
          }
        }
        return err;
      }
    };

    // Include initial failedItems in the count and samples
    if (failedItems.length > 0) {
      totalFailed += failedItems.length;
      if (!uploadProgress[collectionName].failedSamples) {
        uploadProgress[collectionName].failedSamples = [];
      }
      uploadProgress[collectionName].failedSamples = failedItems.slice(0, 10);
    }

    // Process all documents in batches with concurrency control like in CSV
    let currentBatch = [];
    let activePromises = [];
    const maxConcurrent = 3; // Adjust based on server capacity

    // Process all documents in batches
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      currentBatch.push(doc);
      processedItems++;

      // Update progress every 100 items or at endpoints
      if (
        processedItems % 100 === 0 ||
        processedItems === 1 ||
        processedItems === documents.length
      ) {
        uploadProgress[collectionName].processedItems = processedItems;
        uploadProgress[collectionName].lastUpdate = Date.now();
      }

      // When batch is full
      if (currentBatch.length >= batchSize) {
        const batchToProcess = [...currentBatch];
        currentBatch = [];

        // If we have too many active promises, wait for some to complete
        if (activePromises.length >= maxConcurrent) {
          const oldestPromise = activePromises.shift();
          await oldestPromise;
          const newPromise = processBatch(batchToProcess);
          activePromises.push(newPromise);
        } else {
          // Otherwise just process
          const newPromise = processBatch(batchToProcess);
          activePromises.push(newPromise);
        }
      }
    }

    // Process final batch
    if (currentBatch.length > 0) {
      await processBatch(currentBatch);
    }

    // Wait for all pending operations
    await Promise.all(activePromises);

    // Final progress update
    uploadProgress[collectionName].processedItems = processedItems;
    uploadProgress[collectionName].done = true;
    uploadProgress[collectionName].totalInserted = totalInserted;
    uploadProgress[collectionName].totalFailed = totalFailed;
    uploadProgress[collectionName].lastUpdate = Date.now();

    // Store the processing time in milliseconds
    const processingTimeMs = Date.now() - startTime;
    uploadProgress[collectionName].processingTime = processingTimeMs;

    const durationSeconds = processingTimeMs / 1000;
    logger.info(
      `JSON Upload Stats for ${collectionName}:
       totalItems: ${documents.length},
       Inserted: ${totalInserted},
       Failed: ${totalFailed},
       Time: ${durationSeconds}s`
    );

    // Clean up file
    await fs.unlink(processingPath);
  } catch (err) {
    logger.error("JSON Upload Error:", err);

    if (uploadProgress[collectionName]) {
      uploadProgress[collectionName].error = err.message;
      uploadProgress[collectionName].done = true;
      uploadProgress[collectionName].lastUpdate = Date.now();
    }

    if (uploadedFile?.path) {
      try {
        await fs.unlink(uploadedFile.path);
      } catch (unlinkErr) {
        logger.error("Error removing temp file:", unlinkErr);
      }
    }

    // If response hasn't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({
        message: "Internal server error",
        error: err.message,
      });
    }
  }
});

// 4) Error Handling
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File size is too large. Max limit is 10GB",
    });
  }
  if (err.code === "LIMIT_FILE_TYPES") {
    return res.status(400).json({
      message: "Only JSON files are allowed",
    });
  }
  logger.error("Unhandled upload error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = router;
