// hooks/useSolrCollections.js
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ApibaseUrl from "../ApibaseUrl";

/**
 * Custom hook to fetch Solr collections from the backend:
 *    GET /solr/collections
 *
 * The backend route should respond with:
 *    { collections: [ "collection1", "collection2", ... ] }
 */
const useSolrCollections = () => {
  const baseUrl = ApibaseUrl;

  const [solrCollections, setSolrCollections] = useState([]);

  useEffect(() => {
    const fetchSolrCollections = async () => {
      try {
        if (!baseUrl) {
          throw new Error("API base URL is not defined.");
        }

        // e.g. GET http://<baseUrl>/solr/collections
        const response = await axios.get(`${baseUrl}/solr/collections`);
        if (response.data?.collections) {
          setSolrCollections(response.data.collections);
        } else {
          toast.error("لم يتم جلب قائمة المجموعات من سولر بنجاح");
        }
      } catch (error) {
        console.error("خطأ في جلب مجموعات سولر:", error);
        toast.error("حدث خطأ أثناء جلب مجموعات سولر.");
      }
    };

    fetchSolrCollections();
  }, []);

  return solrCollections;
};

export default useSolrCollections;
