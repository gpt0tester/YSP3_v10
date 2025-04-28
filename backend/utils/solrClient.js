// solrClient.js

const axios = require("axios");

// Ensure the SOLR_BASE_URL is set correctly, either through environment variables or hard-coded here for testing.
const SOLR_BASE_URL =
  process.env.SOLR_BASE_URL || "http://192.168.94.129:8983/solr/#/index";

if (!SOLR_BASE_URL) {
  throw new Error("SOLR_BASE_URL environment variable is not set.");
}

// Create an axios instance for Solr
const solrClient = axios.create({
  baseURL: SOLR_BASE_URL,
  timeout: 10000, // 10 seconds timeout, adjust if needed
  headers: {
    "Content-Type": "application/json",
  },
});

module.exports = { solrClient };
