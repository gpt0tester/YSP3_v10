/**
 * POST /collections/:collectionName/indexes
 * Body (JSON):
 * {
 *   "fields": [
 *     { "name": "email", "order": 1 },
 *     { "name": "createdAt", "order": -1 }
 *   ],
 *   "unique": true,
 *   "background": true,
 *   "sparse": false,
 *   "expireAfterSeconds": 3600,
 *   "name": "myCompoundIndex"
 * }
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.post("/:collectionName/indexes", async (req, res) => {
  try {
    const { collectionName } = req.params;
    const {
      fields, // an array of { name, order } objects
      unique = false,
      background = true,
      sparse = false,
      partialFilter,
      expireAfterSeconds,
      name, // optional index name
    } = req.body;

    // Validate fields
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        message: "fields array is required for compound index creation.",
      });
    }

    // Build compound index spec
    // e.g., fields = [{ name: 'email', order: 1 }, { name: 'createdAt', order: -1 }]
    // => indexSpec = { email: 1, createdAt: -1 }
    const indexSpec = {};
    for (const field of fields) {
      if (!field.name) {
        return res.status(400).json({
          message: "Each field object must have a 'name'.",
        });
      }
      // default order to 1 if not provided
      indexSpec[field.name] = field.order === -1 ? -1 : 1;
    }

    // Options
    const indexOptions = {
      unique,
      background,
      sparse,
    };

    if (partialFilter && typeof partialFilter === "object") {
      indexOptions.partialFilterExpression = partialFilter;
    }
    if (expireAfterSeconds && !isNaN(expireAfterSeconds)) {
      indexOptions.expireAfterSeconds = Number(expireAfterSeconds);
    }
    if (name && typeof name === "string") {
      indexOptions.name = name;
    }

    // Create the index
    const collection = mongoose.connection.collection(collectionName);
    const result = await collection.createIndex(indexSpec, indexOptions);

    return res.status(200).json({
      message: `Compound index created on '${collectionName}'.`,
      indexName: result,
      spec: indexSpec,
      options: indexOptions,
    });
  } catch (err) {
    console.error("Error creating compound index:", err);
    return res.status(500).json({
      message: "Failed to create compound index",
      error: err.message,
    });
  }
});

module.exports = router;
