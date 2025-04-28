const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const axios = require("axios");
const CollectionMetadata = require("../models/CollectionMetadata");
const { getDynamicModel } = require("../utils/getDynamicModel");
const { body, param, validationResult } = require("express-validator");
const logger = require("../utils/logger");

// Suppose your environment variables
dotenv.config();

const SOLR_BASE_URL = process.env.SOLR_HOST;
const SOLR_AUTH = {
  username: process.env.SOLR_AUTH_USER,
  password: process.env.SOLR_AUTH_PASSWORD,
};

// Type mapping
const typeMapping = {
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Buffer: Buffer,
  Mixed: mongoose.Schema.Types.Mixed,
  ObjectId: mongoose.Schema.Types.ObjectId,
  Decimal128: mongoose.Schema.Types.Decimal128,
  Map: Map,
  Array: Array,
};

// Function to create dynamic schema fields
const createDynamicSchemaFields = (fields) => {
  return fields.reduce((schemaFields, field) => {
    if (!field.fieldName || !field.fieldType) {
      throw new Error(`Invalid field definition: ${JSON.stringify(field)}`);
    }

    const fieldType = typeMapping[field.fieldType];
    if (!fieldType) {
      throw new Error(`Invalid field type: ${field.fieldType}`);
    }

    schemaFields[field.fieldName] = {
      type: fieldType,
      required: field.required || false,
      default: field.default,
      enum: field.enum,
      min: field.min,
      max: field.max,
    };
    return schemaFields;
  }, {});
};

// Validation middlewares
const validateCollectionName = [
  body("collectionName")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Invalid collection name"),
];

const validateCollectionNameParam = [
  param("collectionName")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Invalid collection name"),
];

const validateDisplayName = [
  body("displayName").trim().notEmpty().withMessage("Display name is required"),
];

// -------------------- CREATE A NEW COLLECTION (MongoDB) --------------------

router.post(
  "/create-mongo",
  validateCollectionName,
  validateDisplayName,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName, displayName, fields = [] } = req.body;
      const sanitizedName = collectionName.trim();

      // 1) Check if already exists
      const existing = await CollectionMetadata.findOne({
        collectionName: sanitizedName,
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Collection already exists in Mongo" });
      }

      // 2) Create new metadata
      const metadata = new CollectionMetadata({
        collectionName: sanitizedName,
        displayName,
        fields,
      });
      await metadata.save();

      // 3) Create Mongoose model if fields are provided (predefined)
      if (fields.length > 0) {
        if (mongoose.models[sanitizedName]) {
          return res
            .status(409)
            .json({ message: "Mongoose model already exists" });
        }
        const dynamicSchemaFields = createDynamicSchemaFields(fields);
        const DynamicSchema = new mongoose.Schema(dynamicSchemaFields);
        mongoose.model(sanitizedName, DynamicSchema);
      }

      return res.status(201).json({
        message: "Mongo collection metadata created successfully",
        metadata,
      });
    } catch (error) {
      console.error("Error creating Mongo collection:", error);
      return res.status(500).json({
        message: "Error creating Mongo collection",
        error: error.message,
      });
    }
  }
);

// -------------------- CREATE A NEW COLLECTION (Solr) --------------------

// Creates the Solr index but doesn't touch Mongo
router.post("/create-solr", validateCollectionName, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      collectionName,
      configSetName = "myUnifiedConfig",
      numShards = 1,
      replicationFactor = 1,
    } = req.body;

    const sanitizedName = collectionName.trim();

    // 1) Call the Solr Collections API
    const solrUrl = `${SOLR_BASE_URL}/admin/collections`;
    const createParams = {
      action: "CREATE",
      name: sanitizedName,
      "collection.configName": configSetName,
      numShards,
      replicationFactor,
      wt: "json",
    };

    const solrResp = await axios.get(solrUrl, {
      params: createParams,
      auth: SOLR_AUTH,
    });
    if (solrResp.data?.error) {
      console.error("Solr collection creation error:", solrResp.data.error);
      return res.status(500).json({
        message: "Error creating Solr collection",
        error: solrResp.data.error,
      });
    }

    return res.status(201).json({
      message: "Solr collection created successfully",
      solrResponse: solrResp.data,
    });
  } catch (error) {
    console.error("Error creating Solr collection:", error);
    return res.status(500).json({
      message: "Error creating Solr collection",
      error: error.message,
    });
  }
});

