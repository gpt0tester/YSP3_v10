import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Search,
  Database,
  Layers,
  PlusCircle,
  X,
  Save,
  RefreshCw,
  Trash2,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Loader,
  Copy,
  FileType,
  Filter,
} from "lucide-react";
import ApibaseUrl from "../../ApibaseUrl";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

const SolrCollectionManager = ({ darkMode, onSuccess }) => {
  const baseUrl = ApibaseUrl;

  // State for collections
  const [collections, setCollections] = useState([]);
  const [solrCollections, setSolrCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [selectedCollection, setSelectedCollection] = useState("");
  const [configSetName, setConfigSetName] = useState("myUnifiedConfig");
  const [numShards, setNumShards] = useState(1);
  const [replicationFactor, setReplicationFactor] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // UI state
  const [collectionName, setCollectionName] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "collectionName",
    direction: "ascending",
  });

  // Fetch MongoDB collections for the dropdown
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        if (!baseUrl) throw new Error("API base URL not set");
        setIsLoading(true);
        setError(null);
        const resp = await axios.get(`${baseUrl}/collections`);
        setCollections(resp.data.collections || []);
      } catch (err) {
        console.error("Error fetching collections:", err);
        setError("فشل في جلب مجموعات MongoDB. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollections();
  }, []);

  // Fetch Solr collections
  const fetchSolrCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${baseUrl}/solr/collections`);
      setSolrCollections(response.data?.collections || []);
    } catch (error) {
      console.error("Error listing Solr collections:", error);
      setError("فشل في جلب فهارس Solr. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSolrCollections();
  }, []);

  // Form validation
  const validateForm = () => {
    if (!selectedCollection.trim()) {
      toast.error("يرجى اختيار المجموعة.");
      return false;
    }
    if (!configSetName.trim()) {
      toast.error("يرجى إدخال اسم الـ ConfigSet لـ Solr.");
      return false;
    }
    if (numShards < 1) {
      toast.error("عدد الـ Shards يجب أن يكون 1 أو أكثر.");
      return false;
    }
    if (replicationFactor < 1) {
      toast.error("عامل التكرار (replicationFactor) يجب أن يكون 1 أو أكثر.");
      return false;
    }

    return true;
  };

  // Reset form
  const resetForm = () => {
    setSelectedCollection("");
    setConfigSetName("myUnifiedConfig");
    setNumShards(1);
    setReplicationFactor(1);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    // Build payload for your backend
    const payload = {
      collectionName: selectedCollection,
      configSetName,
      numShards: Number(numShards),
      replicationFactor: Number(replicationFactor),
    };

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      // SolrCloud collection referencing configSet
      const response = await axios.post(
        `${baseUrl}/collections/create-solr`,
        payload
      );

      if (response.status === 201) {
        toast.success(
          `تم إنشاء فهرس Solr بنجاح للمجموعة "${selectedCollection}"`
        );

        // Reset form and UI state
        resetForm();
        setShowCreateForm(false);
        fetchSolrCollections();

        // Call parent callback if needed
        if (onSuccess) {
          onSuccess(selectedCollection);
        }
      } else {
        toast.error("فشل في إنشاء الفهرس.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 409) {
            toast.error(
              "المجموعة موجودة بالفعل في Solr. يرجى اختيار مجموعة أخرى."
            );
          } else {
            toast.error(
              `خطأ من الخادم: ${error.response.data.message || error.message}`
            );
          }
        } else if (error.request) {
          toast.error("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
        } else {
          toast.error(`خطأ: ${error.message}`);
        }
      } else {
        console.error("خطأ في إنشاء الفهرس:", error);
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Solr collection deletion
  const handleDeleteSolr = (index) => {
    setIndexToDelete(index);
    setDeleteModalOpen(true);
  };

  const confirmDeleteSolr = async () => {
    if (!indexToDelete) return;

    try {
      await axios.delete(`${baseUrl}/collections/${indexToDelete}`);
      toast.success(`تم حذف فهرس Solr: ${indexToDelete}`);

      // Refresh the collections list
      fetchSolrCollections();
    } catch (error) {
      console.error("Error deleting solr index:", error);
      toast.error("فشل في حذف فهرس Solr");
    } finally {
      setIndexToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // Sorting functionality
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort Solr collections
  const filteredAndSortedCollections = useMemo(() => {
    // Normalize collection data for consistent handling
    const normalizedCollections = solrCollections
      .map((item) => {
        if (typeof item === "string") {
          return { collectionName: item, displayName: item };
        } else if (typeof item === "object" && item !== null) {
          return {
            collectionName: item.collectionName,
            displayName: item.displayName || item.collectionName,
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    // Filter collections based on search term
    let filtered = normalizedCollections;
    if (searchTerm) {
      filtered = normalizedCollections.filter(
        (col) =>
          col.collectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort filtered collections
    return [...filtered].sort((a, b) => {
      if (!sortConfig.key) return 0;

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [solrCollections, searchTerm, sortConfig]);

  // Theme classes for consistent styling
  const themeClasses = {
    container: darkMode
      ? "bg-gray-900 text-gray-100"
      : "bg-gray-50 text-gray-800",
    card: darkMode
      ? "bg-gray-800 text-gray-100 border-gray-700"
      : "bg-white text-gray-800 border-gray-200",
    input: darkMode
      ? "bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-500"
      : "bg-white text-gray-800 border-gray-300 focus:border-blue-500",
    button: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      success:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      secondary: darkMode
        ? "bg-gray-700 text-gray-100 hover:bg-gray-600 border-gray-600"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300",
      ghost: darkMode
        ? "bg-gray-800 text-gray-100 hover:bg-gray-700 border-gray-700"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200",
    },
    tableHeader: darkMode
      ? "bg-gray-700 text-gray-100 border-gray-600"
      : "bg-gray-100 text-gray-800 border-gray-200",
    tableRow: darkMode
      ? "border-gray-700 hover:bg-gray-700"
      : "border-gray-200 hover:bg-gray-50",
    tableCell: darkMode ? "border-gray-700" : "border-gray-200",
  };

  return (
    <div dir="rtl" className={`p-6 ${themeClasses.container}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Layers className="mr-2 h-6 w-6" />
            إدارة فهارس Solr
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            إنشاء وإدارة فهارس Solr للمجموعات
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) resetForm();
            }}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.primary}`}
          >
            {showCreateForm ? (
              <X className="ml-2 h-4 w-4" />
            ) : (
              <PlusCircle className="ml-2 h-4 w-4" />
            )}
            {showCreateForm ? "إلغاء" : "إنشاء فهرس جديد"}
          </button>

          <button
            onClick={fetchSolrCollections}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.ghost} border`}
          >
            <RefreshCw
              className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div
          className={`mb-6 rounded-lg border shadow-md p-6 ${themeClasses.card}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <PlusCircle className="ml-2 h-5 w-5 text-blue-500" />
              إنشاء فهرس Solr جديد
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Collection Selection */}
            <div>
              <label className="block mb-2 font-medium text-sm flex items-center">
                <Database className="ml-2 h-4 w-4" />
                اختر المجموعة:
              </label>
              <div className="relative">
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none ${themeClasses.input}`}
                  required
                >
                  <option value="">-- اختر مجموعة MongoDB --</option>
                  {collections.map((c) => (
                    <option key={c.collectionName} value={c.collectionName}>
                      {c.displayName || c.collectionName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                المجموعة التي سيتم إنشاء فهرس Solr لها
              </p>
            </div>

            {/* ConfigSet Name */}
            <div>
              <label className="block mb-2 font-medium text-sm flex items-center">
                <Settings className="ml-2 h-4 w-4" />
                اسم الـ ConfigSet في SolrCloud:
              </label>
              <input
                type="text"
                value={configSetName}
                onChange={(e) => setConfigSetName(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                placeholder="مثال: myUnifiedConfig"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ConfigSet يحدد هيكل الفهرس وإعداداته
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Num Shards */}
              <div>
                <label className="block mb-2 font-medium text-sm flex items-center">
                  <Copy className="ml-2 h-4 w-4" />
                  عدد الـ Shards (numShards):
                </label>
                <input
                  type="number"
                  min="1"
                  value={numShards}
                  onChange={(e) => setNumShards(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  عدد الأجزاء التي سيتم تقسيم الفهرس إليها
                </p>
              </div>

              {/* Replication Factor */}
              <div>
                <label className="block mb-2 font-medium text-sm flex items-center">
                  <FileType className="ml-2 h-4 w-4" />
                  عامل التكرار (replicationFactor):
                </label>
                <input
                  type="number"
                  min="1"
                  value={replicationFactor}
                  onChange={(e) => setReplicationFactor(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  عدد النسخ المتكررة للبيانات للتوافر العالي
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 space-x-reverse">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 mr-3 ${themeClasses.button.ghost}`}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.primary}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    إنشاء الفهرس
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-r-4 border-red-500 text-red-700 dark:text-red-300 rounded-lg flex items-start">
          <AlertTriangle className="h-5 w-5 ml-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">خطأ</p>
            <p>{error}</p>
            <button
              onClick={fetchSolrCollections}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center w-fit"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Solr Collections Table */}
      <div className={`rounded-lg border shadow-md ${themeClasses.card}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center">
            <Layers className="ml-2 h-5 w-5" />
            فهارس Solr المتاحة
          </h2>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث عن فهرس..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg ${themeClasses.input}`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex justify-center items-center p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                جاري تحميل الفهارس...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedCollections.length === 0 && (
          <div className="p-12 text-center">
            <Layers className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد فهارس Solr</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "لا توجد فهارس تطابق معايير البحث"
                : "لم يتم إنشاء أي فهارس Solr بعد. أنشئ فهرسك الأول للبدء."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إظهار جميع الفهارس
              </button>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <PlusCircle className="ml-2 h-5 w-5" />
                إنشاء فهرس جديد
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && filteredAndSortedCollections.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={themeClasses.tableHeader}>
                <tr>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("collectionName")}
                  >
                    <div className="flex items-center justify-center">
                      اسم الفهرس
                      {sortConfig.key === "collectionName" && (
                        <span className="mr-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("displayName")}
                  >
                    <div className="flex items-center justify-center">
                      اسم العرض
                      {sortConfig.key === "displayName" && (
                        <span className="mr-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedCollections.map((item, index) => (
                  <tr
                    key={`${item.collectionName}-${index}`}
                    className={`${themeClasses.tableRow} ${
                      darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="text-sm font-medium">
                        {item.collectionName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {item.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDeleteSolr(item.collectionName)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="حذف الفهرس"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setIndexToDelete(null);
        }}
        collectionName={indexToDelete}
        onConfirm={confirmDeleteSolr}
        darkMode={darkMode}
        title="حذف فهرس Solr"
        mainMessage="هل أنت متأكد أنك تريد حذف الفهرس؟"
      />
    </div>
  );
};

export default SolrCollectionManager;
