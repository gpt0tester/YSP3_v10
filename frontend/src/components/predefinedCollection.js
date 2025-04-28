import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ApibaseUrl from "../ApibaseUrl";

const PredefinedCollection = ({
  selectedCollection,
  setSelectedCollection,
  darkMode,
}) => {
  const baseUrl = ApibaseUrl;

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        if (!baseUrl) {
          throw new Error("لم يتم تعريف عنوان API الأساسي.");
        }

        const response = await axios.get(`${baseUrl}/collections`);

        // Check if response.data contains collections array
        const collectionsData = Array.isArray(response.data)
          ? response.data
          : response.data.collections;

        if (collectionsData && Array.isArray(collectionsData)) {
          // Filter only predefined collections (fields array > 0)
          const predefinedCollections = collectionsData.filter(
            (collection) => collection.fields && collection.fields.length > 0
          );
          setCollections(predefinedCollections);
        } else {
          throw new Error("البيانات غير صالحة.");
        }
      } catch (error) {
        console.error("خطأ في جلب المجموعات:", error);
        toast.error("تعذر جلب المجموعات. يرجى المحاولة مرة أخرى.");
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  return (
    <div className="mb-4" dir="rtl">
      <label htmlFor="collection-select" className="block">
        اختر المجموعة:
      </label>
      {loading ? (
        <p>جاري تحميل المجموعات...</p>
      ) : (
        <select
          id="collection-select"
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg ${
            darkMode
              ? "text-gray-100 bg-gray-700 border-gray-700"
              : "text-gray-800 bg-gray-100 border-gray-300"
          }`}
        >
          <option value="">-- يرجى اختيار مجموعة --</option>
          {collections.length > 0 ? (
            collections.map((collection) => (
              <option key={collection._id} value={collection.collectionName}>
                {collection.displayName || collection.collectionName}
              </option>
            ))
          ) : (
            <option value="" disabled>
              لا توجد مجموعات متاحة.
            </option>
          )}
        </select>
      )}
    </div>
  );
};

export default PredefinedCollection;
