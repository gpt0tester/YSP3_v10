const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const CollectionMetadata = require("../models/CollectionMetadata");
const logger = require("../utils/logger"); // or console

// In-memory progress tracker
const uploadProgress = {};
/*
  uploadProgress[collectionName] = {
    totalRows: number,
    processedCount: number,
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

  // Explicit flush for all Express versions
  if (typeof res.flush === "function") {
    res.flush();
  }

  if (!uploadProgress[collectionName]) {
    // If no data yet, init or return zero
    uploadProgress[collectionName] = {
      totalRows: 0,
      processedCount: 0,
      done: false,
      startTime: Date.now(),
    };
  }

  const sendProgress = () => {
    const prog = uploadProgress[collectionName];
    if (prog) {
      // Calculate processing time in milliseconds
      const processingTime = Date.now() - prog.startTime;

      const progressPercent =
        prog.totalRows > 0
          ? Math.min(
              Math.floor((prog.processedCount * 100) / prog.totalRows),
              100
            )
          : 0;

      // Create a response object without sending the raw startTime
      const responseData = {
        totalRows: prog.totalRows,
        processedCount: prog.processedCount,
        progressPercent: progressPercent,
        done: prog.done,
        processingTime: processingTime,
      };

      // Add additional properties if they exist
      if (prog.totalInserted !== undefined)
        responseData.totalInserted = prog.totalInserted;
      if (prog.totalFailed !== undefined)
        responseData.totalFailed = prog.totalFailed;
      if (prog.error) responseData.error = prog.error;

      res.write(`data: ${JSON.stringify(responseData)}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({
          totalRows: 0,
          processedCount: 0,
          progressPercent: 0, // Add percentage here too
          done: false,
          processingTime: 0,
        })}\n\n`
      );
    }
  };

  // Initial progress
  sendProgress();

  const intervalId = setInterval(() => {
    try {
      const prog = uploadProgress[collectionName];

      // Handle case where upload process has been completed or removed
      if (!prog) {
        clearInterval(intervalId);
        res.end();
        return;
      }

      sendProgress();

      // // Close connection if done or if it's been too long (5 min timeout)
      // if (prog.done || Date.now() - prog.startTime > 5 * 60 * 1000) {
      //   clearInterval(intervalId);

      //   // Clean up stale progress data after completion
      //   if (prog.done) {
      //     delete uploadProgress[collectionName];
      //     // Keep data for a short period for any late connections
      //     // setTimeout(() => {
      //     //   delete uploadProgress[collectionName];
      //     // }, 60000); // Remove after 1 minute
      //   }

      //   res.end();

      // Close connection if done or if it's been too long (5 min timeout)
      if (prog.done) {
        clearInterval(intervalId);

        // Clean up stale progress data after completion
        if (prog.done) {
          delete uploadProgress[collectionName];
          // Keep data for a short period for any late connections
          // setTimeout(() => {
          //   delete uploadProgress[collectionName];
          // }, 60000); // Remove after 1 minute
        }

        res.end();
      }
    } catch (err) {
      logger.error(`SSE error for ${collectionName}:`, err);
      clearInterval(intervalId);
      res.end();
    }
  }, 1000);

  // Handle client disconnection
  req.on("close", () => {
    clearInterval(intervalId);
  });

  // Handle connection errors
  req.on("error", (err) => {
    logger.error(`SSE connection error for ${collectionName}:`, err);
    clearInterval(intervalId);
    res.end();
  });
});

// 2) multer setup for large CSV
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
      "text/csv",
      "application/vnd.ms-excel",
      "application/csv",
      "text/plain",
    ];
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      return cb(null, true);
    }
    const error = new Error("Only CSV files are allowed");
    error.code = "LIMIT_FILE_TYPES";
    return cb(error, false);
  },
});

// Utility to count lines quickly
async function countLines(filePath, encoding = "utf-8") {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    fs.createReadStream(filePath, { encoding })
      .on("data", (chunk) => {
        for (let i = 0; i < chunk.length; ++i) {
          if (chunk[i] === "\n") lineCount++;
        }
      })
      .on("error", reject)
      .on("end", () => {
        // Optionally subtract 1 for header, if desired
        resolve(lineCount);
      });
  });
}

// 3) Main POST route for CSV with performance optimizations
router.post("/:collectionName", upload.single("csvFile"), async (req, res) => {
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

    const delimiter = req.body.delimiter || "comma";
    const encoding = req.body.encoding || "utf-8";
    const delimMap = { comma: ",", semicolon: ";", tab: "\t", space: " " };
    const separator = delimMap[delimiter] || ",";

    // Check if the collection exists (optional) - can remove if not needed
    const meta = await CollectionMetadata.findOne({ collectionName });
    if (!meta) {
      await fs.unlink(uploadedFile.path);
      return res.status(404).json({ message: "Collection metadata not found" });
    }

    // Quick line count for progress tracking
    const totalRows = await countLines(uploadedFile.path, encoding);

    // Initialize progress
    uploadProgress[collectionName] = {
      totalRows,
      processedCount: 0,
      done: false,
      startTime: Date.now(),
    };

    // Respond early to client
    res.status(202).json({
      message: "File upload accepted, processing started",
      statusEndpoint: `/api/upload-csv/progress/${collectionName}`,
    });

    // PERFORMANCE OPTIMIZATIONS:

    // 1. Increase batch size for fewer database operations
    const batchSize = totalRows < 10000 ? 1000 : 5000;

    // 2. Use bulkWrite for better performance
    const collection = mongoose.connection.collection(collectionName);

    // 3. Set up counters
    let totalInserted = 0;
    let totalFailed = 0;
    let processedCount = 0;
    const startTime = Date.now();

    // 4. Process in batches with concurrent operations
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
        } else {
          totalFailed += batch.length;
        }
        return err;
      }
    };

    // 5. Optimized stream processing
    let currentBatch = [];
    let activePromises = [];
    const maxConcurrent = 3; // Adjust based on your server capacity

    // Process the file
    await new Promise((resolve, reject) => {
      fs.createReadStream(uploadedFile.path, {
        encoding,
        highWaterMark: 64 * 1024,
      })
        .pipe(csv({ separator }))
        .on("data", (data) => {
          // Normalize data
          const rowObj = {};
          Object.keys(data).forEach((key) => {
            rowObj[key.trim()] = data[key];
          });

          currentBatch.push(rowObj);
          processedCount++;

          // // Update progress every 1000 rows to reduce overhead
          // if (processedCount % 1000 === 0) {
          //   uploadProgress[collectionName].processedCount = processedCount;
          // }

          if (
            processedCount % 100 === 0 ||
            processedCount === 1 ||
            processedCount === totalRows
          ) {
            uploadProgress[collectionName].processedCount = processedCount;
          }

          // When batch is full
          if (currentBatch.length >= batchSize) {
            const batchToProcess = [...currentBatch];
            currentBatch = [];

            // If we have too many active promises, wait for some to complete
            if (activePromises.length >= maxConcurrent) {
              const oldestPromise = activePromises.shift();
              oldestPromise
                .then(() => {
                  const newPromise = processBatch(batchToProcess);
                  activePromises.push(newPromise);
                })
                .catch(reject);
            } else {
              // Otherwise just process
              const newPromise = processBatch(batchToProcess);
              activePromises.push(newPromise);
            }
          }
        })
        .on("end", async () => {
          try {
            // Process final batch
            if (currentBatch.length > 0) {
              await processBatch(currentBatch);
            }

            // Wait for all pending operations
            await Promise.all(activePromises);

            // Final progress update
            uploadProgress[collectionName].processedCount = processedCount;
            uploadProgress[collectionName].done = true;
            uploadProgress[collectionName].totalInserted = totalInserted;
            uploadProgress[collectionName].totalFailed = totalFailed;

            // Modified code:
            const processingTimeMs = Date.now() - startTime;
            const durationSeconds = processingTimeMs / 1000;

            // Store the processing time in milliseconds
            uploadProgress[collectionName].processingTime = processingTimeMs;

            logger.info(
              `CSV Upload Stats for ${collectionName}:
               totalRows: ${totalRows},
               Inserted: ${totalInserted},
               Failed: ${totalFailed},
               Time: ${durationSeconds}s`
            );

            // Clean up file
            await fs.unlink(uploadedFile.path);
            resolve();
          } catch (finalErr) {
            reject(finalErr);
          }
        })
        .on("error", reject);
    });

    // Response already sent, this is just cleanup
  } catch (err) {
    logger.error("CSV Upload Error:", err);

    if (uploadProgress[collectionName]) {
      uploadProgress[collectionName].error = err.message;
      uploadProgress[collectionName].done = true;
    }

    if (uploadedFile?.path) {
      try {
        await fs.unlink(uploadedFile.path);
      } catch {}
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
      message: "Only CSV files are allowed",
    });
  }
  logger.error("Unhandled upload error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = router;
