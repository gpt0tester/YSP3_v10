
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  PlusCircle,
  Database,
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
} from "lucide-react";
import ApibaseUrl from "../../ApibaseUrl";
import EditMongoCollectionModal from "./EditMongoCollectionModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

const MongoCollectionManager = ({ darkMode, onSuccess }) => {
  const baseUrl = ApibaseUrl;

  const [collections, setCollections] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [collectionName, setCollectionName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [collectionType, setCollectionType] = useState("dynamic");
  const [fields, setFields] = useState([
    { fieldName: "", fieldType: "String" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);

  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [collectionToDrop, setCollectionToDrop] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "collectionName",
    direction: "ascending",
  });

  // Handlers for existing fields
  const handleCollectionNameChange = (e) => setCollectionName(e.target.value);
  const handleDisplayNameChange = (e) => setDisplayName(e.target.value);

  const handleCollectionTypeChange = (e) => {
    setCollectionType(e.target.value);
    if (e.target.value === "dynamic") {
      setFields([]);
    } else if (fields.length === 0) {
      setFields([{ fieldName: "", fieldType: "String" }]);
    }
  };

  const handleFieldChange = (index, e) => {
    const { name, value } = e.target;
    setFields((prev) => {
      const updated = [...prev];
      updated[index][name] = value;
      return updated;
    });
  };

  const addField = () =>
    setFields((prev) => [...prev, { fieldName: "", fieldType: "String" }]);

  const removeField = (index) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const validateForm = () => {
    if (!collectionName.trim()) {
      toast.error("يرجى إدخال اسم المجموعة.");
      return false;
    }
    const collectionNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!collectionNameRegex.test(collectionName)) {
      toast.error(
        "اسم المجموعة غير صالح. استخدم أحرفًا وأرقامًا وشرطات سفلية فقط."
      );
      return false;
    }
    if (!displayName.trim()) {
      toast.error("يرجى إدخال اسم العرض للمجموعة.");
      return false;
    }
    if (collectionType === "predefined") {
      const fieldNames = fields.map((f) => f.fieldName.trim());
      if (fieldNames.includes("")) {
        toast.error("يرجى إدخال جميع أسماء الحقول.");
        return false;
      }
      const uniqueFieldNames = new Set(fieldNames);
      if (uniqueFieldNames.size !== fieldNames.length) {
        toast.error("يجب أن تكون أسماء الحقول فريدة.");
        return false;
      }
    }

    return true;
  };

  const resetForm = () => {
    setCollectionName("");
    setDisplayName("");
    setCollectionType("dynamic");
    setFields([{ fieldName: "", fieldType: "String" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    // Build payload for your backend
    const payload = {
      collectionName,
      displayName,
      fields: collectionType === "dynamic" ? [] : fields,
      collectionType,
    };

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      // Single endpoint to create both:
      //  1) Mongo collection metadata
      const response = await axios.post(
        `${baseUrl}/collections/create-mongo`,
        payload
      );

      if (response.status === 201) {
        // Reset fields
        resetForm();
        fetchCollections();
        setShowCreateForm(false);

        toast.success(`تم إنشاء المجموعة "${displayName}" بنجاح`);

        // If a parent wants to know
        if (onSuccess) {
          onSuccess(collectionName);
        }
      } else {
        toast.error("فشل في إنشاء المجموعة.");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          if (error.response.status === 409) {
            toast.error("المجموعة موجودة بالفعل. يرجى اختيار اسم آخر.");
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
        console.error("خطأ في إنشاء المجموعة:", error);
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------ 1) FETCH MONGO COLLECTIONS ------------------

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/collections`);
      // Expect: { collections: [...] }
      setCollections(res.data.collections || []);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("فشل في جلب المجموعات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // ------------------ 2) DELETE MONGO COLLECTION ------------------------------------
  const handleDeleteMongo = (col) => {
    // store the entire 'col' or just the _id and name
    setCollectionToDelete(col);
    setDeleteModalOpen(true);
  };

  const confirmDeleteMongo = async (dropData) => {
    if (!collectionToDelete) return;

    const { _id, collectionName } = collectionToDelete;
    try {
      // If you want your backend to handle dropping the actual data, pass ?drop=true/false
      const url = `${baseUrl}/collections/${_id}/mongo?drop=${
        dropData ? "true" : "false"
      }`;
      await axios.delete(url);
      toast.success(`تم حذف المجموعة: ${collectionName}`);

      // remove from local state
      setCollections((prev) => prev.filter((c) => c._id !== _id));
    } catch (error) {
      console.error("Error deleting mongo collection:", error);
      toast.error("فشل في حذف المجموعة من MongoDB");
    } finally {
      setCollectionToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // ------------------ 2) Drop MONGO COLLECTION ------------------------------------

  const handleDropCollectionClick = (col) => {
    setCollectionToDrop(col);
    setDropModalOpen(true);
  };

  // Updated confirmDropCollection function
  const confirmDropCollection = async () => {
    if (!collectionToDrop) return;

    try {
      const { collectionName } = collectionToDrop;
      const url = `${baseUrl}/collections/${collectionName}/drop`;

      const response = await axios.delete(url);

      if (response.status === 200) {
        toast.success(
          `تم حذف بيانات المجموعة "${collectionName}" مع الاحتفاظ بالهيكل`
        );
        // Refresh collections to show updated status
        fetchCollections();
      } else {
        toast.error(
          `حدث خطأ: ${response.data.message || "فشل في حذف بيانات المجموعة"}`
        );
      }
    } catch (error) {
      console.error("Error dropping collection:", error);
      let errorMessage = "فشل في حذف بيانات المجموعة";

      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = `خطأ: ${error.response.data.message || error.message}`;
        } else if (error.request) {
          errorMessage =
            "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
        }
      }

      toast.error(errorMessage);
    } finally {
      setCollectionToDrop(null);
      setDropModalOpen(false);
    }
  };

  // ------------------ 2) EDIT MONGO COLLECTION ------------------------------------
  const startEditing = (col) => {
    setCollectionToEdit(col);
    setEditModalOpen(true);
  };

  const handleEditSuccess = (updated) => {
    setEditModalOpen(false);
    setCollectionToEdit(null);
    setCollections((prev) =>
      prev.map((c) => (c._id === updated._id ? updated : c))
    );
    toast.success(`تم تحديث معلومات المجموعة: ${updated.displayName}`);
  };

  // Sorting functionality
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort collections
  const filteredAndSortedCollections = React.useMemo(() => {
    // First, filter the collections
    let filtered = collections;
    if (searchTerm) {
      filtered = collections.filter(
        (col) =>
          col.collectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  }, [collections, searchTerm, sortConfig]);

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
            <Database className="mr-2 h-6 w-6" />
            إدارة مجموعات MongoDB
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            إنشاء وإدارة مجموعات قواعد البيانات
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
            {showCreateForm ? "إلغاء" : "إنشاء مجموعة جديدة"}
          </button>

          <button
            onClick={fetchCollections}
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
              إنشاء مجموعة جديدة
            </h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Collection Name */}
              <div>
                <label className="block mb-2 font-medium text-sm flex items-center">
                  <Key className="ml-2 h-4 w-4" />
                  اسم المجموعة (للاستخدام الداخلي):
                </label>
                <input
                  type="text"
                  value={collectionName}
                  onChange={handleCollectionNameChange}
                  required
                  placeholder="collection_name"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  استخدم الأحرف الإنجليزية والأرقام والشرطات السفلية فقط
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block mb-2 font-medium text-sm flex items-center">
                  <Tag className="ml-2 h-4 w-4" />
                  اسم العرض للمجموعة:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  required
                  placeholder="الاسم المعروض"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  الاسم المعروض للمستخدمين في واجهة المستخدم
                </p>
              </div>
            </div>

            {/* Collection Type */}
            <div>
              <label className="block mb-2 font-medium text-sm flex items-center">
                <FileType className="ml-2 h-4 w-4" />
                نوع المجموعة:
              </label>
              <div className="flex flex-wrap gap-4">
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                    ${
                      darkMode && collectionType === "predefined"
                        ? "border-blue-500 bg-blue-900/30 text-blue-100"
                        : darkMode
                        ? "border-gray-700 bg-gray-800/30 text-blue-200 hover:bg-blue-700/20"
                        : collectionType === "predefined"
                        ? "border-blue-500 bg-blue-100 text-blue-700"
                        : "border-gray-300 hover:bg-blue-100/30"
                    }`}
                >
                  <input
                    type="radio"
                    name="collectionType"
                    value="predefined"
                    checked={collectionType === "predefined"}
                    onChange={handleCollectionTypeChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">حقول محددة مسبقًا</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      تحديد هيكل البيانات مع حقول معرفة مسبقًا
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                    ${
                      darkMode && collectionType === "dynamic"
                        ? "border-blue-500 bg-blue-900/30 text-blue-100"
                        : darkMode
                        ? "border-gray-700 bg-gray-800/30 text-blue-200 hover:bg-blue-700/20"
                        : collectionType === "dynamic"
                        ? "border-blue-500 bg-blue-100 text-blue-700"
                        : "border-gray-300 hover:bg-blue-100/30"
                    }`}
                >
                  <input
                    type="radio"
                    name="collectionType"
                    value="dynamic"
                    checked={collectionType === "dynamic"}
                    onChange={handleCollectionTypeChange}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">ديناميكي</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      هيكل بيانات مرن بدون حقول محددة مسبقًا
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Fields (only if predefined) */}
            {collectionType === "predefined" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <List className="ml-2 h-5 w-5" />
                    الحقول:
                  </h3>
                  <button
                    type="button"
                    onClick={addField}
                    className={`px-3 py-1 rounded-md flex items-center ${themeClasses.button.success}`}
                  >
                    <Plus className="ml-1 h-4 w-4" />
                    إضافة حقل
                  </button>
                </div>

                <div className="space-y-3 mt-2">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg grid grid-cols-1 md:grid-cols-5 gap-3 items-center ${
                        darkMode ? "bg-gray-800/50" : "bg-gray-50"
                      }`}
                    >
                      <div className="md:col-span-3">
                        <label className="block mb-1 text-xs font-medium">
                          اسم الحقل:
                        </label>
                        <input
                          type="text"
                          name="fieldName"
                          value={field.fieldName}
                          onChange={(e) => handleFieldChange(index, e)}
                          placeholder="field_name"
                          required
                          className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="block mb-1 text-xs font-medium">
                          نوع الحقل:
                        </label>
                        <select
                          name="fieldType"
                          value={field.fieldType}
                          onChange={(e) => handleFieldChange(index, e)}
                          className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                        >
                          <option value="String">نص</option>
                          <option value="Number">رقم</option>
                          <option value="Boolean">قيمة منطقية</option>
                          <option value="Date">تاريخ</option>
                        </select>
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className={`px-3 py-2 rounded-md ${themeClasses.button.danger}`}
                            title="إزالة الحقل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    إنشاء المجموعة
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
              onClick={fetchCollections}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center w-fit"
            >
              <RefreshCw className="ml-1 h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <div className={`rounded-lg border shadow-md ${themeClasses.card}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <h2 className="text-xl font-semibold flex items-center">
            <Database className="ml-2 h-5 w-5" />
            المجموعات المتاحة
          </h2>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
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

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex justify-center items-center p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                جاري تحميل المجموعات...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedCollections.length === 0 && (
          <div className="p-12 text-center">
            <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مجموعات</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm
                ? "لا توجد مجموعات تطابق معايير البحث"
                : "لم يتم إنشاء أي مجموعات بعد. أنشئ مجموعتك الأولى للبدء."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                إظهار جميع المجموعات
              </button>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <PlusCircle className="ml-2 h-5 w-5" />
                إنشاء مجموعة جديدة
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
                      اسم المجموعة
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

                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("collectionType")}
                  >
                    <div className="flex items-center justify-center">
                      النوع
                      {sortConfig.key === "collectionType" && (
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
                {filteredAndSortedCollections.map((col) => (
                  <tr
                    key={col._id}
                    className={`${themeClasses.tableRow} ${
                      darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                      <div className="text-sm font-medium">
                        {col.collectionName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                      {col.displayName}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          col.collectionType === "dynamic"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                        }`}
                      >
                        {col.collectionType === "dynamic"
                          ? "ديناميكي"
                          : "محدد مسبقًا"}
                      </span>
                    </td>
                    {/* Updated table cell with corrected drop collection handler */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => startEditing(col)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="تعديل المجموعة"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDropCollectionClick(col)}
                          className="p-1.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30 rounded transition-colors"
                          title="حذف البيانات مع الاحتفاظ بالهيكل"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMongo(col)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="حذف المجموعة"
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

      {/* Edit modal */}
      <EditMongoCollectionModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        collection={collectionToEdit}
        baseUrl={baseUrl}
        onSaveSuccess={handleEditSuccess}
        darkMode={darkMode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCollectionToDelete(null);
        }}
        collectionName={collectionToDelete?.collectionName || ""}
        onConfirm={confirmDeleteMongo}
        darkMode={darkMode}
        isMongoManager={true}
        mainMessage="حذف مجموعة البيانات"
        optionalActionMessage="هل تريد تفريع مجموعة البيانات أيضاً؟"
        optionalActionLabel="أزل البيانات بالكامل (drop collection)"
        optionalActionWarning="تحذير: هذا سيحذف جميع البيانات في المجموعة بشكل دائم."
      />

      {/* Drop Collection Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={dropModalOpen}
        onClose={() => {
          setDropModalOpen(false);
          setCollectionToDrop(null);
        }}
        collectionName={collectionToDrop?.collectionName || ""}
        onConfirm={confirmDropCollection}
        darkMode={darkMode}
        isMongoManager={false} // Set to false to hide the optional action message
        title="تفريغ مجموعة البيانات"
        mainMessage="هل أنت متأكد من رغبتك في حذف جميع البيانات من مجموعة"
        detailMessage="سيؤدي هذا إلى حذف جميع البيانات من المجموعة مع الاحتفاظ بهيكل المجموعة ومعلوماتها."
      />
    </div>
  );
};

export default MongoCollectionManager;