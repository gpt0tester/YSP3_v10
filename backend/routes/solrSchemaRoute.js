const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const CollectionMetadata = require("../models/CollectionMetadata");

dotenv.config();

// Solr info from env
const SOLR_BASE_URL = process.env.SOLR_HOST; // e.g. "http://localhost:8983/solr"
const SOLR_AUTH = {
  username: process.env.SOLR_AUTH_USER,
  password: process.env.SOLR_AUTH_PASSWORD,
};

const upload = multer({ dest: "uploads/" }); // store ZIP temporarily

// const SOLR_COLLECTION = process.env.SOLR_COLLECTION || "CRM"; // e.g. "my_collection"

// // Create an Axios instance for the Schema API
// const solrSchemaApi = axios.create({
//   baseURL: `${SOLR_BASE_URL}/${collectionName}/schema`,
//   headers: { "Content-Type": "application/json" },
// });

// -----------------------configsets----------------------------------

// 1) LIST configsets
router.get("/configset/list", async (req, res) => {
  try {
    // e.g. GET /solr/admin/configs?action=LIST&wt=json
    const url = `${SOLR_BASE_URL}/admin/configs`;
    const response = await axios.get(url, {
      params: { action: "LIST", wt: "json" },
      auth: SOLR_AUTH,
    });
    if (response.data?.configSets) {
      return res.json({ configSets: response.data.configSets });
    }
    return res.status(500).json({
      message: "Failed to list configsets",
      solrResponse: response.data,
    });
  } catch (error) {
    console.error("Error listing configsets:", error);
    return res
      .status(500)
      .json({ message: "Error listing configsets", error: error.message });
  }
});

// 2) CREATE configset: EITHER by copying from base or uploading ZIP
router.post(
  "/configset/create",
  upload.single("configZip"),
  async (req, res) => {
    const { name, baseConfigSet } = req.body;
    // Parse any configSetProp.* => property.*
    const propertyParams = {};
    Object.keys(req.body).forEach((key) => {
      if (key.startsWith("configSetProp.")) {
        const propName = key.replace("configSetProp.", "property.");
        propertyParams[propName] = req.body[key];
      }
    });

    if (!name) {
      return res.status(400).json({ message: "Parameter 'name' is required" });
    }

    try {
      if (req.file) {
        // We are in UPLOAD mode (ZIP present)
        const zipPath = path.join(__dirname, "..", req.file.path);
        const zipBuffer = fs.readFileSync(zipPath);

        // POST /solr/admin/configs?action=UPLOAD&name=<name>
        const url = `${SOLR_BASE_URL}/admin/configs?action=UPLOAD&name=${name}&wt=json`;

        const uploadResp = await axios.post(
          url,
          zipBuffer,
          {
            headers: { "Content-Type": "application/octet-stream" },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          },
          {
            auth: SOLR_AUTH,
          }
        );

        fs.unlinkSync(zipPath); // cleanup temp file

        return res.status(201).json({
          message: `Configset '${name}' uploaded successfully`,
          solrResponse: uploadResp.data,
        });
      }

      // Otherwise, we are in CREATE-from-base mode
      const base = baseConfigSet || "_default";
      // e.g. POST /solr/admin/configs?action=CREATE&name=<name>&baseConfigSet=<base>
      // plus any propertyParams => property.xxx=yyy
      const params = {
        action: "CREATE",
        name,
        baseConfigSet: base,
        wt: "json",
        ...propertyParams, // property.xyz=val
      };

      const createResp = await axios.post(
        `${SOLR_BASE_URL}/admin/configs`,
        null,
        {
          params,
          auth: SOLR_AUTH,
        }
      );
      return res.status(201).json({
        message: `Configset '${name}' created from base '${base}' successfully`,
        solrResponse: createResp.data,
      });
    } catch (error) {
      console.error(
        "Error creating configset:",
        error?.response?.data || error.message
      );
      return res.status(500).json({
        message: "Error creating configset",
        error: error?.response?.data || error.message,
      });
    }
  }
);

// 3) DELETE configset
router.delete("/configset/delete/:configSetName", async (req, res) => {
  const { configSetName } = req.params;
  try {
    // POST /solr/admin/configs?action=DELETE&name=configSetName
    const url = `${SOLR_BASE_URL}/admin/configs`;
    const response = await axios.post(url, null, {
      params: {
        action: "DELETE",
        name: configSetName,
        wt: "json",
      },
      auth: SOLR_AUTH,
    });
    return res.status(200).json({
      message: `Configset '${configSetName}' deleted successfully`,
      solrResponse: response.data,
    });
  } catch (error) {
    console.error("Error deleting configset:", error);
    return res
      .status(500)
      .json({ message: "Error deleting configset", error: error.message });
  }
});

// -------------------- Collections Schema --------------------
// -------------------- Helper Functions --------------------

/**
 * Helper to create a Solr schema API client for a given collection name
 */
