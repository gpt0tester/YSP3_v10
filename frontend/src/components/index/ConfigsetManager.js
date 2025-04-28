import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  UploadCloud,
  FileType,
  Link,
  Save,
  X,
  AlertTriangle,
  Loader,
  CheckCircle,
  Copy,
  Package,
  PlusCircle,
  Layers,
  Edit3,
  AlertCircle,
} from "lucide-react";
import ApibaseUrl from "../../ApibaseUrl";

// Confirmation Modal component
const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  darkMode,
}) => {
  if (!isOpen) return null;

  const themeClasses = {
    overlay:
      "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50",
    modal: darkMode
      ? "bg-gray-800 border border-gray-700 text-gray-100"
      : "bg-white border border-gray-200 text-gray-800",
    button: {
      confirm: "bg-red-600 text-white hover:bg-red-700",
      cancel: darkMode
        ? "bg-gray-700 text-gray-100 hover:bg-gray-600 border-gray-600"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300",
    },
  };

  return (
    <div className={themeClasses.overlay} onClick={onCancel}>
      <div
        className={`${themeClasses.modal} p-6 rounded-lg shadow-xl max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
          {title}
        </h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end space-x-3 space-x-reverse">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg border ${themeClasses.button.cancel}`}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg ${themeClasses.button.confirm}`}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};

// Property adder component
const PropertyAdder = ({ darkMode, onAdd, themeClasses }) => {
  const [propKey, setPropKey] = useState("");
  const [propVal, setPropVal] = useState("");

  const handleAdd = () => {
    if (!propKey.trim()) return;
    onAdd(propKey.trim(), propVal.trim());
    setPropKey("");
    setPropVal("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 mt-2">
      <div className="flex-1">
        <input
          type="text"
          placeholder="اسم الخاصية"
          value={propKey}
          onChange={(e) => setPropKey(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
        />
      </div>
      <div className="flex-1">
        <input
          type="text"
          placeholder="قيمة الخاصية"
          value={propVal}
          onChange={(e) => setPropVal(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!propKey.trim()}
        className={`px-4 py-2 rounded-lg flex items-center ${
          !propKey.trim() ? "opacity-50 cursor-not-allowed" : ""
        } ${themeClasses.button.primary}`}
      >
        <Plus className="ml-1 h-4 w-4" />
        إضافة
      </button>
    </div>
  );
};

const ConfigsetManager = ({ darkMode }) => {
  const baseUrl = ApibaseUrl;

  // Data states
  const [configSets, setConfigSets] = useState([]);
  const [mode, setMode] = useState("base"); // "base" or "upload"
  const [name, setName] = useState("");
  const [baseConfigSet, setBaseConfigSet] = useState("_default");
  const [zipFile, setZipFile] = useState(null);
  const [propertyMap, setPropertyMap] = useState({});

  // UI states
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch configsets
  const fetchConfigSets = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const resp = await axios.get(`${baseUrl}/solr/configset/list`);
      if (resp.data?.configSets) {
        setConfigSets(resp.data.configSets);
      } else {
        setConfigSets([]);
      }
    } catch (error) {
      console.error("Error listing configsets:", error);
      setError("فشل في جلب قائمة الـ Configsets. يرجى المحاولة مرة أخرى.");
      toast.error("فشل في جلب قائمة الـ Configsets");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchConfigSets();
  }, []);

  // Create configset
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("اسم الـ Configset مطلوب");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", name);

      if (mode === "base") {
        // Add baseConfigSet
        formData.append("baseConfigSet", baseConfigSet);

        // Add properties
        Object.keys(propertyMap).forEach((k) => {
          formData.append(`configSetProp.${k}`, propertyMap[k]);
        });
      } else {
        // Upload mode
        if (!zipFile) {
          toast.error("يرجى اختيار ملف ZIP للرفع");
          setLoading(false);
          return;
        }
        formData.append("configZip", zipFile);
      }

      const resp = await axios.post(
        `${baseUrl}/solr/configset/create`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(resp.data.message || "تم إنشاء الـ Configset بنجاح");

      // Reset form
      setName("");
      setZipFile(null);
      setPropertyMap({});
      setShowCreateForm(false);

      // Refresh configsets
      fetchConfigSets();
    } catch (error) {
      console.error("Error creating configset:", error);
      setError("فشل في إنشاء الـ Configset. يرجى المحاولة مرة أخرى.");
      toast.error("فشل في إنشاء الـ Configset");
    } finally {
      setLoading(false);
    }
  };

  // Delete configset
  const handleDeleteConfigSet = (cfgName) => {
    setConfirmDelete(cfgName);
  };

  const confirmDeleteConfigSet = async () => {
    if (!confirmDelete) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await axios.delete(
        `${baseUrl}/solr/configset/delete/${confirmDelete}`
      );
      toast.success(
        resp.data.message || `تم حذف الـ Configset '${confirmDelete}' بنجاح`
      );

      // Refresh configsets
      fetchConfigSets();
    } catch (error) {
      console.error("Error deleting configset:", error);
      setError("فشل في حذف الـ Configset. يرجى المحاولة مرة أخرى.");
      toast.error("فشل في حذف الـ Configset");
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setName("");
    setBaseConfigSet("_default");
    setZipFile(null);
    setPropertyMap({});
    setMode("base");
  };

  // Handle property changes
  const handlePropertyChange = (propKey, value) => {
    setPropertyMap((prev) => ({ ...prev, [propKey]: value }));
  };

  const removeProperty = (propKey) => {
    setPropertyMap((prev) => {
      const newMap = { ...prev };
      delete newMap[propKey];
      return newMap;
    });
  };

  // Filter configsets based on search
  const filteredConfigSets = searchTerm
    ? configSets.filter((cs) =>
        cs.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : configSets;

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
    radio: darkMode
      ? "text-blue-500 border-gray-600 bg-gray-700"
      : "text-blue-600 border-gray-300 bg-white",
  };

  return (
    <div dir="rtl" className={`p-6 ${themeClasses.container}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Settings className="mr-2 h-6 w-6" />
            إدارة الـ Configsets في Solr
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            إنشاء وإدارة إعدادات فهارس Solr
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
            {showCreateForm ? "إلغاء" : "إنشاء Configset جديد"}
          </button>

          <button
            onClick={fetchConfigSets}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.ghost} border`}
          >
            <RefreshCw
              className={`ml-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
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
              إنشاء Configset جديد
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Configset Name */}
            <div>
              <label className="block mb-2 font-medium text-sm flex items-center">
                <FileType className="ml-2 h-4 w-4" />
                اسم الـ Configset الجديد:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسم الـ Configset"
                required
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                اسم فريد للـ Configset الذي ستقوم بإنشائه
              </p>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block mb-2 font-medium text-sm">
                أسلوب الإنشاء:
              </label>
              <div className="flex flex-wrap gap-4">
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                  ${
                    darkMode && mode === "base"
                      ? "border-blue-500 bg-blue-900/30 text-blue-100"
                      : darkMode
                      ? "border-gray-700 bg-gray-800/30 text-blue-200 hover:bg-blue-700/20"
                      : mode === "base"
                      ? "border-blue-500 bg-blue-100 text-blue-700"
                      : "border-gray-300 hover:bg-blue-100/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="base"
                    checked={mode === "base"}
                    onChange={() => setMode("base")}
                    className={`mr-2 h-4 w-4 ${themeClasses.radio}`}
                  />
                  <div>
                    <div className="font-medium flex items-center">
                      <Copy className="ml-2 h-4 w-4" />
                      استنادًا إلى Base Configset
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      إنشاء Configset جديد بناءً على قالب موجود
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                    ${
                      darkMode && mode === "upload"
                        ? "border-blue-500 bg-blue-900/30 text-blue-100"
                        : darkMode
                        ? "border-gray-700 bg-gray-800/30 text-blue-200 hover:bg-blue-700/20"
                        : mode === "upload"
                        ? "border-blue-500 bg-blue-100 text-blue-700"
                        : "border-gray-300 hover:bg-blue-100/30"
                    }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="upload"
                    checked={mode === "upload"}
                    onChange={() => setMode("upload")}
                    className={`mr-2 h-4 w-4 ${themeClasses.radio}`}
                  />
                  <div>
                    <div className="font-medium flex items-center">
                      <UploadCloud className="ml-2 h-4 w-4" />
                      رفع ملف ZIP
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      رفع ملف ZIP يحتوي على إعدادات Configset
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Base Configset Options */}
            {mode === "base" && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium text-sm flex items-center">
                    <Link className="ml-2 h-4 w-4" />
                    Base Configset:
                  </label>
                  <input
                    type="text"
                    value={baseConfigSet}
                    onChange={(e) => setBaseConfigSet(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    (افتراضيًا يتم النسخ من _default إذا لم يتم تحديد قيمة)
                  </p>
                </div>

                {/* Properties Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium text-sm flex items-center">
                      <Edit3 className="ml-2 h-4 w-4" />
                      خصائص إضافية (اختيارية):
                    </label>
                  </div>

                  {Object.keys(propertyMap).length > 0 ? (
                    <div
                      className={`border rounded-lg p-3 mb-3 ${
                        darkMode ? "bg-gray-800/50" : "bg-gray-50"
                      }`}
                    >
                      {Object.keys(propertyMap).map((k) => (
                        <div
                          key={k}
                          className={`flex justify-between items-center py-2 border-b last:border-b-0 ${
                            darkMode ? "border-gray-700" : "border-gray-200"
                          }`}
                        >
                          <div className="flex-1">
                            <span className="font-mono text-sm">{k}</span>
                            <span className="mx-2 text-gray-400">=</span>
                            <span className="font-mono text-sm">
                              {propertyMap[k]}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProperty(k)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`text-center py-3 border rounded-lg ${
                        darkMode
                          ? "bg-gray-800/50 text-gray-400"
                          : "bg-gray-50 text-gray-500"
                      }  text-sm mb-3`}
                    >
                      لم يتم إضافة أي خصائص بعد
                    </div>
                  )}

                  <PropertyAdder
                    darkMode={darkMode}
                    onAdd={(propKey, propVal) =>
                      handlePropertyChange(propKey, propVal)
                    }
                    themeClasses={themeClasses}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    يمكنك إضافة خصائص مخصصة للـ Configset مثل property.X=Y
                  </p>
                </div>
              </div>
            )}

            {/* Upload Options */}
            {mode === "upload" && (
              <div>
                <label className="block mb-2 font-medium text-sm flex items-center">
                  <Package className="ml-2 h-4 w-4" />
                  رفع ملف ZIP:
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center ${themeClasses.input} hover:border-blue-500 transition-colors cursor-pointer`}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files[0])}
                    className="hidden"
                    id="zip-file-input"
                  />
                  <label htmlFor="zip-file-input" className="cursor-pointer">
                    {zipFile ? (
                      <div className="flex flex-col items-center">
                        <Package className="h-8 w-8 text-blue-500 mb-2" />
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {zipFile.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {(zipFile.size / 1024).toFixed(2)} KB
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
                        <span className="font-medium">
                          اضغط لاختيار ملف ZIP
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          يجب أن يحتوي الملف على هيكل Configset صالح
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
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
                disabled={loading || (mode === "upload" && !zipFile)}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                  loading || (mode === "upload" && !zipFile)
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } ${themeClasses.button.primary}`}
              >
                {loading ? (
                  <>
                    <Loader className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="ml-2 h-4 w-4" />
                    إنشاء Configset
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
              onClick={fetchConfigSets}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center w-fit"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Configsets List */}
      <div className={`rounded-lg border shadow-md ${themeClasses.card}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center">
            <Layers className="ml-2 h-5 w-5" />
            قائمة الـ Configsets المتاحة
          </h2>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث عن configset..."
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

        {/* Loading State */}
        {isRefreshing && (
          <div className="flex justify-center items-center p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                جاري تحميل الـ Configsets...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isRefreshing && filteredConfigSets.length === 0 && (
          <div className="p-12 text-center">
            <Settings className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد Configsets</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "لا توجد configsets تطابق معايير البحث"
                : "لم يتم إنشاء أي configsets بعد. أنشئ أول configset للبدء."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إظهار جميع الـ Configsets
              </button>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <PlusCircle className="ml-2 h-5 w-5" />
                إنشاء Configset جديد
              </button>
            )}
          </div>
        )}

        {/* Configsets Grid */}
        {!isRefreshing && filteredConfigSets.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConfigSets.map((configSet) => (
                <div
                  key={configSet}
                  className={`p-4 rounded-lg border ${themeClasses.card} hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{configSet}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Solr ConfigSet
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteConfigSet(configSet)}
                      className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="حذف الـ Configset"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Helper text */}
                  <div
                    className={`mt-4 p-3 rounded-lg text-xs text-gray-500 dark:text-gray-400 flex items-start ${themeClasses.card}`}
                  >
                    <AlertCircle className="h-4 w-4 ml-2 flex-shrink-0 mt-0.5 text-blue-500" />
                    يستخدم هذا الـ Configset لتعريف الحقول والإعدادات للفهارس
                    المرتبطة به
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="حذف Configset"
        message={`هل أنت متأكد من أنك تريد حذف الـ Configset "${confirmDelete}"؟ هذا الإجراء لا يمكن التراجع عنه وقد يؤثر على الفهارس المرتبطة به.`}
        onConfirm={confirmDeleteConfigSet}
        onCancel={() => setConfirmDelete(null)}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ConfigsetManager;