// -------------------- CREATE-DYNAMIC ROUTE (Optional) --------------------
// If you still want an explicit endpoint for fully dynamic
// that doesn't create a Mongoose schema, just do the same approach
// but pass an empty fields array to metadata, etc. Then create the Solr collection.
router.post(
  "/create-dynamic",
  validateCollectionName,
  validateDisplayName,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName, displayName } = req.body;
      const sanitizedCollectionName = collectionName.trim();

      const existingCollection = await CollectionMetadata.findOne({
        collectionName: sanitizedCollectionName,
      });
      if (existingCollection) {
        return res.status(409).json({ message: "Collection already exists" });
      }

      // create metadata with empty fields
      const metadata = new CollectionMetadata({
        collectionName: sanitizedCollectionName,
        displayName,
        fields: [],
      });
      await metadata.save();

      // Create Solr collection
      const solrUrl = `${SOLR_BASE_URL}/admin/collections`;
      const createParams = {
        action: "CREATE",
        name: sanitizedCollectionName,
        numShards: 1,
        replicationFactor: 1,
        wt: "json",
      };

      const solrResp = await axios.get(solrUrl, {
        params: createParams,
        auth: SOLR_AUTH,
      });
      if (solrResp.data?.error) {
        logger.error(
          "Solr dynamic collection creation error:",
          solrResp.data.error
        );
        // optionally rollback from Mongo
        await CollectionMetadata.deleteOne({ _id: metadata._id });
        return res.status(500).json({
          message: "Error creating Solr collection",
          error: solrResp.data.error,
        });
      }

      return res.status(201).json({
        message: "Dynamic collection created in MongoDB + Solr successfully",
        metadata,
        solrResponse: solrResp.data,
      });
    } catch (error) {
      logger.error("Error creating dynamic collection:", error);
      res.status(500).json({
        message: "Error creating dynamic collection",
        error: error.message,
      });
    }
  }
);

// -------------------- GET ALL COLLECTIONS METADATA --------------------
router.get("/", async (req, res) => {
  try {
    const collections = await CollectionMetadata.find(
      {},
      "collectionName displayName fields"
    );
    res.status(200).json({ collections });
  } catch (error) {
    logger.error("Error fetching collections:", error);
    res.status(500).json({ message: "Error fetching collections" });
  }
});

// -------------------- GET METADATA FOR A SPECIFIC COLLECTION --------------------
router.get(
  "/:collectionName",
  validateCollectionNameParam,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName } = req.params;
      const sanitizedCollectionName = collectionName.trim();

      const collectionMetadata = await CollectionMetadata.findOne({
        collectionName: sanitizedCollectionName,
      });

      if (!collectionMetadata) {
        return res.status(404).json({ message: "Collection not found" });
      }

      res.status(200).json(collectionMetadata);
    } catch (error) {
      logger.error("Error fetching collection metadata:", error);
      res.status(500).json({ message: "Error fetching collection metadata" });
    }
  }
);

// -------------------- UPDATE COLLECTION METADATA (PUT /collections/:id) --------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params; // Mongo _id
    const {
      displayName,
      configSetName,
      numShards,
      replicationFactor,
      // add more as needed...
    } = req.body;

    // 1) Find the metadata in Mongo
    const metadata = await CollectionMetadata.findById(id);
    if (!metadata) {
      return res.status(404).json({ message: "Collection not found" });
    }

    // 2) Update only certain fields
    if (typeof displayName === "string") {
      metadata.displayName = displayName;
    }
    // If you want to store configSetName, etc.
    if (typeof configSetName === "string") {
      metadata.configSetName = configSetName;
    }
    if (typeof numShards === "number") {
      metadata.numShards = numShards;
    }
    if (typeof replicationFactor === "number") {
      metadata.replicationFactor = replicationFactor;
    }

    await metadata.save();

    // (Optional) If you want to also update Solr’s collection,
    // you might call the Collections API with "action=MODIFYCOLLECTION".
    // e.g. /admin/collections?action=MODIFYCOLLECTION&collection=...
    // but Solr doesn't allow you to rename the collection.
    // We'll skip that for now.

    res.status(200).json(metadata);
  } catch (error) {
    console.error("Error updating collection:", error);
    res.status(500).json({ message: "Error updating collection" });
  }
});

// -------------------- DELETE COLLECTION (Mongo) --------------------
router.delete("/:id/mongo", async (req, res) => {
  try {
    const { id } = req.params;
    const drop = req.query.drop === "true"; // parse the query param

    const metadata = await CollectionMetadata.findById(id);
    if (!metadata) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const collName = metadata.collectionName;

    // Remove the metadata
    await CollectionMetadata.deleteOne({ _id: id });

    // If drop===true, also drop the actual collection
    if (drop) {
      // check if the actual Mongoose collection exists
      if (mongoose.connection.db.listCollections({ name: collName })) {
        await mongoose.connection.db.dropCollection(collName);
        console.log(`Dropped Mongo collection: ${collName}`);
      }
    }

    res.json({ message: "Mongo storage deleted" });
  } catch (error) {
    console.error("Error deleting Mongo storage:", error);
    res.status(500).json({ message: "Error deleting Mongo storage" });
  }
});

