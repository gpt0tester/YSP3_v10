import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  PlusCircle,
  Activity,
  Edit,
  Trash2,
  X,
  Plus,
  AlertTriangle,
  RefreshCw,
  Save,
  Loader,
  CheckCircle,
  Key,
  Tag,
  List,
  FileType,
  Code,
  Settings,
  Server,
  Eye,
  EyeOff,
} from "lucide-react";
import ApibaseUrl from "../../ApibaseUrl";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

// Flatten helper
function flattenProcessGroups(pgArray, flattened = []) {
  pgArray.forEach((pg) => {
    flattened.push({ id: pg.id, name: pg.name });
    if (pg.childGroups?.length) {
      flattenProcessGroups(pg.childGroups, flattened);
    }
  });
  return flattened;
}

const NiFiFlowAutoForm = ({ darkMode, onSuccess }) => {
  const baseUrl = ApibaseUrl;

  const [collections, setCollections] = useState([]);
  const [pgList, setPgList] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedPG, setSelectedPG] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customPGName, setCustomPGName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showCollectionPGsOnly, setShowCollectionPGsOnly] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });

  // Optional advanced config
  const [startProcessors, setStartProcessors] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [dbName, setDbName] = useState("");
  const [mongoUri, setMongoUri] = useState("");
  const [solrZk, setSolrZk] = useState("");

  // 1) Fetch collections
  const fetchCollections = async () => {
    try {
      if (!baseUrl) throw new Error("API base URL not set");
      const resp = await axios.get(`${baseUrl}/collections`);
      setCollections(resp.data.collections || []);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("فشل في جلب المجموعات. يرجى المحاولة مرة أخرى.");
    }
  };

  // 2) Fetch NiFi PG hierarchy
  const fetchPGs = async () => {
    try {
      if (!baseUrl) throw new Error("API base URL not set");
      setIsLoading(true);
      const resp = await axios.get(`${baseUrl}/nifi/pg/hierarchy`);
      // resp.data is an array with root in [0], let's flatten
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        const flattened = flattenProcessGroups(resp.data);
        setPgList(flattened);
        // Set root PG as default if available
        if (flattened.length > 0) {
          const rootPG = flattened.find((pg) => pg.name === "NiFi Flow");
          if (rootPG) {
            setSelectedPG(rootPG.id);
          } else {
            setSelectedPG(flattened[0].id);
          }
        }
      } else {
        toast.error("No NiFi PG data found");
      }
    } catch (err) {
      console.error("Error fetching NiFi PGs:", err);
      setError("فشل في جلب مجموعات المعالجة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchPGs();
  }, []);

  // Update custom PG name when collection changes
  useEffect(() => {
    if (selectedCollection) {
      setCustomPGName(`PG_${selectedCollection}`);
    } else {
      setCustomPGName("");
    }
  }, [selectedCollection]);

  // Handle delete process group
  const confirmDeleteNiFi = async (removeData) => {
    if (!flowToDelete) return;

    const { id, name } = flowToDelete;
    try {
      // If you want your backend to handle removing the actual data, pass ?remove=true/false
      const url = `${baseUrl}/nifi/pg/${id}?remove=${
        removeData ? "true" : "false"
      }`;
      await axios.delete(url);
      toast.success(`تم حذف التدفق: ${name}`);

      // remove from local state
      setPgList((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting NiFi process group:", error);
      toast.error("فشل في حذف مجموعة المعالجة من NiFi");
    } finally {
      setFlowToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const handleCreateFlow = async (e) => {
    e.preventDefault();
    if (!selectedCollection) {
      toast.error("يرجى اختيار مجموعة");
      return;
    }
    if (!selectedPG) {
      toast.error("يرجى اختيار مجموعة معالجة");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      const body = {
        collectionName: selectedCollection,
        targetPgId: selectedPG,
        startProcessors,
      };

      // Add optional advanced parameters if provided
      if (showAdvancedOptions) {
        if (dbName) body.dbName = dbName;
        if (mongoUri) body.mongoUri = mongoUri;
        if (solrZk) body.solrZk = solrZk;
      }

      const resp = await axios.post(`${baseUrl}/nifi/flows/auto`, body);

      if (resp.status === 201) {
        const result = resp.data;
        setSuccessMessage(`
          تم إنشاء التدفق بنجاح!
          - مجموعة المعالجة: ${
            result.processGroup?.component?.name || "غير متاح"
          }
          - خدمة MongoDB: ${
            result.controllerService?.component?.name || "غير متاح"
          }
          - GetMongo: ${result.getMongo?.component?.name || "غير متاح"}
          - Jolt Transform: ${
            result.joltTransform?.component?.name || "غير متاح"
          }
          - PutSolr: ${result.putSolr?.component?.name || "غير متاح"}
        `);
        toast.success(`تم إنشاء التدفق "${selectedCollection}" بنجاح`);
        resetForm();
        setShowCreateForm(false);
        fetchPGs(); // Refresh the PG list after creation

        // If a parent wants to know
        if (onSuccess) {
          onSuccess(selectedCollection);
        }
      } else {
        toast.error(`فشل في إنشاء التدفق: ${resp.status}`);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          if (err.response.status === 409) {
            toast.error("التدفق موجود بالفعل. يرجى اختيار اسم آخر.");
          } else {
            toast.error(
              `خطأ من الخادم: ${err.response.data.message || err.message}`
            );
          }
        } else if (err.request) {
          toast.error("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
        } else {
          toast.error(`خطأ: ${err.message}`);
        }
      } else {
        console.error("Error creating NiFi flow:", err);
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCollection("");
    setCustomPGName("");
    setStartProcessors(false);
    setShowAdvancedOptions(false);
    setDbName("");
    setMongoUri("");
    setSolrZk("");
  };

  // Sorting functionality
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort process groups
  const filteredAndSortedPGs = React.useMemo(() => {
    // First, filter the PGs
    let filtered = pgList;
    if (searchTerm) {
      filtered = pgList.filter((pg) =>
        pg.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showCollectionPGsOnly) {
      filtered = filtered.filter((pg) => pg.name.startsWith("PG_"));
    }

    // Then sort them
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
  }, [pgList, searchTerm, sortConfig, showCollectionPGsOnly]);

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
            <Activity className="mr-2 h-6 w-6" />
            إدارة تدفقات NiFi التلقائية
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            إنشاء وإدارة تدفقات معالجة البيانات التلقائية
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
            {showCreateForm ? "إلغاء" : "إنشاء تدفق جديد"}
          </button>

          <button
            onClick={fetchPGs}
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
              إنشاء تدفق جديد
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateFlow} className="space-y-4">
            <div className="mb-3">
              <label className="block mb-2 font-medium text-sm flex items-center">
                <Tag className="ml-2 h-4 w-4" />
                اختر المجموعة:
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              >
                <option value="">-- اختر --</option>
                {collections.map((c) => (
                  <option key={c.collectionName} value={c.collectionName}>
                    {c.displayName || c.collectionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block mb-2 font-medium text-sm flex items-center">
                <Server className="ml-2 h-4 w-4" />
                اختر الـ Process Group الرئيسي:
              </label>
              <select
                value={selectedPG}
                onChange={(e) => setSelectedPG(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              >
                <option value="">-- اختر --</option>
                {pgList.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    {pg.name}
                  </option>
                ))}
              </select>
              {customPGName && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  سيتم إنشاء Process Group فرعي جديد تحت هذه المجموعة باسم:{" "}
                  <span className="font-medium">{customPGName}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  <Settings className="ml-2 h-4 w-4" />
                  الخيارات المتقدمة
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className={`text-sm flex items-center ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {showAdvancedOptions ? (
                    <>
                      <EyeOff className="ml-1 h-4 w-4" />
                      إخفاء
                    </>
                  ) : (
                    <>
                      <Eye className="ml-1 h-4 w-4" />
                      إظهار
                    </>
                  )}
                </button>
              </div>

              {showAdvancedOptions && (
                <div className="mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="mb-3">
                    <label className="block mb-1 text-sm">
                      اسم قاعدة البيانات (اختياري):
                    </label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="يستخدم القيمة الافتراضية من إعدادات النظام"
                      className={`w-full px-4 py-2 border rounded-lg ${themeClasses.input}`}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block mb-1 text-sm">
                      عنوان اتصال MongoDB (اختياري):
                    </label>
                    <input
                      type="text"
                      value={mongoUri}
                      onChange={(e) => setMongoUri(e.target.value)}
                      placeholder="مثال: mongodb://localhost:27017"
                      className={`w-full px-4 py-2 border rounded-lg ${themeClasses.input}`}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block mb-1 text-sm">
                      عنوان Zookeeper لـ Solr (اختياري):
                    </label>
                    <input
                      type="text"
                      value={solrZk}
                      onChange={(e) => setSolrZk(e.target.value)}
                      placeholder="مثال: zookeeper:2181"
                      className={`w-full px-4 py-2 border rounded-lg ${themeClasses.input}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-5 flex items-center">
              <input
                type="checkbox"
                id="startProcessors"
                checked={startProcessors}
                onChange={(e) => setStartProcessors(e.target.checked)}
                className="ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <label htmlFor="startProcessors" className="text-sm">
                تشغيل المعالجات فوراً بعد الإنشاء
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    إنشاء التدفق
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border-r-4 border-green-500 text-green-700 dark:text-green-300 rounded-lg flex items-start">
          <CheckCircle className="h-5 w-5 ml-3 flex-shrink-0 mt-0.5" />
          <div className="whitespace-pre-line">{successMessage}</div>
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
              onClick={fetchPGs}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center w-fit"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Process Groups Table */}
      <div className={`rounded-lg border shadow-md ${themeClasses.card}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center">
            <Server className="ml-2 h-5 w-5" />
            قائمة مجموعات المعالجة الحالية
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCollectionPGsOnly(!showCollectionPGsOnly)}
              // className={`px-3 py-1 rounded-lg text-sm flex items-center border ${
              //   showCollectionPGsOnly
              //     ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-800"
              //     : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700"
              // }`}
              className={`
                px-3 py-1 rounded-lg text-sm flex items-center border
                ${
                  darkMode && showCollectionPGsOnly
                    ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                    : darkMode
                    ? "dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                    : showCollectionPGsOnly
                    ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                    : "bg-green-100 text-green-800 border-green-300"
                }
              `}
            >
              {showCollectionPGsOnly ? (
                <span className="flex items-center">
                  <Eye className="ml-1 h-4 w-4" />
                  عرض جميع المجموعات
                </span>
              ) : (
                <span className="flex items-center">
                  <Eye className="ml-1 h-4 w-4" />
                  عرض مجموعات البيانات فقط
                </span>
              )}
            </button>

            {/* Search Input */}
            <div className="relative w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث عن مجموعة..."
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${themeClasses.input}`}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
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
        </div>

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex justify-center items-center p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                جاري تحميل مجموعات المعالجة...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedPGs.length === 0 && (
          <div className="p-12 text-center">
            <Server className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مجموعات معالجة</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm || showCollectionPGsOnly
                ? "لا توجد مجموعات تطابق معايير البحث"
                : "لم يتم إنشاء أي مجموعات معالجة بعد. أنشئ تدفقك الأول للبدء."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إظهار جميع المجموعات
              </button>
            ) : showCollectionPGsOnly ? (
              <button
                onClick={() => setShowCollectionPGsOnly(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                عرض جميع المجموعات
              </button>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <PlusCircle className="ml-2 h-5 w-5" />
                إنشاء تدفق جديد
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && filteredAndSortedPGs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={themeClasses.tableHeader}>
                <tr>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("name")}
                  >
                    <div className="flex items-center justify-center">
                      اسم المجموعة
                      {sortConfig.key === "name" && (
                        <span className="mr-1">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedPGs.map((pg) => (
                  <tr key={pg.id} className={`${themeClasses.tableRow}`}>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                      <div className="text-sm font-medium">{pg.name}</div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          pg.name.startsWith("PG_")
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {pg.name.startsWith("PG_")
                          ? "مجموعة بيانات"
                          : "مجموعة عامة"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-2 space-x-reverse">
                        {pg.name.startsWith("PG_") ? (
                          <button
                            onClick={() => {
                              setFlowToDelete(pg);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="حذف المجموعة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors">
                            المجموعة العامة
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setFlowToDelete(null);
        }}
        collectionName={flowToDelete?.name || ""}
        onConfirm={confirmDeleteNiFi}
        darkMode={darkMode}
        title="حذف تدفق NiFi"
        mainMessage="هل أنت متأكد أنك تريد حذف التدفق"
      />
    </div>
  );
};

export default NiFiFlowAutoForm;
