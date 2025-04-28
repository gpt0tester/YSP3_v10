const redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

// For docker-compose, the service name is "redis" on the same network.
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

// Create Redis client
// (With a reconnect strategy for resilience)
const client = redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    // Optional reconnect strategy
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        return new Error("Retry attempts exhausted");
      }
      // Example: exponential backoff
      return Math.min(retries * 50, 2000);
    },
  },
  // If Redis is password-protected, set it here
  password: REDIS_PASSWORD || undefined,
});

// Error handling
client.on("error", (err) => {
  console.error("[Redis] Client Error:", err);
});

// 'ready' event (fired when the client is fully operational)
client.on("ready", () => {
  console.log("[Redis] Client is ready");
});

// Connection handling
const connectToRedis = async () => {
  try {
    await client.connect();
    console.log("[Redis] Connected!");
  } catch (err) {
    console.error("[Redis] Error connecting:", err);
    // If not using the built-in reconnectStrategy, do:
    // setTimeout(connectToRedis, 5000);
  }
};

// Call the connect function
connectToRedis();

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await client.quit();
    console.log("[Redis] Disconnected gracefully.");
  } catch (err) {
    console.error("[Redis] Error during disconnection:", err);
  }
};

module.exports = {
  client,
  gracefulShutdown,
};
