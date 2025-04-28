//  new look

// hooks/useAvailableMongodbCollections.js
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ApibaseUrl from "../ApibaseUrl";

const useAvailableMongodbCollections = () => {
  const baseUrl = ApibaseUrl;

  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (!baseUrl) {
          throw new Error("API base URL is not defined.");
        }

        const response = await axios.get(`${baseUrl}/collections`);
        setCollections(response.data.collections);
      } catch (error) {
        console.error("خطأ في جلب المجموعات:", error);
        toast.error("حدث خطأ أثناء جلب المجموعات.");
      }
    };

    fetchCollections();
  }, []);

  return collections;
};

export default useAvailableMongodbCollections;