// -------------------- DROP COLLECTION (MongoDB only) --------------------
router.delete(
  "/:collectionName/drop",
  validateCollectionNameParam,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName } = req.params;
      const sanitizedCollectionName = collectionName.trim();

      // Check if the collection metadata exists
      const metadata = await CollectionMetadata.findOne({
        collectionName: sanitizedCollectionName,
      });

      if (!metadata) {
        return res.status(404).json({ message: "Collection not found" });
      }

      // Check if the actual MongoDB collection exists
      const collections = await mongoose.connection.db
        .listCollections({ name: sanitizedCollectionName })
        .toArray();

      if (collections.length === 0) {
        return res
          .status(404)
          .json({ message: "MongoDB collection does not exist" });
      }

      // Drop the collection but keep the metadata
      await mongoose.connection.db.dropCollection(sanitizedCollectionName);

      logger.info(
        `Dropped MongoDB collection '${sanitizedCollectionName}' but kept metadata`
      );

      return res.status(200).json({
        message: `MongoDB collection '${sanitizedCollectionName}' dropped successfully. Metadata preserved.`,
      });
    } catch (error) {
      logger.error(`Error dropping collection: ${error}`);
      return res.status(500).json({
        message: "Error dropping MongoDB collection",
        error: error.message,
      });
    }
  }
);

// -------------------- DELETE COLLECTION (Solr) --------------------
router.delete("/:collectionName", async (req, res) => {
  try {
    const { collectionName } = req.params;

    // 2) Delete from Solr only
    const solrUrl = `${SOLR_BASE_URL}/admin/collections`;
    const deleteParams = {
      action: "DELETE",
      name: collectionName,
      wt: "json",
    };

    const solrResp = await axios.get(solrUrl, {
      params: deleteParams,
      auth: SOLR_AUTH,
    });

    if (solrResp.data?.error) {
      console.error("Solr collection deletion error:", solrResp.data.error);
      return res.status(500).json({
        message: "Error deleting collection in Solr",
        error: solrResp.data.error,
      });
    }
    res.status(200).json({
      message: `Solr collection '${collectionName}' deleted successfully`,
      solrResponse: solrResp.data,
    });
  } catch (error) {
    console.error("Error deleting Solr index:", error);
    res.status(500).json({
      message: "Failed to delete Solr collectionx",
      error: error.message,
    });
  }
});

// -------------------- ADD DATA TO A SPECIFIC COLLECTION --------------------
router.post(
  "/:collectionName/add",
  validateCollectionNameParam,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName } = req.params;
      const sanitizedCollectionName = collectionName.trim();
      const data = req.body;

      const DynamicModel = await getDynamicModel(sanitizedCollectionName);
      if (!DynamicModel) {
        return res.status(404).json({ message: "Collection not found" });
      }

      console.log("DEBUG: DynamicModel = ", DynamicModel);
      console.log("DEBUG: typeof DynamicModel = ", typeof DynamicModel);

      const newDocument = new DynamicModel(data);
      await newDocument.save();

      res.status(201).json({
        message: "Data added successfully",
        data: newDocument,
      });
    } catch (error) {
      logger.error("Error adding data to collection:", error);
      res.status(500).json({ message: "Error adding data to collection" });
    }
  }
);

// -------------------- GET ALL DOCUMENTS FROM A SPECIFIC COLLECTION --------------------
router.get(
  "/:collectionName/documents",
  validateCollectionNameParam,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { collectionName } = req.params;
      const sanitizedCollectionName = collectionName.trim();

      const DynamicModel = await getDynamicModel(sanitizedCollectionName);
      if (!DynamicModel) {
        return res.status(404).json({ message: "Collection not found" });
      }

      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const documents = await DynamicModel.find()
        .skip(parseInt(skip))
        .limit(parseInt(limit));

      res.status(200).json({
        page: parseInt(page),
        limit: parseInt(limit),
        data: documents,
      });
    } catch (error) {
      logger.error("Error fetching documents:", error);
      res.status(500).json({ message: "Error fetching documents" });
    }
  }
);

// -------------------- GET PAGINATED DOCUMENTS FROM MULTIPLE COLLECTIONS --------------------
router.post("/documents", async (req, res) => {
  const { collections, pagination } = req.body;

  try {
    if (!collections || collections.length === 0) {
      return res.status(400).json({ error: "No collections specified." });
    }

    const results = {};
    const totalDocuments = {};

    for (const collName of collections) {
      const DynamicModel = await getDynamicModel(collName);
      if (!DynamicModel) {
        continue; // skip
      }

      const { page = 1, limit = 10 } = pagination?.[collName] || {};
      const skip = (page - 1) * limit;

      const count = await DynamicModel.countDocuments();
      totalDocuments[collName] = count;

      const docs = await DynamicModel.find()
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean();
      const docsWithCollection = docs.map((doc) => ({
        ...doc,
        _collection: collName,
      }));
      results[collName] = docsWithCollection;
    }

    res.status(200).json({
      data: results,
      totalDocuments,
    });
  } catch (error) {
    logger.error("Error fetching documents:", error);
    res.status(500).json({ error: "Error fetching documents." });
  }
});

module.exports = router;