function createSolrSchemaApi(collectionName) {
  return axios.create({
    baseURL: `${SOLR_BASE_URL}/${collectionName}/schema`,
    headers: { "Content-Type": "application/json" },
    auth: SOLR_AUTH,
  });
}

/**
 * Utility to handle errors uniformly
 */
function handleSolrError(error, res, customMessage) {
  console.error(customMessage, error.response?.data || error.message);
  return res.status(500).json({
    message: customMessage,
    error: error.response?.data || error.message,
  });
}

router.get("/collections", async (req, res) => {
  try {
    // 1) Get the actual Solr collections
    const solrResponse = await axios.get(`${SOLR_BASE_URL}/admin/collections`, {
      params: { action: "LIST", wt: "json" },
      auth: SOLR_AUTH,
    });

    const solrCollections = solrResponse.data.collections || []; // array of strings, e.g. ["CRM","investigations"]
    // 2) Fetch Mongo metadata for all collections
    const mongoMetadata = await CollectionMetadata.find(
      {},
      "collectionName displayName"
    );

    // 3) Build an array of objects with { collectionName, displayName } if found in Mongo
    const merged = solrCollections.map((solrName) => {
      // find metadata if it exists
      const meta = mongoMetadata.find((m) => m.collectionName === solrName);
      // fallback if not found
      const displayName = meta?.displayName || solrName;
      return {
        collectionName: solrName,
        displayName,
      };
    });

    res.json({ collections: merged });
  } catch (error) {
    console.error("Error listing Solr collections:", error);
    res.status(500).json({
      message: "Error listing Solr collections",
      error: error.message,
    });
  }
});

// -------------------- Fields --------------------

/**
 * CREATE field
 *  POST /api/solr-schema/fields
 *  Body example:
 *    { "name": "title", "type": "text_general", "stored": true, "indexed": true }
 */
router.post("/:collectionName/fields", async (req, res) => {
  const { collectionName } = req.params; // e.g. "myCollection" from URL
  const fieldDef = req.body; // single field definition
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fields", {
      "add-field": [fieldDef],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to create field");
  }
});

/**
 * LIST all fields
 *  GET /api/solr-schema/fields
 */
router.get("/:collectionName/fields", async (req, res) => {
  const { collectionName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get("/fields");
    // returns { fields: [...] }
    res.json(response.data.fields);
  } catch (error) {
    return handleSolrError(error, res, "Failed to list fields");
  }
});

/**
 * READ single field by name
 *  GET /api/solr-schema/fields/:fieldName
 */
router.get("/:collectionName/fields/:fieldName", async (req, res) => {
  const { collectionName, fieldName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get(`/fields/${fieldName}`);
    // returns { field: {...} }
    res.json(response.data.field);
  } catch (error) {
    return handleSolrError(error, res, "Failed to get field");
  }
});

/**
 * UPDATE (replace) an existing field
 *  PUT /api/solr-schema/fields
 *  Body example:
 *    { "name": "title", "type": "text_general", "stored": false, ... }
 */
router.put("/:collectionName/fields", async (req, res) => {
  const { collectionName } = req.params;
  const fieldDef = req.body; // new field definition
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fields", {
      "replace-field": [fieldDef],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to update field");
  }
});

/**
 * DELETE field
 *  DELETE /api/solr-schema/fields/:fieldName
 */
router.delete("/:collectionName/fields/:fieldName", async (req, res) => {
  const { collectionName, fieldName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fields", {
      "delete-field": { name: fieldName },
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to delete field");
  }
});

// -------------------- FieldTypes --------------------

/**
 * CREATE fieldType
 *  POST /api/solr-schema/fieldTypes
 *  Body example:
 *    { "name": "myTextField", "class": "solr.TextField", ... }
 */
router.post("/:collectionName/fieldTypes", async (req, res) => {
  const { collectionName } = req.params;
  const fieldTypeDef = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fieldtypes", fieldTypeDef);
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to create fieldType");
  }
});

/**
 * LIST fieldTypes
 *  GET /api/solr-schema/fieldTypes
 */
router.get("/:collectionName/fieldTypes", async (req, res) => {
  const { collectionName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get("/fieldtypes");
    res.json(response.data.fieldTypes); // array of fieldTypes
  } catch (error) {
    return handleSolrError(error, res, "Failed to list fieldTypes");
  }
});

/**
 * READ single fieldType by name
 *  GET /api/solr-schema/fieldTypes/:typeName
 */
router.get("/:collectionName/fieldTypes/:typeName", async (req, res) => {
  const { collectionName, typeName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get(`/fieldtypes/${typeName}`);
    // returns { fieldType: {...} }
    res.json(response.data.fieldType);
  } catch (error) {
    return handleSolrError(error, res, "Failed to get fieldType");
  }
});

/**
 * UPDATE (replace) a fieldType
 *  PUT /api/solr-schema/fieldTypes
 *  Body example:
 *   { "name": "myTextField", "class": "solr.TextField", "analyzer": {...} }
 */
