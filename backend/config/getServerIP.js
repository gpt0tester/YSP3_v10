const os = require("os");

const getServerIP = () => {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const details of iface) {
      if (details.family === "IPv4" && !details.internal) {
        return details.address; // Get first external IPv4
      }
    }
  }
  return "localhost"; // Fallback
};

const backendPort = process.env.PORT || 5000;
const defaultHostUrl = `http://${getServerIP()}:${backendPort}`;
const apiBaseUrl = process.env.HOST_URL || defaultHostUrl; // Use HOST_URL if available

console.log("API Base URL:", apiBaseUrl);

module.exports = { apiBaseUrl };
