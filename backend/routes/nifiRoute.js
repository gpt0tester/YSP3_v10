const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../utils/logger");
const dotenv = require("dotenv");

dotenv.config();

// NiFi base URL from env
const NIFI_BASE_URL = process.env.NIFI_BASE_URL;

// Create an axios instance for NiFi
const axiosInstance = axios.create({
  baseURL: NIFI_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Recursively retrieve all process groups under a given PG ID, plus each PG's processors
 */
async function getAllProcessGroupsWithProcessors(pgId) {
  const url = `/flow/process-groups/${pgId}`;
  const resp = await axiosInstance.get(url);

  const pgFlow = resp.data.processGroupFlow;
  if (!pgFlow) return [];

  const thisPG = pgFlow.breadcrumb.breadcrumb; // { id, name }
  const childGroups = pgFlow.flow.processGroups || [];
  const processors = pgFlow.flow.processors || [];

  const currentGroupObj = {
    id: thisPG.id,
    name: thisPG.name,
    processors: processors.map((p) => ({
      id: p.component.id,
      name: p.component.name,
      state: p.component.state,
      type: p.component.type,
    })),
    childGroups: [],
  };

  // Recurse child groups
  for (const child of childGroups) {
    const childId = child.component.id;
    const childArray = await getAllProcessGroupsWithProcessors(childId);
    currentGroupObj.childGroups.push(...childArray);
  }

  return [currentGroupObj];
}

/**
 * GET /api/nifi/pg/hierarchy
 */
router.get("/pg/hierarchy", async (req, res) => {
  try {
    const allGroups = await getAllProcessGroupsWithProcessors("root");
    return res.json(allGroups);
  } catch (error) {
    logger.error("Error retrieving NiFi PG hierarchy:", error.message);
    return res.status(500).json({ message: "Failed to retrieve PG hierarchy" });
  }
});

/**
 * POST /api/nifi/pg/operate
 * Body example: { pgIds: [], processorIds: [], action: "START" or "STOP" }
 */
router.post("/pg/operate", async (req, res) => {
  try {
    const { pgIds = [], processorIds = [], action } = req.body;
    if (!["RUNNING", "STOPPED", "RUN_ONCE"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action, must be RUNNING or STOPPED or RUN_ONCE",
      });
    }

    // For each PG ID, set state
    for (const pgId of pgIds) {
      const url = `/flow/process-groups/${pgId}`;
      const body = { id: pgId, state: action };
      await axiosInstance.put(url, body);
      logger.info(`Set PG ${pgId} to state=${action}`);
    }

    // For each Processor ID, do a PUT with the desired run state
    for (const procId of processorIds) {
      const getProcResp = await axiosInstance.get(`/processors/${procId}`);
      const revision = getProcResp.data.revision;
      const body = {
        revision,
        component: {
          id: procId,
          state: action,
        },
      };
      await axiosInstance.put(`/processors/${procId}`, body);
      logger.info(`Set Processor ${procId} to state=${action}`);
    }

    return res.status(200).json({
      message: `Successfully set PGs [${pgIds.join(
        ", "
      )}] and processors [${processorIds.join(", ")}] to ${action}`,
    });
  } catch (error) {
    logger.error("Error operating on NiFi PG or Processor:", error.message);
    return res.status(500).json({ message: "Error operating on NiFi" });
  }
});

/**
 * GET /api/nifi/pg/:processorId/logs
 */
router.get("/pg/:processorId/logs", async (req, res) => {
  const { processorId } = req.params;
  const { limit = 10, page = 1 } = req.query;

  try {
    const url = `/processors/${processorId}`;
    const params = { processorId, maxResults: limit, page: page - 1 };

    const response = await axiosInstance.get(url, { params });
    const { status, component } = response.data;
    const logs = {
      id: component.id,
      name: component.name,
      type: component.type,
      state: component.state,
      runStatus: status.runStatus,
      bytesRead: status.aggregateSnapshot.bytesRead,
      bytesWritten: status.aggregateSnapshot.bytesWritten,
      flowFilesIn: status.aggregateSnapshot.flowFilesIn,
      flowFilesOut: status.aggregateSnapshot.flowFilesOut,
      flowFilesQueued: status.aggregateSnapshot.flowFilesQueued,
    };

    return res.status(200).json({ logs });
  } catch (error) {
    logger.error(
      `Error retrieving logs for processor ${processorId}:`,
      error.message
    );
    return res.status(500).json({
      message: `Failed to retrieve logs for processor ${processorId}`,
    });
  }
});

/* -----------------------------------------------------------------------
   Additional Endpoints to Automate Creation of MongoDBControllerService,
   GetMongo, PutSolrContentStream, and Connect them
   Usage Example:
      POST /api/nifi/flows/auto
      Body: { collectionName: "investigations", solrZk: "zookeeper:2181", ... }
 ------------------------------------------------------------------------*/

// Retrieve environment variables
const username = process.env.MONGO_INITDB_ROOT_USERNAME;
const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
const host = process.env.MONGO_HOST;
// const ports = process.env.MONGO_PORTS.split(","); // Convert string to array
// const replicaSetName = process.env.REPLICA_SET_NAME;
// const authSource = process.env.AUTH_SOURCE;
// const readPreference = process.env.READ_PREFERENCE;
const database = process.env.MONGO_INITDB_DATABASE;
// Optional TLS/SSL variables
// const useTLS = process.env.MONGO_TLS === "true";
// const tlsCAFile = process.env.MONGO_TLS_CA_FILE;
// const tlsCertFile = process.env.MONGO_TLS_CERT_FILE;
// const tlsKeyFile = process.env.MONGO_TLS_KEY_FILE;

const solruser = process.env.SOLR_AUTH_USER;
const solrpassword = process.env.SOLR_AUTH_PASSWORD;

// Construct the MongoDB URI
let mongoURI = `mongodb://${host}`;

// ** JOLT Specification to Transform MongoDB Document **
const JOLT_SPECIFICATION = JSON.stringify([
  {
    operation: "shift",
    spec: {
      "*": {
        _id: {
          "\\$oid": "[&2].id",
        },
        lastUpdate: {
          "\\$date": "[&2].lastUpdate",
        },
        "*": "[&1].&",
      },
    },
  },
]);

// Helper: get Root PG ID or any PG ID
async function getRootProcessGroupId() {
  const resp = await axiosInstance.get("/flow/process-groups/root");
  const rootId = resp.data?.processGroupFlow?.id;
  return rootId;
}

// Helper: create a Controller Service
async function createMongoDbControllerService(pgId, name, config = {}) {
  // config = { connectionString, dbName, user, password }
  const body = {
    revision: {
      version: 0,
    },
    disconnectedNodeAcknowledged: true,
    parentGroupId: pgId,
    component: {
      parentGroupId: pgId,
      position: {
        x: 400,
        y: 400,
      },
      name,
      type: "org.apache.nifi.mongodb.MongoDBControllerService",
      bundle: {
        group: "org.apache.nifi",
        artifact: "nifi-mongodb-services-nar",
        version: "1.28.1",
      },
      state: "ENABLED",
      properties: {
        "mongo-uri": config.connectionString,
        "Database User": config.user,
        Password: config.password,
        "ssl-client-auth": "REQUIRED",
      },
    },
    status: {
      runStatus: "ENABLED",
      validationStatus: "VALID",
    },
  };

  const resp = await axiosInstance.post(
    `/process-groups/${pgId}/controller-services`,
    body
  );
  return resp.data;
}

// Enable the controller service
async function enableControllerService(csId) {
  // NiFi 1.21+:
  const body = {
    revision: {
      version: 1,
    },
    state: "ENABLED",
  };
  const resp = await axiosInstance.put(
    `/controller-services/${csId}/run-status`,
    body
  );
  return resp.data;
}

// Create GetMongo
async function createGetMongo(
  pgId,
  name,
  controllerServiceId,
  collectionName,
  dbName
) {
  const body = {
    revision: {
      version: 0,
    },
    component: {
      parentGroupId: pgId,
      position: {
        x: 400,
        y: 500,
      },
      name,
      type: "org.apache.nifi.processors.mongodb.GetMongo",
      bundle: {
        group: "org.apache.nifi",
        artifact: "nifi-mongodb-nar",
        version: "1.28.1",
      },
      relationships: [
        {
          name: "failure",
          autoTerminate: true,
          retry: true,
        },
        {
          name: "original",
          autoTerminate: true,
          retry: true,
        },
        {
          name: "success",
          autoTerminate: true,
          retry: true,
        },
      ],
      config: {
        properties: {
          "mongo-client-service": controllerServiceId,
          "Mongo Database Name": dbName,
          "Mongo Collection Name": collectionName,
          "Batch Size": "1000",
          "results-per-flowfile": "1000",
        },
        bulletinLevel: "WARN",
        autoTerminatedRelationships: ["failure", "original", "success"],
        retryCount: 3,
        retriedRelationships: ["failure"],
      },
    },
  };
  const resp = await axiosInstance.post(
    `/process-groups/${pgId}/processors`,
    body
  );
  return resp.data;
}
// Create JoltTransformJSON
async function createJoltTransformJSON(pgId, name, jolt_spec) {
  const body = {
    revision: {
      version: 0,
    },
    component: {
      parentGroupId: pgId,
      position: {
        x: 400,
        y: 500,
      },
      name,
      type: "org.apache.nifi.processors.standard.JoltTransformJSON",
      bundle: {
        group: "org.apache.nifi",
        artifact: "nifi-standard-nar",
        version: "1.28.1",
      },
      relationships: [
        {
          name: "failure",
          autoTerminate: true,
          retry: true,
        },
        {
          name: "success",
          autoTerminate: true,
          retry: true,
        },
      ],
      config: {
        properties: {
          "jolt-transform": "jolt-transform-chain",
          "jolt-spec": jolt_spec,
          "Transform Cache Size": "1",
        },
        bulletinLevel: "WARN",
        autoTerminatedRelationships: ["failure", "success"],
        retryCount: 3,
        retriedRelationships: ["failure"],
      },
    },
  };
  const resp = await axiosInstance.post(
    `/process-groups/${pgId}/processors`,
    body
  );
  return resp.data;
}

// Create PutSolrContentStream
async function createPutSolrContentStream(
  pgId,
  name,
  solrType,
  solrLocation,
  solrCollection,
  username,
  password
) {
  const body = {
    revision: {
      version: 0,
    },
    component: {
      parentGroupId: pgId,
      position: {
        x: 500,
        y: 500,
      },
      name,
      type: "org.apache.nifi.processors.solr.PutSolrContentStream",
      bundle: {
        group: "org.apache.nifi",
        artifact: "nifi-solr-nar",
        version: "1.28.1",
      },
      relationships: [
        {
          name: "failure",
          autoTerminate: true,
          retry: true,
        },
        {
          name: "original",
          autoTerminate: true,
          retry: true,
        },
        {
          name: "success",
          autoTerminate: true,
          retry: true,
        },
      ],
      config: {
        properties: {
          "Solr Type": solrType,
          "Solr Location": solrLocation,
          Collection: solrCollection,
          Username: username,
          Password: password,
        },
        bulletinLevel: "WARN",
        autoTerminatedRelationships: [
          "connection_failure",
          "failure",
          "success",
        ],
        retryCount: 3,
        retriedRelationships: ["failure", "connection_failure"],
      },
    },
  };
  const resp = await axiosInstance.post(
    `/process-groups/${pgId}/processors`,
    body
  );
  return resp.data;
}

// Create a connection
async function createConnection(pgId, sourceProcessor, destProcessor) {
  const body = {
    revision: {
      version: 0,
    },
    disconnectedNodeAcknowledged: true,
    component: {
      parentGroupId: pgId,
      position: {
        x: 500,
        y: 500,
      },
      source: {
        id: sourceProcessor.component.id,
        type: "PROCESSOR",
        groupId: pgId,
        name: sourceProcessor.component.name,
        running: true,
        transmitting: true,
        exists: true,
      },
      destination: {
        id: destProcessor.component.id,
        type: "PROCESSOR",
        groupId: pgId,
        name: destProcessor.component.name,
        running: true,
        transmitting: true,
        exists: true,
      },
      name: `${sourceProcessor.component.name}_to_${destProcessor.component.name}`,
      selectedRelationships: ["success"],
    },
    sourceId: sourceProcessor.component.id,
    sourceGroupId: pgId,
    sourceType: "PROCESSOR",
    destinationId: destProcessor.component.id,
    destinationGroupId: pgId,
    destinationType: "PROCESSOR",
  };
  const resp = await axiosInstance.post(
    `/process-groups/${pgId}/connections`,
    body
  );
  return resp.data;
}

// Start a processor
async function startProcessor(processorId, revision) {
  const body = {
    revision,
    component: {
      id: processorId,
      state: "RUNNING",
    },
  };
  const resp = await axiosInstance.put(`/processors/${processorId}`, body);
  return resp.data;
}

/**
 * POST /api/nifi/flows/auto
 * Example body:
 * {
 *   "collectionName": "investigations",
 *   "dbName": "mydatabase",
 *   "mongoUri": "mongodb://localhost:27017",
 *   "solrZk": "zookeeper:2181",
 *   "startProcessors": true
 * }
 */

// In your 'flows/auto' endpoint, or wherever you create NiFi flows
router.post("/flows/auto", async (req, res) => {
  const {
    collectionName,
    dbName = process.env.MONGO_INITDB_DATABASE, // default from env
    dbUser = process.env.MONGO_INITDB_ROOT_USERNAME,
    dbPassword = process.env.MONGO_INITDB_ROOT_PASSWORD,
    mongoUri = mongoURI, // or your multi-host URI
    solrZk = process.env.ZOOKEEPER_CONNECTION_STRING,
    jolt_spec = JOLT_SPECIFICATION,
    targetPgId,
    startProcessors = false,
  } = req.body;

  if (!collectionName) {
    return res.status(400).json({ message: "collectionName is required" });
  }

  try {
    logger.info("Starting NiFi auto-flow creation for:", collectionName);

    // Helper: Create a new Process Group
    async function createProcessGroup(
      parentPgId,
      name,
      position = { x: 400, y: 400 }
    ) {
      const body = {
        revision: {
          version: 0,
        },
        component: {
          name,
          position,
          parentGroupId: parentPgId,
        },
      };

      const resp = await axiosInstance.post(
        `/process-groups/${parentPgId}/process-groups`,
        body
      );
      return resp.data;
    }

    // 1) find root PG
    const rootPgId = targetPgId || (await getRootProcessGroupId());
    logger.info("Root PG ID:", rootPgId);

    // 2) Create a new process group for this collection
    logger.info(`Creating new process group for ${collectionName}...`);
    const newPg = await createProcessGroup(rootPgId, `PG_${collectionName}`, {
      x: 300,
      y: 300,
    });
    const newPgId = newPg.id;
    logger.info(
      `Created new process group: ${newPg.component.name} with ID: ${newPgId}`
    );

    // 3) create MongoDBControllerService
    logger.info("Creating MongoDBControllerService...");
    const mongoCS = await createMongoDbControllerService(
      rootPgId,
      `MongoCS_${collectionName}`,
      {
        connectionString: mongoUri,
        dbName,
        user: dbUser,
        password: dbPassword,
      }
    );
    logger.info("Created MongoDBControllerService:", mongoCS.component.id);

    // 4) enable the CS
    logger.info("Enabling MongoCS...");
    const enabledCS = await enableControllerService(
      mongoCS.id,
      mongoCS.revision
    );
    logger.info("Enabled CS state:", enabledCS.component?.state);

    // 5) create GetMongo referencing the CS
    logger.info("Creating GetMongo...");
    const getMongo = await createGetMongo(
      newPgId,
      `GetMongo_${collectionName}`,
      mongoCS.id, // <-- pass the CS ID
      collectionName,
      dbName
    );
    logger.info("Created GetMongo:", getMongo.component.id);

    // 6) create JoltTransformJSON
    logger.info("Creating JoltTransformJSON...");
    const joltTransform = await createJoltTransformJSON(
      newPgId,
      `JoltTransformJSON_${collectionName}`,
      jolt_spec
    );
    logger.info("Created JoltTransformJSON:", joltTransform.component.id);

    // 7) create PutSolrContentStream
    logger.info("Creating PutSolrContentStream...");
    const putSolr = await createPutSolrContentStream(
      newPgId,
      `PutSolr_${collectionName}`,
      "Cloud",
      solrZk,
      collectionName,
      solruser,
      solrpassword
    );
    logger.info("Created PutSolrContentStream:", putSolr.component.id);

    // New helper function with retry and more robust connection creation
    async function createConnectionWithRetry(
      pgId,
      sourceProcessor,
      destProcessor,
      relationship = "success",
      maxRetries = 3
    ) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const body = {
            revision: {
              version: 0,
            },
            disconnectedNodeAcknowledged: true,
            component: {
              parentGroupId: pgId,
              source: {
                id: sourceProcessor.component.id,
                type: "PROCESSOR",
                groupId: pgId,
                name: sourceProcessor.component.name,
                running: true,
                transmitting: true,
                exists: true,
              },
              destination: {
                id: destProcessor.component.id,
                type: "PROCESSOR",
                groupId: pgId,
                name: destProcessor.component.name,
                running: true,
                transmitting: true,
                exists: true,
              },
              name: `${sourceProcessor.component.name}_to_${destProcessor.component.name}`,
              selectedRelationships: [relationship],
            },
            sourceId: sourceProcessor.component.id,
            sourceGroupId: pgId,
            sourceType: "PROCESSOR",
            destinationId: destProcessor.component.id,
            destinationGroupId: pgId,
            destinationType: "PROCESSOR",
          };

          const resp = await axiosInstance.post(
            `/process-groups/${pgId}/connections`,
            body
          );

          return resp.data;
        } catch (error) {
          logger.warn(
            `Connection creation attempt ${attempt} failed:`,
            error.message
          );

          if (attempt === maxRetries) {
            logger.error(
              `Failed to create connection after ${maxRetries} attempts`
            );
            throw error;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 7) Improved Connection Creation with Error Handling
    const connections = [];

    try {
      // Connection: GetMongo to JoltTransformJSON
      logger.info("Creating connection: GetMongo to JoltTransformJSON");
      const mongoToJoltConnection = await createConnectionWithRetry(
        newPgId,
        getMongo,
        joltTransform
        // "success"
      );
      connections.push(mongoToJoltConnection);
      logger.info("Created Connection: GetMongo to JoltTransformJSON");

      // Connection: JoltTransformJSON to PutSolrContentStream
      logger.info(
        "Creating connection: JoltTransformJSON to PutSolrContentStream"
      );
      const joltToSolrConnection = await createConnectionWithRetry(
        newPgId,
        joltTransform,
        putSolr,
        "success"
      );
      connections.push(joltToSolrConnection);
      logger.info(
        "Created Connection: JoltTransformJSON to PutSolrContentStream"
      );
    } catch (connectionError) {
      logger.error("Error creating connections:", connectionError);
      // Optionally, you might want to clean up previously created components
      throw connectionError;
    }

    // optionally start them
    if (startProcessors) {
      logger.info("Starting processors...");
      await startProcessor(getMongo.component.id, getMongo.revision);
      await startProcessor(joltTransform.component.id, joltTransform.revision);
      await startProcessor(putSolr.component.id, putSolr.revision);
      logger.info("Processors started.");
    }

    return res.status(201).json({
      message: "NiFi flow created successfully",
      processGroup: newPg,
      controllerService: mongoCS,
      getMongo,
      joltTransform,
      putSolr,
      connections: {
        mongoToJolt: connections[0], // First connection (GetMongo to JoltTransformJSON)
        joltToSolr: connections[1], // Second connection (JoltTransformJSON to PutSolrContentStream)
      },
    });
  } catch (error) {
    logger.error("Error automating NiFi flow:", error.message);
    return res.status(500).json({
      message: "Error automating NiFi flow",
      error: error.message,
    });
  }
});

// /**
//  * DELETE /api/nifi/pg/:id
//  * Stops all processors (and child PGs) within the given PG, then deletes the PG.
//  */
// router.delete("/pg/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     // 1) Recursively gather all child PGs & processors under this PG
//     //    getAllProcessGroupsWithProcessors(pgId) => returns array of { id, name, processors[], childGroups[] }
//     const allGroups = await getAllProcessGroupsWithProcessors(id);

//     // We'll flatten their IDs into two lists: one for PGs, one for processors
//     const allProcessGroupIds = [];
//     const allProcessorIds = [];

//     /**
//      * Recursively walk the nested structure to collect IDs
//      */
//     function gatherIds(groups) {
//       for (const group of groups) {
//         allProcessGroupIds.push(group.id);

//         for (const proc of group.processors) {
//           allProcessorIds.push(proc.id);
//         }

//         if (group.childGroups?.length) {
//           gatherIds(group.childGroups);
//         }
//       }
//     }

//     gatherIds(allGroups);

//     // 2) Stop all processors (top to bottom)
//     //    We do this by fetching each processor's revision, then PUT with state=STOPPED
//     for (const procId of allProcessorIds) {
//       const getProcResp = await axiosInstance.get(`/processors/${procId}`);
//       const { revision } = getProcResp.data;
//       const stopBody = {
//         revision,
//         component: {
//           id: procId,
//           state: "STOPPED",
//         },
//       };
//       await axiosInstance.put(`/processors/${procId}`, stopBody);
//       logger.info(`Stopped processor ${procId}`);
//     }

//     // 3) Stop each Process Group itself, from child to parent
//     //    NiFi allows PUT /flow/process-groups/<pgId> {id, state:STOPPED} to stop all components inside.
//     //    We'll do this in reverse order so that child PGs get stopped before their parents.
//     for (const pgId of allProcessGroupIds.reverse()) {
//       const stopPgBody = { id: pgId, state: "STOPPED" };
//       await axiosInstance.put(`/flow/process-groups/${pgId}`, stopPgBody);
//       logger.info(`Stopped process group ${pgId}`);
//     }

//     // 4) Finally, delete the *top-level* Process Group
//     //    For deletion, we must retrieve the current revision of the top-level PG
//     const getTopPgResp = await axiosInstance.get(`/process-groups/${id}`);
//     const { version, clientId } = getTopPgResp.data.revision;

//     await axiosInstance.delete(`/process-groups/${id}`, {
//       params: {
//         version,
//         clientId,
//         disconnectedNodeAcknowledged: true,
//       },
//     });

//     logger.info(`Successfully deleted Process Group with ID: ${id}`);
//     return res.status(200).json({ message: `Process Group ${id} deleted.` });
//   } catch (error) {
//     logger.error(`Error deleting Process Group ${id}: ${error.message}`);
//     return res.status(500).json({
//       message: `Failed to delete Process Group ${id}`,
//       error: error.message,
//     });
//   }
// });

/**
 * DELETE /api/nifi/pg/:id
 * Stops all processors (and child PGs) within the given PG, identifies and disables related
 * controller services, then deletes the PG and the controller services.
 */
router.delete("/pg/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Recursively gather all child PGs & processors under this PG
    //    getAllProcessGroupsWithProcessors(pgId) => returns array of { id, name, processors[], childGroups[] }
    const allGroups = await getAllProcessGroupsWithProcessors(id);

    // We'll flatten their IDs into two lists: one for PGs, one for processors
    const allProcessGroupIds = [];
    const allProcessorIds = [];

    /**
     * Recursively walk the nested structure to collect IDs
     */
    function gatherIds(groups) {
      for (const group of groups) {
        allProcessGroupIds.push(group.id);

        for (const proc of group.processors) {
          allProcessorIds.push(proc.id);
        }

        if (group.childGroups?.length) {
          gatherIds(group.childGroups);
        }
      }
    }

    gatherIds(allGroups);

    // 2) Find and collect all controller services related to this process group
    //    We need to look at the parent group level (typically root) where controller services are created
    logger.info(`Finding controller services for PG ${id}`);
    const controllerServices = [];

    // Get controller services at the root level
    // First, get the parent group ID
    const pgDetailResp = await axiosInstance.get(`/process-groups/${id}`);
    const parentGroupId = pgDetailResp.data.component.parentGroupId;

    // Get all controller services in the parent group
    const csResp = await axiosInstance.get(
      `/flow/process-groups/${parentGroupId}/controller-services`
    );
    const services = csResp.data.controllerServices || [];

    // Keep track of controller services that are referenced by any processors we're deleting
    // We'll need to analyze processor configurations to find this relationship
    // since they reference controller services by ID
    for (const procId of allProcessorIds) {
      try {
        const procResp = await axiosInstance.get(`/processors/${procId}`);
        const properties = procResp.data.component.config?.properties || {};

        // Look for controller service references in properties
        // Controller service references are typically properties ending with "service"
        // or explicitly containing "service" in the name
        for (const [key, value] of Object.entries(properties)) {
          if ((key.includes("service") || key.endsWith("service")) && value) {
            // Check if we already have this controller service
            const foundService = services.find((s) => s.component.id === value);
            if (
              foundService &&
              !controllerServices.some((cs) => cs.id === value)
            ) {
              controllerServices.push({
                id: foundService.component.id,
                name: foundService.component.name,
                revision: foundService.revision,
              });
              logger.info(
                `Found controller service ${foundService.component.name} (${foundService.component.id}) referenced by processor ${procId}`
              );
            }
          }
        }
      } catch (error) {
        logger.warn(
          `Error checking processor ${procId} for controller service references: ${error.message}`
        );
        // Continue with the loop, even if one processor fails
      }
    }

    // 3) Stop all processors (top to bottom)
    //    We do this by fetching each processor's revision, then PUT with state=STOPPED
    for (const procId of allProcessorIds) {
      const getProcResp = await axiosInstance.get(`/processors/${procId}`);
      const { revision } = getProcResp.data;
      const stopBody = {
        revision,
        component: {
          id: procId,
          state: "STOPPED",
        },
      };
      await axiosInstance.put(`/processors/${procId}`, stopBody);
      logger.info(`Stopped processor ${procId}`);
    }

    // 4) Stop each Process Group itself, from child to parent
    //    NiFi allows PUT /flow/process-groups/<pgId> {id, state:STOPPED} to stop all components inside.
    //    We'll do this in reverse order so that child PGs get stopped before their parents.
    for (const pgId of allProcessGroupIds.reverse()) {
      const stopPgBody = { id: pgId, state: "STOPPED" };
      await axiosInstance.put(`/flow/process-groups/${pgId}`, stopPgBody);
      logger.info(`Stopped process group ${pgId}`);
    }

    // 5) Disable controller services
    for (const cs of controllerServices) {
      try {
        // First, we need to get the latest revision
        const csDetailResp = await axiosInstance.get(
          `/controller-services/${cs.id}`
        );
        const revision = csDetailResp.data.revision;

        // Disable the controller service
        const disableBody = {
          revision,
          state: "DISABLED",
        };
        await axiosInstance.put(
          `/controller-services/${cs.id}/run-status`,
          disableBody
        );
        logger.info(`Disabled controller service ${cs.name} (${cs.id})`);
      } catch (error) {
        logger.warn(
          `Error disabling controller service ${cs.id}: ${error.message}`
        );
        // Continue with other controller services
      }
    }

    // 6) Delete the process group
    //    For deletion, we must retrieve the current revision of the top-level PG
    const getTopPgResp = await axiosInstance.get(`/process-groups/${id}`);
    const { version, clientId } = getTopPgResp.data.revision;

    await axiosInstance.delete(`/process-groups/${id}`, {
      params: {
        version,
        clientId,
        disconnectedNodeAcknowledged: true,
      },
    });
    logger.info(`Successfully deleted Process Group with ID: ${id}`);

    // 7) Delete the controller services
    for (const cs of controllerServices) {
      try {
        // Get the latest revision
        const csDetailResp = await axiosInstance.get(
          `/controller-services/${cs.id}`
        );
        const { version, clientId } = csDetailResp.data.revision;

        // Delete the controller service
        await axiosInstance.delete(`/controller-services/${cs.id}`, {
          params: {
            version,
            clientId,
            disconnectedNodeAcknowledged: true,
          },
        });
        logger.info(`Deleted controller service ${cs.name} (${cs.id})`);
      } catch (error) {
        logger.warn(
          `Error deleting controller service ${cs.id}: ${error.message}`
        );
        // Continue with other controller services
      }
    }

    return res.status(200).json({
      message: `Process Group ${id} and ${controllerServices.length} related controller services deleted.`,
      deletedControllerServices: controllerServices.map((cs) => ({
        id: cs.id,
        name: cs.name,
      })),
    });
  } catch (error) {
    logger.error(`Error deleting Process Group ${id}: ${error.message}`);
    return res.status(500).json({
      message: `Failed to delete Process Group ${id}`,
      error: error.message,
    });
  }
});

module.exports = router;