router.put("/:collectionName/fieldTypes", async (req, res) => {
  const { collectionName } = req.params;
  const fieldTypeDef = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fieldtypes", {
      "replace-field-type": [fieldTypeDef],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to update fieldType");
  }
});

/**
 * DELETE fieldType
 *  DELETE /api/solr-schema/fieldTypes/:typeName
 */
router.delete("/:collectionName/fieldTypes/:typeName", async (req, res) => {
  const { collectionName, typeName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/fieldtypes", {
      "delete-field-type": { name: typeName },
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to delete fieldType");
  }
});

// -------------------- DynamicFields --------------------

/**
 * CREATE dynamicField
 *  POST /api/solr-schema/dynamicFields
 */
router.post("/:collectionName/dynamicFields", async (req, res) => {
  const { collectionName } = req.params;
  const dynFieldDef = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/dynamicfields", {
      "add-dynamic-field": [dynFieldDef],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to create dynamicField");
  }
});

/**
 * LIST dynamicFields
 *  GET /api/solr-schema/dynamicFields
 */
router.get("/:collectionName/dynamicFields", async (req, res) => {
  const { collectionName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get("/dynamicfields");
    res.json(response.data.dynamicFields);
  } catch (error) {
    return handleSolrError(error, res, "Failed to list dynamicFields");
  }
});

/**
 * READ single dynamicField by name
 *  GET /api/solr-schema/dynamicFields/:dynName
 */
router.get("/:collectionName/dynamicFields/:dynName", async (req, res) => {
  const { collectionName, dynName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get(`/dynamicfields/${dynName}`);
    // returns { dynamicField: {...} }
    res.json(response.data.dynamicField);
  } catch (error) {
    return handleSolrError(error, res, "Failed to get dynamicField");
  }
});

/**
 * UPDATE dynamicField
 *  PUT /api/solr-schema/dynamicFields
 */
router.put("/:collectionName/dynamicFields", async (req, res) => {
  const { collectionName } = req.params;
  const dynFieldDef = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/dynamicfields", {
      "replace-dynamic-field": [{ name: dynName }],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to update dynamicField");
  }
});

/**
 * DELETE dynamicField
 *  DELETE /api/solr-schema/dynamicFields/:dynName
 */
router.delete("/:collectionName/dynamicFields/:dynName", async (req, res) => {
  const { collectionName, dynName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/dynamicfields", {
      "delete-dynamic-field": [{ name: dynName }],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to delete dynamicField");
  }
});

// -------------------- CopyFields --------------------

/**
 * CREATE copyField
 *  POST /api/solr-schema/copyFields
 *  Body example:
 *   { "source": "title", "dest": "title_copy", "maxChars": 300 }
 */
router.post("/:collectionName/copyFields", async (req, res) => {
  const { collectionName } = req.params;
  const copyFieldDef = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.post("/copyfields", {
      "add-copy-field": [copyFieldDef],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to create copyField");
  }
});

/**
 * LIST copyFields
 *  GET /api/solr-schema/copyFields
 */
router.get("/:collectionName/copyFields", async (req, res) => {
  const { collectionName } = req.params;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    const response = await solrSchemaApi.get("/copyfields");
    // returns { copyFields: [...] }
    res.json(response.data.copyFields);
  } catch (error) {
    return handleSolrError(error, res, "Failed to list copyFields");
  }
});

/**
 * There's no direct read-by-name for copyFields; it's typically by source/dest
 * So read is covered by the list plus local filter
 */

/**
 * UPDATE copyField
 *  This isn't a direct concept in the Solr Schema API. Typically you'd 'delete' first then 'add'.
 *  We'll emulate "replace" by removing the old definition, then adding the new one.
 */
router.put("/:collectionName/copyFields", async (req, res) => {
  const { collectionName } = req.params;
  const { oldSource, oldDest, newDef } = req.body;
  try {
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    // 1) Delete old source/dest
    if (oldSource && oldDest) {
      await solrSchemaApi.post("/copyfields", {
        "delete-copy-field": [{ source: oldSource, dest: oldDest }],
      });
    }
    // 2) Add new
    if (newDef) {
      await solrSchemaApi.post("/copyfields", {
        add: [newDef],
      });
    }
    res.json({ message: "copyField updated" });
  } catch (error) {
    return handleSolrError(error, res, "Failed to update copyField");
  }
});

/**
 * DELETE copyField
 *  Body: { "source": "title", "dest": "title_copy" }
 */
router.delete("/:collectionName/copyFields", async (req, res) => {
  const { collectionName } = req.params;
  const { source, dest } = req.body;
  try {
    // expected in query or body?
    const solrSchemaApi = createSolrSchemaApi(collectionName);
    if (!source || !dest) {
      return res
        .status(400)
        .json({ message: "source and dest required for deleting copyField" });
    }
    const response = await solrSchemaApi.post("/copyfields", {
      "delete-copy-field": [{ source, dest }],
    });
    res.json(response.data);
  } catch (error) {
    return handleSolrError(error, res, "Failed to delete copyField");
  }
});

module.exports = router;
