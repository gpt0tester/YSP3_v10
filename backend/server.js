const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const logger = require("./utils/logger");
// const services = require("./config/services");
const { registerAllModels } = require("./utils/getDynamicModel");
const collectionsRouter = require("./routes/collections");
const csvUploadRoutes = require("./routes/csvUploadRoutes");
const jsonUploadRoutes = require("./routes/jsonUploadRoutes");
const createIndexRoutes = require("./routes/createIndex");
const searchRoute = require("./routes/search");
const nifiRoute = require("./routes/nifiRoute");
const solrSchemaRoute = require("./routes/solrSchemaRoute");
const solrConstantsRoutes = require("./routes/solrConstantsRoutes");
const translationRoutes = require("./routes/translationRoutes");
const queryTemplatesRoute = require("./routes/queryTemplatesRoute");
// const csvUploadQueue = require("./utils/jobQueue"); // Import the job queue
const { gracefulShutdown: redisShutdown } = require("./utils/redisClient");
// const { default: getApiUrl } = require("../frontend/src/config");

dotenv.config();

// Check required environment variables
const requiredEnvVars = ["MONGO_HOST", "PORT"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    logger.error(`FATAL ERROR: ${varName} is not defined.`);
    process.exit(1);
  }
});

const app = express();

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Gzip compression
app.use(compression());

// HTTP request logging using Morgan and Winston
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
// app.use("/api/", limiter);

// // CORS configuration
// const allowedOrigins = ["http://localhost:3000", "https://yourdomain.com"];
app.use(
  cors({
    origin: "*",
    // function(origin, callback) {
    //   if (!origin) return callback(null, true);
    //   if (allowedOrigins.includes(origin)) {
    //     callback(null, true);
    //   } else {
    //     callback(
    //       new Error(
    //         "CORS policy does not allow access from the specified Origin."
    //       ),
    //       false
    //     );
    //   }
    // },
    // optionsSuccessStatus: 200,
    // credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Trust proxy if behind a reverse proxy
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Routes
// app.use("/api/config", services);
app.use("/api/upload-csv", csvUploadRoutes);
app.use("/api/upload-json", jsonUploadRoutes);
app.use("/api/collections", collectionsRouter);
app.use("/api/search", searchRoute);
app.use("/api/nifi", nifiRoute);
app.use("/api/solr", solrSchemaRoute);
app.use("/api/solr-constants", solrConstantsRoutes);
app.use("/api/query-templates", queryTemplatesRoute);
app.use("/api/translations", translationRoutes);
app.use("/api/mongo-index", createIndexRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later.",
  });
});

// MongoDB connection with retry logic

// Retrieve environment variables
const username = process.env.MONGO_INITDB_ROOT_USERNAME;
const password = process.env.MONGO_INITDB_ROOT_PASSWORD;
const host = process.env.MONGO_HOST;
// const ports = process.env.MONGO_PORTS.split(","); // Convert string to array
const replicaSetName = process.env.REPLICA_SET_NAME;
const authSource = process.env.AUTH_SOURCE;
const readPreference = process.env.READ_PREFERENCE;
const database = process.env.MONGO_INITDB_DATABASE;

// Optional TLS/SSL variables
// const useTLS = process.env.MONGO_TLS === "true";
// const tlsCAFile = process.env.MONGO_TLS_CA_FILE;
// const tlsCertFile = process.env.MONGO_TLS_CERT_FILE;
// const tlsKeyFile = process.env.MONGO_TLS_KEY_FILE;

// Construct the MongoDB URI
// let mongoURI = `mongodb://${username}:${password}@${host}:${ports[0]},${host}:${ports[1]},${host}:${ports[2]}/${database}?replicaSet=${replicaSetName}&authSource=${authSource}&readPreference=${readPreference}`;
let mongoURI = `mongodb://${username}:${password}@${host}/${database}?replicaSet=${replicaSetName}&authSource=${authSource}&readPreference=${readPreference}`;

const connectWithRetry = async () => {
  try {
    await mongoose.connect(mongoURI);
    logger.info("MongoDB connected");
    await registerAllModels();
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    logger.info("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info("Shutting down gracefully...");
  // Close Bull queue
  await csvUploadQueue.close();
  await redisShutdown(); // Disconnect Redis client
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info("MongoDB connection closed");
      process.exit(0);
    });
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start the server
const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// // Start the job queue worker
// csvUploadQueue.on("completed", (job, result) => {
//   logger.info(`Job completed with result: ${JSON.stringify(result)}`);
// });

// csvUploadQueue.on("failed", (job, err) => {
//   logger.error(`Job failed with error: ${err.message}`);
// });
