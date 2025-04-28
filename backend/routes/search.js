// routes/search.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");
const CollectionMetadata = require("../models/CollectionMetadata");
const QueryTemplate = require("../models/QueryTemplate");
const { client } = require("../utils/redisClient"); // Adjust if needed

dotenv.config();

// GET: retrieve available collections from MongoDB metadata
router.get("/", async (req, res) => {
  try {
    const collections = await CollectionMetadata.find(
      {},
      "collectionName displayName"
    );
    return res.status(200).json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return res.status(500).json({ message: "Error fetching collections" });
  }
});

// POST: multi-collection Solr search with cursor-based pagination + Redis caching
router.post("/", async (req, res) => {
  let {
    query,
    limit = 50,
    solrCollections = [],
    cursorMarks = {},
    fq = [],
  } = req.body;

  // If no collections are provided, return error
  if (!solrCollections.length) {
    return res
      .status(400)
      .json({ message: "No Solr collections selected for search." });
  }

  try {
    // Retrieve default query template if any
    let defaultTemplate = null;
    try {
      defaultTemplate = await QueryTemplate.findOne({ default: true });
    } catch (err) {
      console.error("Error retrieving default query template:", err);
    }

    // Base Solr parameters
    const baseSolrParams = {
      q: query,
      rows: limit,
      sort: "score desc, id asc", // ensure a deterministic unique sort
      defType: "edismax",
      qf: defaultTemplate?.qf,
      fl: defaultTemplate?.fl,
      "q.op": "OR",
      pf: defaultTemplate?.pf,
      ps: typeof defaultTemplate?.ps === "number" ? defaultTemplate.ps : null,
      pf2: defaultTemplate?.pf2,
      ps2:
        typeof defaultTemplate?.ps2 === "number" ? defaultTemplate.ps2 : null,
      pf3: defaultTemplate?.pf3,
      ps3:
        typeof defaultTemplate?.ps3 === "number" ? defaultTemplate.ps3 : null,
      mm: defaultTemplate?.mm || "2<100%",
      facet: !!defaultTemplate?.facetFields?.length,
      "facet.field": defaultTemplate?.facetFields || [],
      fq,
      wt: "json",
    };

    const solrHost = process.env.SOLR_HOST; // e.g. http://localhost:8983/solr
    const SOLR_AUTH = {
      username: process.env.SOLR_AUTH_USER,
      password: process.env.SOLR_AUTH_PASSWORD,
    };

    // Prepare final data structures
    const resultsByCollection = {};
    const nextCursorMarks = {};
    // const highlightingByCollection = {};
    const facetsByCollection = {};
    const numFoundByCollection = {};
    const errors = [];

    // Fire off requests in parallel
    const solrPromises = solrCollections.map(async (collectionName) => {
      try {
        const currentCursorMark = cursorMarks[collectionName] || "*";
        const cacheKey = `solrSearch:${collectionName}:${query}:${limit}:${currentCursorMark}`;

        // Check Redis cache
        const cachedResult = await client.get(cacheKey);
        if (cachedResult) {
          console.log(`Serving from Redis cache for ${collectionName}`);
          const parsed = JSON.parse(cachedResult);
          return { collectionName, ...parsed };
        }

        // Not cached -> query Solr
        const solrUrl = `${solrHost}/${collectionName}/select`;
        const solrParams = {
          ...baseSolrParams,
          cursorMark: currentCursorMark,
        };

        const solrResponse = await axios.get(solrUrl, {
          params: solrParams,
          auth: SOLR_AUTH,
        });

        const docs = solrResponse.data?.response?.docs || [];
        const nextCursorMark =
          solrResponse.data?.nextCursorMark || currentCursorMark;
        // const highlighting = solrResponse.data?.highlighting || {};
        const facets = solrResponse.data?.facet_counts?.facet_fields || {};
        const numFound = solrResponse.data?.response?.numFound || 0;

        // Store in Redis (TTL = 60 seconds, adjustable)
        const dataToCache = {
          docs,
          nextCursorMark,
          // highlighting,
          facets,
          numFound,
        };
        await client.set(cacheKey, JSON.stringify(dataToCache), { EX: 600 });
        console.log(`Storing in Redis cache for ${collectionName}`);

        return {
          collectionName,
          docs,
          nextCursorMark,
          // highlighting,
          facets,
          numFound,
        };
      } catch (error) {
        console.error(`Error searching Solr for ${collectionName}:`, error);
        return {
          collectionName,
          docs: [],
          nextCursorMark: cursorMarks[collectionName] || "*",
          // highlighting: {},
          facets: {},
          numFound: 0,
          error: error.message,
        };
      }
    });

    const resultsArray = await Promise.all(solrPromises);

    // Build final objects
    for (const result of resultsArray) {
      const {
        collectionName,
        docs,
        nextCursorMark,
        // highlighting,
        facets,
        numFound,
        error,
      } = result;

      if (error) {
        errors.push({ collection: collectionName, message: error });
        resultsByCollection[collectionName] = [];
        nextCursorMarks[collectionName] = cursorMarks[collectionName] || "*";
        // highlightingByCollection[collectionName] = {};
        facetsByCollection[collectionName] = {};
        numFoundByCollection[collectionName] = 0;
      } else {
        resultsByCollection[collectionName] = docs;
        nextCursorMarks[collectionName] = nextCursorMark;
        // highlightingByCollection[collectionName] = highlighting;
        facetsByCollection[collectionName] = facets;
        numFoundByCollection[collectionName] = numFound;
      }
    }

    // Build final response
    const finalResponse = {
      results: resultsByCollection, // { colName: [doc1, doc2, ...], ... }
      nextCursorMarks, // { colName: "<cursor>", ... }
      // highlighting: highlightingByCollection,
      facets: facetsByCollection,
      numFound: numFoundByCollection,
      errors,
      success: errors.length === 0,
    };

    return res.json(finalResponse);
  } catch (error) {
    console.error("Solr query error:", error);
    return res
      .status(500)
      .json({ message: "Error querying Solr", error: error.message });
  }
});

module.exports = router;
