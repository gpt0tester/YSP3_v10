// getDynamicModel.js
const mongoose = require("mongoose");
const CollectionMetadata = require("../models/CollectionMetadata");
const logger = require("./logger");
const { indexDocument } = require("./solrClient");

// Type mapping from string to Mongoose schema types
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
const createDynamicSchemaFields = (fields, collectionName) => {
  return fields.reduce((schemaFields, field) => {
    if (!field.fieldName || !field.fieldType) {
      const errorMessage = `Invalid field definition in collection '${collectionName}': ${JSON.stringify(
        field
      )}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const fieldType = typeMapping[field.fieldType];
    if (!fieldType) {
      const errorMessage = `Invalid field type '${field.fieldType}' in collection '${collectionName}'`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const fieldOptions = {
      type: fieldType,
      required: field.required || false,
      default: field.default,
      enum: field.enum,
      min: field.min,
      max: field.max,
    };

    schemaFields[field.fieldName] = fieldOptions;
    return schemaFields;
  }, {});
};

// Function to get or create a dynamic model for a given collection name
const getDynamicModel = async (collectionName) => {
  if (mongoose.models[collectionName]) {
    logger.info(
      `Model found for collection: '${collectionName}', using existing model.`
    );
    return mongoose.model(collectionName);
  }

  logger.info(
    `Creating a new dynamic model for collection: '${collectionName}'`
  );
  const metadata = await CollectionMetadata.findOne({ collectionName });
  if (!metadata) {
    const errorMessage = `Collection metadata not found for collection: '${collectionName}'`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const dynamicSchemaFields = createDynamicSchemaFields(
    metadata.fields,
    collectionName
  );

  const DynamicSchema = new mongoose.Schema(dynamicSchemaFields);

  // Create text index on all String fields
  const textIndexFields = {};
  metadata.fields.forEach((field) => {
    if (field.fieldType === "String") {
      textIndexFields[field.fieldName] = "text";
    }
  });

  if (Object.keys(textIndexFields).length > 0) {
    logger.info(
      `Creating text index for collection: '${collectionName}' on fields: ${Object.keys(
        textIndexFields
      ).join(", ")}`
    );
    DynamicSchema.index(textIndexFields);
  }

  // Middleware to index the document in Solr after saving
  DynamicSchema.post("save", async function (doc) {
    try {
      await indexDocument({
        id: doc._id.toString(),
        collectionName,
        ...doc.toObject(),
      });
      logger.info(
        `Document indexed in Solr successfully for collection: '${collectionName}', document ID: '${doc._id.toString()}'`
      );
    } catch (error) {
      logger.error(
        `Error indexing document in Solr for collection '${collectionName}', document ID: '${doc._id.toString()}':`,
        error
      );
    }
  });

  // Middleware to update the document in Solr after updating
  DynamicSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) {
      try {
        await indexDocument({
          id: doc._id.toString(),
          collectionName,
          ...doc.toObject(),
        });
        logger.info(
          `Document updated in Solr successfully for collection: '${collectionName}', document ID: '${doc._id.toString()}'`
        );
      } catch (error) {
        logger.error(
          `Error updating document in Solr for collection '${collectionName}', document ID: '${doc._id.toString()}':`,
          error
        );
      }
    }
  });

  const DynamicModel = mongoose.model(collectionName, DynamicSchema);

  // Ensure indexes are created in the database
  await DynamicModel.syncIndexes();
  logger.info(`Indexes synced for collection: '${collectionName}'`);

  return DynamicModel;
};

// Function to register all dynamic models on startup
const registerAllModels = async () => {
  try {
    logger.info("Starting model registration for all collections.");
    const collections = await CollectionMetadata.find();
    for (const { collectionName, fields } of collections) {
      if (!mongoose.models[collectionName]) {
        logger.info(`Registering model for collection: '${collectionName}'`);
        const dynamicSchemaFields = createDynamicSchemaFields(
          fields,
          collectionName
        );
        const DynamicSchema = new mongoose.Schema(dynamicSchemaFields);

        // Create text index on all String fields
        const textIndexFields = {};
        fields.forEach((field) => {
          if (field.fieldType === "String") {
            textIndexFields[field.fieldName] = "text";
          }
        });

        if (Object.keys(textIndexFields).length > 0) {
          logger.info(
            `Creating text index for collection: '${collectionName}' on fields: ${Object.keys(
              textIndexFields
            ).join(", ")}`
          );
          DynamicSchema.index(textIndexFields);
        }

        const DynamicModel = mongoose.model(collectionName, DynamicSchema);

        // Ensure indexes are created in the database
        await DynamicModel.syncIndexes();
        logger.info(`Indexes synced for collection: '${collectionName}'`);
      }
    }
    logger.info("All dynamic models registered successfully.");
  } catch (error) {
    logger.error("Error registering dynamic models:", error);
    throw error;
  }
};

module.exports = { getDynamicModel, registerAllModels };
