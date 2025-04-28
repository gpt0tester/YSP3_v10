import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ApibaseUrl from "../../ApibaseUrl";

/**
 * CreateIndex component:
 * Allows creating single-field or compound indexes on a chosen MongoDB collection.
 *
 * Features:
 *  - Multiple fields (add rows) => compound index
 *  - Ascending / descending order
 *  - unique / background / sparse toggles
 *  - partialFilter (JSON) => partialFilterExpression
 *  - expireAfterSeconds => TTL index
 *  - optional custom index name
 */

const CreateIndex = ({ darkMode }) => {
  const baseUrl = ApibaseUrl;

  // 1) Collections & Basic State
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2) Fields (array for compound index)
  // Each element is { name: string, order: 1 or -1 }
  const [fields, setFields] = useState([{ name: "", order: 1 }]);

  // 3) Index Options
  const [unique, setUnique] = useState(false);
  const [background, setBackground] = useState(true);
  const [sparse, setSparse] = useState(false);

  // 4) Optional: partialFilter, expireAfterSeconds, and custom index name
  const [partialFilter, setPartialFilter] = useState("{}");
  const [expireAfterSeconds, setExpireAfterSeconds] = useState("");
  const [indexName, setIndexName] = useState("");

  // ------------------------------------------------------------------
  // A) Fetch the list of collections from your API (like in CsvUpload)
  // ------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const fetchCollections = async () => {
      setLoadingCollections(true);
      try {
        if (!baseUrl) {
          throw new Error(
            "لم يتم تعريف REACT_APP_API_BASE_URL في ملفات البيئة."
          );
        }
        const response = await axios.get(`${baseUrl}/collections`);
        if (isMounted && response.data?.collections) {
          setCollections(response.data.collections);
        }
      } catch (error) {
        console.error("خطأ في جلب المجموعات:", error);
        toast.error("حدث خطأ أثناء جلب المجموعات. يرجى المحاولة مرة أخرى.");
      } finally {
        if (isMounted) {
          setLoadingCollections(false);
        }
      }
    };
    fetchCollections();

    return () => {
      isMounted = false;
    };
  }, []);

  // ------------------------------------------------------------------
  // B) Handlers for the Fields Array
  // ------------------------------------------------------------------
  // Add a new empty row for another field
  const addFieldRow = () => {
    setFields([...fields, { name: "", order: 1 }]);
  };

  // Remove a field row by index
  const removeFieldRow = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  // Update field name or order
  const handleFieldChange = (idx, key, value) => {
    const updated = [...fields];
    updated[idx][key] = value;
    setFields(updated);
  };

  // ------------------------------------------------------------------
  // C) Submit the index creation
  // ------------------------------------------------------------------
  const handleCreateIndex = async (e) => {
    e.preventDefault();

    if (!selectedCollection) {
      toast.error("يرجى اختيار المجموعة قبل إنشاء الفهرس.");
      return;
    }

    // Validate fields array
    if (!fields || fields.length === 0) {
      toast.error("يرجى إضافة حقل واحد على الأقل.");
      return;
    }
    // Ensure each field has a name
    for (const f of fields) {
      if (!f.name.trim()) {
        toast.error("يرجى تحديد اسم الحقل.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف REACT_APP_API_BASE_URL.");
      }

      // Parse partialFilter JSON
      let parsedPartialFilter = {};
      if (partialFilter.trim() !== "") {
        try {
          parsedPartialFilter = JSON.parse(partialFilter);
        } catch (parseErr) {
          toast.error("صيغة JSON غير صحيحة في Partial Filter.");
          setIsSubmitting(false);
          return;
        }
      }

      // Build the request body
      const body = {
        fields, // e.g. [ { name: "email", order: 1 }, { name: "createdAt", order: -1 } ]
        unique,
        background,
        sparse,
      };

      if (indexName.trim() !== "") {
        body.name = indexName;
      }
      if (expireAfterSeconds) {
        body.expireAfterSeconds = Number(expireAfterSeconds);
      }
      if (Object.keys(parsedPartialFilter).length > 0) {
        body.partialFilter = parsedPartialFilter;
      }

      // POST /collections/:collectionName/indexes
      const response = await axios.post(
        `${baseUrl}/mongo-index/${selectedCollection}/indexes`,
        body
      );

      if (response.status === 200) {
        const { message, indexName: createdIndexName } = response.data;
        toast.success(
          `نجح إنشاء الفهرس: ${createdIndexName || "تم بدون اسم مخصص"}.`
        );
        console.log("Response:", response.data);

        // Reset form or keep as is
        setFields([{ name: "", order: 1 }]);
        setUnique(false);
        setBackground(true);
        setSparse(false);
        setPartialFilter("{}");
        setExpireAfterSeconds("");
        setIndexName("");
      } else {
        toast.error("فشل في إنشاء الفهرس (Index).");
      }
    } catch (err) {
      console.error("Error creating index:", err);
      const errorMsg =
        err.response?.data?.message || "حدث خطأ عند إنشاء الفهرس.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // D) Render
  // ------------------------------------------------------------------
  return (
    <div dir="rtl" className="p-4">
      <h2 className="text-2xl font-semibold mb-4">
        إنشاء فهرس (Index) - متعدد الحقول
      </h2>

      <form onSubmit={handleCreateIndex} className="space-y-4 max-w-xl">
        {/* 1) Collection Select */}
        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            اختر المجموعة:
          </label>
          {loadingCollections ? (
            <p>جاري تحميل المجموعات...</p>
          ) : (
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className={`w-full px-3 py-2 border rounded ${
                darkMode
                  ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <option value="">-- اختر المجموعة --</option>
              {collections.map((col) => (
                <option key={col._id} value={col.collectionName}>
                  {col.displayName || col.collectionName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2) Multiple Fields for Compound Index */}
        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            الحقول (Compound Fields):
          </label>
          {fields.map((field, idx) => (
            <div key={idx} className="flex items-center mb-2 space-x-2">
              {/* Field Name */}
              <input
                className={`px-3 py-1 border rounded ${
                  darkMode
                    ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                placeholder="اسم الحقل"
                value={field.name}
                onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
              />

              {/* Order */}
              <select
                className={`px-2 py-1 border rounded ${
                  darkMode
                    ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
                value={field.order}
                onChange={(e) =>
                  handleFieldChange(idx, "order", Number(e.target.value))
                }
              >
                <option value={1}>تصاعدي (1)</option>
                <option value={-1}>تنازلي (-1)</option>
              </select>

              {/* Remove field row button (if more than one row) */}
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFieldRow(idx)}
                  className="text-red-600 hover:text-red-800"
                >
                  حذف
                </button>
              )}
            </div>
          ))}
          {/* Add new field row */}
          <button
            type="button"
            onClick={addFieldRow}
            className="mt-1 text-blue-600 hover:text-blue-800"
          >
            + إضافة حقل آخر
          </button>
        </div>

        {/* 3) Index Options (unique, background, sparse) */}
        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center space-x-1">
            <input
              type="checkbox"
              checked={unique}
              onChange={() => setUnique(!unique)}
            />
            <span>Unique</span>
          </label>
          <label className="inline-flex items-center space-x-1">
            <input
              type="checkbox"
              checked={background}
              onChange={() => setBackground(!background)}
            />
            <span>Background</span>
          </label>
          <label className="inline-flex items-center space-x-1">
            <input
              type="checkbox"
              checked={sparse}
              onChange={() => setSparse(!sparse)}
            />
            <span>Sparse</span>
          </label>
        </div>

        {/* 4) Optional TTL & Name */}
        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            TTL (expireAfterSeconds) - اختياري
          </label>
          <input
            type="number"
            className={`w-full px-3 py-1 border rounded ${
              darkMode
                ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            placeholder="مثال: 3600 للإنتهاء بعد ساعة"
            value={expireAfterSeconds}
            onChange={(e) => setExpireAfterSeconds(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            اسم الفهرس (اختياري)
          </label>
          <input
            type="text"
            className={`w-full px-3 py-1 border rounded ${
              darkMode
                ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            placeholder="سيُنشئ اسماً تلقائياً إن لم يُحدد"
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
          />
        </div>

        {/* 5) Partial Filter (JSON) */}
        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            Partial Filter (JSON) - اختياري
          </label>
          <textarea
            rows={3}
            className={`w-full px-3 py-1 border rounded ${
              darkMode
                ? "dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            placeholder='مثال: {"status": "active"}'
            value={partialFilter}
            onChange={(e) => setPartialFilter(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الإنشاء..." : "إنشاء الفهرس"}
        </button>
      </form>
    </div>
  );
};

export default CreateIndex;
