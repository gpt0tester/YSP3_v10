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
  Code,
  Settings,
  Search,
  Copy,
  Layers,
  Filter,
  Server,
} from "lucide-react";
import ApibaseUrl from "../../ApibaseUrl";
import FieldTypeCreator from "./FieldTypeCreator";
import EditSchemaItemModal from "./EditSchemaItemModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

const SolrSchemaManager = ({ darkMode }) => {
  const baseUrl = ApibaseUrl;

  // Collections state
  const [solrCollections, setSolrCollections] = useState([]);
  const [selectedSolrCollection, setSelectedSolrCollection] = useState("");
  const [activeComponent, setActiveComponent] = useState("");
  // can be "fields", "fieldTypes", "dynamicFields", "copyFields"

  // General state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============ STATES FOR "FIELDS" ============
  const [fields, setFields] = useState([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("");
  const [indexed, setIndexed] = useState(true);
  const [stored, setStored] = useState(true);
  const [multiValued, setMultiValued] = useState(false);
  const [includeInQf, setIncludeInQf] = useState(false);
  const [includeInFl, setIncludeInFl] = useState(false);

  // ============ STATES FOR "FIELDTYPES" ============
  const [fieldTypes, setFieldTypes] = useState([]);

  // ============ STATES FOR "DYNAMICFIELDS" ============
  const [dynamicFields, setDynamicFields] = useState([]);
  const [dynName, setDynName] = useState("*_txt");
  const [dynType, setDynType] = useState("");
  const [dynIndexed, setDynIndexed] = useState(true);
  const [dynStored, setDynStored] = useState(true);
  const [dynMultiValued, setDynMultiValued] = useState(false);

  // ============ STATES FOR "COPYFIELDS" ============
  const [copyFields, setCopyFields] = useState([]);
  const [copySource, setCopySource] = useState("");
  const [copyDest, setCopyDest] = useState("");
  const [copyMaxChars, setCopyMaxChars] = useState("");

  // ============ STATES FOR "Edit" ============
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSchemaType, setEditSchemaType] = useState("");
  const [editItem, setEditItem] = useState(null);

  // ============ Delete modal state ============
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ============ Sorting functionality ============
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });

  function openEditModal(schemaType, item) {
    setEditSchemaType(schemaType);
    setEditItem(item);
    setEditModalOpen(true);
  }

  // ------------------ 1) FETCH ALL COLLECTIONS ------------------
  const fetchSolrCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${baseUrl}/solr/collections`);
      setSolrCollections(response.data.collections || []);
    } catch (error) {
      console.error("Error listing Solr collections:", error);
      setError("فشل في جلب مجموعات Solr. يرجى المحاولة مرة أخرى.");
      toast.error("Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================= FIELDS =========================

  // GET existing fields from a collection
  const fetchFields = async () => {
    if (!selectedSolrCollection) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${baseUrl}/solr/${selectedSolrCollection}/fields`
      );
      setFields(response.data || []);
    } catch (error) {
      console.error("Error fetching fields:", error);
      setError("فشل في جلب الحقول. يرجى المحاولة مرة أخرى.");
      toast.error("Failed to load fields");
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE a new field
  const createField = async (e) => {
    e.preventDefault();
    if (!selectedSolrCollection) {
      toast.info("يرجى اختيار مجموعة أولاً");
      return;
    }
    if (!fieldName.trim()) {
      toast.error("اسم الحقل مطلوب");
      return;
    }
    if (!fieldType.trim()) {
      toast.error("يرجى اختيار نوع الحقل");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage("");
    try {
      await axios.post(`${baseUrl}/solr/${selectedSolrCollection}/fields`, {
        name: fieldName,
        type: fieldType,
        indexed,
        stored,
        multiValued,
      });
      toast.success(`تم إنشاء الحقل '${fieldName}' بنجاح`);
      // reset
      resetFieldForm();
      setShowCreateForm(false);
      fetchFields();
    } catch (error) {
      console.error("Error creating field:", error);
      toast.error(
        `خطأ في إنشاء الحقل: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE a field
  const deleteField = async () => {
    if (!selectedSolrCollection || !itemToDelete) return;

    const name = itemToDelete.name;
    setIsLoading(true);
    try {
      await axios.delete(
        `${baseUrl}/solr/${selectedSolrCollection}/fields/${name}`
      );
      toast.success(`تم حذف الحقل '${name}'`);
      fetchFields();
    } catch (error) {
      console.error("Error deleting field:", error);
      toast.error(
        `خطأ في حذف الحقل: ${error.response?.data?.message || error.message}`
      );
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // ========================= FIELDTYPES =========================

  // GET field types
  const fetchFieldTypes = async () => {
    if (!selectedSolrCollection) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${baseUrl}/solr/${selectedSolrCollection}/fieldTypes`
      );
      setFieldTypes(response.data || []);
    } catch (error) {
      console.error("Error fetching fieldTypes:", error);
      setError("فشل في جلب أنواع الحقول. يرجى المحاولة مرة أخرى.");
      toast.error("Failed to load field types");
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE field type
  const createFieldType = async (fieldTypeObj) => {
    if (!selectedSolrCollection) {
      toast.info("يرجى اختيار مجموعة أولاً");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage("");
    try {
      const payload = {
        "add-field-type": [fieldTypeObj],
      };

      await axios.post(
        `${baseUrl}/solr/${selectedSolrCollection}/fieldTypes`,
        payload
      );

      toast.success(`تم إنشاء نوع الحقل '${fieldTypeObj.name}' بنجاح`);
      setShowCreateForm(false);
      fetchFieldTypes();
    } catch (error) {
      console.error("Error creating fieldType:", error);
      toast.error(
        `خطأ في إنشاء نوع الحقل: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE field type
  const deleteFieldType = async () => {
    if (!selectedSolrCollection || !itemToDelete) return;

    const typeName = itemToDelete.name;
    setIsLoading(true);
    try {
      await axios.delete(
        `${baseUrl}/solr/${selectedSolrCollection}/fieldTypes/${typeName}`
      );
      toast.success(`تم حذف نوع الحقل '${typeName}'`);
      fetchFieldTypes();
    } catch (error) {
      console.error("Error deleting fieldType:", error);
      toast.error(
        `خطأ في حذف نوع الحقل: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // ========================= DYNAMICFIELDS =========================

  const fetchDynamicFields = async () => {
    if (!selectedSolrCollection) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${baseUrl}/solr/${selectedSolrCollection}/dynamicFields`
      );
      setDynamicFields(response.data || []);
    } catch (error) {
      console.error("Error fetching dynamicFields:", error);
      setError("فشل في جلب الحقول الديناميكية. يرجى المحاولة مرة أخرى.");
      toast.error("Failed to load dynamic fields");
    } finally {
      setIsLoading(false);
    }
  };

  const createDynamicField = async (e) => {
    e.preventDefault();
    if (!selectedSolrCollection) {
      toast.info("يرجى اختيار مجموعة أولاً");
      return;
    }
    if (!dynName.trim()) {
      toast.error("اسم الحقل الديناميكي مطلوب");
      return;
    }
    if (!dynType.trim()) {
      toast.error("يرجى اختيار نوع الحقل للحقل الديناميكي");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage("");
    try {
      await axios.post(
        `${baseUrl}/solr/${selectedSolrCollection}/dynamicFields`,
        {
          name: dynName,
          type: dynType,
          indexed: dynIndexed,
          stored: dynStored,
          multiValued: dynMultiValued,
        }
      );
      toast.success(`تم إنشاء الحقل الديناميكي '${dynName}' بنجاح`);
      // reset
      resetDynamicFieldForm();
      setShowCreateForm(false);
      fetchDynamicFields();
    } catch (error) {
      console.error("Error creating dynamicField:", error);
      toast.error(
        `خطأ في إنشاء الحقل الديناميكي: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDynamicField = async () => {
    if (!selectedSolrCollection || !itemToDelete) return;

    const dynFieldName = itemToDelete.name;
    setIsLoading(true);
    try {
      await axios.delete(
        `${baseUrl}/solr/${selectedSolrCollection}/dynamicFields/${dynFieldName}`
      );
      toast.success(`تم حذف الحقل الديناميكي '${dynFieldName}'`);
      fetchDynamicFields();
    } catch (error) {
      console.error("Error deleting dynamicField:", error);
      toast.error(
        `خطأ في حذف الحقل الديناميكي: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // ========================= COPYFIELDS =========================

  const fetchCopyFields = async () => {
    if (!selectedSolrCollection) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${baseUrl}/solr/${selectedSolrCollection}/copyFields`
      );
      setCopyFields(response.data || []);
    } catch (error) {
      console.error("Error fetching copyFields:", error);
      setError("فشل في جلب حقول النسخ. يرجى المحاولة مرة أخرى.");
      toast.error("Failed to load copy fields");
    } finally {
      setIsLoading(false);
    }
  };

  const createCopyField = async (e) => {
    e.preventDefault();
    if (!selectedSolrCollection) {
      toast.info("يرجى اختيار مجموعة أولاً");
      return;
    }
    if (!copySource.trim()) {
      toast.error("مصدر حقل النسخ مطلوب");
      return;
    }
    if (!copyDest.trim()) {
      toast.error("وجهة حقل النسخ مطلوبة");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage("");
    try {
      await axios.post(`${baseUrl}/solr/${selectedSolrCollection}/copyFields`, {
        source: copySource,
        dest: copyDest,
        ...(copyMaxChars ? { maxChars: Number(copyMaxChars) } : {}),
      });
      toast.success(
        `تم إنشاء حقل النسخ من '${copySource}' إلى '${copyDest}' بنجاح`
      );
      // reset
      resetCopyFieldForm();
      setShowCreateForm(false);
      fetchCopyFields();
    } catch (error) {
      console.error("Error creating copyField:", error);
      toast.error(
        `خطأ في إنشاء حقل النسخ: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCopyField = async () => {
    if (!selectedSolrCollection || !itemToDelete) return;

    const { source, dest } = itemToDelete;
    setIsLoading(true);
    try {
      await axios.delete(
        `${baseUrl}/solr/${selectedSolrCollection}/copyFields`,
        {
          data: { source, dest },
        }
      );
      toast.success(`تم حذف حقل النسخ من '${source}' إلى '${dest}'`);
      fetchCopyFields();
    } catch (error) {
      console.error("Error deleting copyField:", error);
      toast.error(
        `خطأ في حذف حقل النسخ: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // Filter function for search
  const filterItems = (items, term) => {
    if (!term) return items;
    return items.filter((item) => {
      if (typeof item === "string") {
        return item.toLowerCase().includes(term.toLowerCase());
      }

      // Check all string properties for a match
      return Object.values(item).some(
        (val) =>
          typeof val === "string" &&
          val.toLowerCase().includes(term.toLowerCase())
      );
    });
  };

  // Reset form functions
  const resetFieldForm = () => {
    setFieldName("");
    setFieldType("");
    setIndexed(true);
    setStored(true);
    setMultiValued(false);
    setIncludeInQf(false);
    setIncludeInFl(false);
  };

  const resetDynamicFieldForm = () => {
    setDynName("*_txt");
    setDynType("");
    setDynIndexed(true);
    setDynStored(true);
    setDynMultiValued(false);
  };

  const resetCopyFieldForm = () => {
    setCopySource("");
    setCopyDest("");
    setCopyMaxChars("");
  };

  // ------------------ Effects ------------------
  useEffect(() => {
    fetchSolrCollections(); // fetch available Solr collections on mount
  }, []);

  // When the user selects a collection, fetch fieldTypes
  useEffect(() => {
    if (selectedSolrCollection) {
      fetchFieldTypes(); // to populate dropdowns
    }
  }, [selectedSolrCollection]);

  // If we reselect a component, fetch from the appropriate route:
  useEffect(() => {
    if (!selectedSolrCollection) return;
    switch (activeComponent) {
      case "fields":
        fetchFields();
        break;
      case "fieldTypes":
        fetchFieldTypes();
        break;
      case "dynamicFields":
        fetchDynamicFields();
        break;
      case "copyFields":
        fetchCopyFields();
        break;
      default:
        break;
    }
  }, [activeComponent, selectedSolrCollection]);

  // Get the items to display based on current active component and search term
  const getFilteredItems = () => {
    let items = [];
    switch (activeComponent) {
      case "fields":
        items = fields;
        break;
      case "fieldTypes":
        items = fieldTypes;
        break;
      case "dynamicFields":
        items = dynamicFields;
        break;
      case "copyFields":
        items = copyFields;
        break;
      default:
        items = [];
        break;
    }

    // Filter by search term
    items = filterItems(items, searchTerm);

    // Sort items
    return [...items].sort((a, b) => {
      if (!sortConfig.key) return 0;

      const aValue = a[sortConfig.key] || "";
      const bValue = b[sortConfig.key] || "";

      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredItems = getFilteredItems();

  // Sorting functionality
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Component title & icon based on active component
  const getComponentInfo = () => {
    switch (activeComponent) {
      case "fields":
        return { title: "الحقول", icon: <Tag className="ml-2 h-5 w-5" /> };
      case "fieldTypes":
        return {
          title: "أنواع الحقول",
          icon: <FileType className="ml-2 h-5 w-5" />,
        };
      case "dynamicFields":
        return {
          title: "الحقول الديناميكية",
          icon: <Layers className="ml-2 h-5 w-5" />,
        };
      case "copyFields":
        return { title: "حقول النسخ", icon: <Copy className="ml-2 h-5 w-5" /> };
      default:
        return {
          title: "مكونات Solr Schema",
          icon: <Database className="ml-2 h-5 w-5" />,
        };
    }
  };

  // Handle confirmDelete based on active component
  const confirmDelete = () => {
    switch (activeComponent) {
      case "fields":
        deleteField();
        break;
      case "fieldTypes":
        deleteFieldType();
        break;
      case "dynamicFields":
        deleteDynamicField();
        break;
      case "copyFields":
        deleteCopyField();
        break;
      default:
        break;
    }
  };

  // Get delete modal title and message
  const getDeleteModalInfo = () => {
    if (!itemToDelete) return { title: "", message: "" };

    switch (activeComponent) {
      case "fields":
        return {
          title: "حذف الحقل",
          message: `هل أنت متأكد من حذف الحقل "${itemToDelete.name}"؟`,
        };
      case "fieldTypes":
        return {
          title: "حذف نوع الحقل",
          message: `هل أنت متأكد من حذف نوع الحقل "${itemToDelete.name}"؟`,
        };
      case "dynamicFields":
        return {
          title: "حذف الحقل الديناميكي",
          message: `هل أنت متأكد من حذف الحقل الديناميكي "${itemToDelete.name}"؟`,
        };
      case "copyFields":
        return {
          title: "حذف حقل النسخ",
          message: `هل أنت متأكد من حذف حقل النسخ من "${itemToDelete.source}" إلى "${itemToDelete.dest}"؟`,
        };
      default:
        return {
          title: "حذف العنصر",
          message: "هل أنت متأكد من حذف هذا العنصر؟",
        };
    }
  };

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
    // Component-specific colors
    componentColor: {
      fields: darkMode ? "blue-600" : "blue-500",
      fieldTypes: darkMode ? "green-600" : "green-500",
      dynamicFields: darkMode ? "purple-600" : "purple-500",
      copyFields: darkMode ? "orange-600" : "orange-500",
    },
  };

  const getComponentColor = () => {
    return themeClasses.componentColor[activeComponent] || "blue-600";
  };

  return (
    <div dir="rtl" className={`p-6 ${themeClasses.container}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Database className="mr-2 h-6 w-6" />
            مدير Solr Schema
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            إدارة مكونات مخطط Apache Solr
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchSolrCollections}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.ghost} border`}
          >
            <RefreshCw
              className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            تحديث المجموعات
          </button>
        </div>
      </div>

      {/* Collection Selector Card */}
      <div
        className={`mb-6 rounded-lg border shadow-md p-6 ${themeClasses.card}`}
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Server className="ml-2 h-5 w-5" />
          اختر مجموعة Solr
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2">
            <select
              value={selectedSolrCollection}
              onChange={(e) => {
                setSelectedSolrCollection(e.target.value);
                setActiveComponent("");
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
            >
              <option value="">-- اختر مجموعة --</option>
              {solrCollections.map((item, idx) => {
                let collectionName, displayName;
                if (typeof item === "string") {
                  collectionName = item;
                  displayName = item;
                } else if (typeof item === "object" && item !== null) {
                  collectionName = item.collectionName;
                  displayName = item.displayName || item.collectionName;
                } else {
                  return null; // skip
                }
                return (
                  <option
                    key={`${collectionName}-${idx}`}
                    value={collectionName}
                  >
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {selectedSolrCollection && (
          <div className="mt-4 p-3 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 flex items-center">
            <Database className="ml-2 h-4 w-4" />
            <span className="font-medium ml-1">المجموعة النشطة:</span>{" "}
            {selectedSolrCollection}
          </div>
        )}
      </div>

      {/* Component Selector Tabs */}
      {selectedSolrCollection && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <List className="ml-2 h-5 w-5" />
            اختر مكون Schema
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveComponent("fieldTypes");
                setShowCreateForm(false);
              }}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                activeComponent === "fieldTypes"
                  ? "bg-green-600 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-green-800"
                  : "bg-gray-200 text-gray-800 hover:bg-green-100"
              }`}
            >
              <FileType className="ml-2 h-4 w-4" />
              أنواع الحقول
            </button>
            <button
              onClick={() => {
                setActiveComponent("fields");
                setShowCreateForm(false);
              }}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                activeComponent === "fields"
                  ? "bg-blue-600 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-blue-800"
                  : "bg-gray-200 text-gray-800 hover:bg-blue-100"
              }`}
            >
              <Tag className="ml-2 h-4 w-4" />
              الحقول
            </button>
            <button
              onClick={() => {
                setActiveComponent("dynamicFields");
                setShowCreateForm(false);
              }}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                activeComponent === "dynamicFields"
                  ? "bg-purple-600 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-purple-800"
                  : "bg-gray-200 text-gray-800 hover:bg-purple-100"
              }`}
            >
              <Layers className="ml-2 h-4 w-4" />
              الحقول الديناميكية
            </button>
            <button
              onClick={() => {
                setActiveComponent("copyFields");
                setShowCreateForm(false);
              }}
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                activeComponent === "copyFields"
                  ? "bg-orange-600 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-orange-800"
                  : "bg-gray-200 text-gray-800 hover:bg-orange-100"
              }`}
            >
              <Copy className="ml-2 h-4 w-4" />
              حقول النسخ
            </button>
          </div>
        </div>
      )}

      {/* Active component section */}
      {selectedSolrCollection && activeComponent && (
        <div>
          {/* Action header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center">
                {getComponentInfo().icon}
                {getComponentInfo().title}
              </h2>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  if (!showCreateForm) {
                    // Reset forms
                    resetFieldForm();
                    resetDynamicFieldForm();
                    resetCopyFieldForm();
                  }
                }}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${
                  showCreateForm
                    ? themeClasses.button.secondary
                    : activeComponent === "fieldTypes"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : activeComponent === "fields"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : activeComponent === "dynamicFields"
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {showCreateForm ? (
                  <>
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </>
                ) : (
                  <>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إنشاء {getComponentInfo().title}
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  switch (activeComponent) {
                    case "fields":
                      fetchFields();
                      break;
                    case "fieldTypes":
                      fetchFieldTypes();
                      break;
                    case "dynamicFields":
                      fetchDynamicFields();
                      break;
                    case "copyFields":
                      fetchCopyFields();
                      break;
                    default:
                      break;
                  }
                }}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.ghost} border`}
              >
                <RefreshCw
                  className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                تحديث
              </button>
            </div>
          </div>

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
                  onClick={() => {
                    switch (activeComponent) {
                      case "fields":
                        fetchFields();
                        break;
                      case "fieldTypes":
                        fetchFieldTypes();
                        break;
                      case "dynamicFields":
                        fetchDynamicFields();
                        break;
                      case "copyFields":
                        fetchCopyFields();
                        break;
                      default:
                        break;
                    }
                  }}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm flex items-center w-fit"
                >
                  <RefreshCw className="ml-1 h-3 w-3" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="mb-6 flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`بحث في ${getComponentInfo().title}...`}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${themeClasses.input}`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                </button>
              )}
            </div>
          </div>

          {/* Create Forms */}
          {showCreateForm && (
            <div
              className={`mb-6 rounded-lg border shadow-md p-6 ${themeClasses.card}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold flex items-center">
                  <PlusCircle className="ml-2 h-5 w-5 text-blue-500" />
                  {activeComponent === "fields" && "إنشاء حقل جديد"}
                  {activeComponent === "fieldTypes" && "إنشاء نوع حقل جديد"}
                  {activeComponent === "dynamicFields" &&
                    "إنشاء حقل ديناميكي جديد"}
                  {activeComponent === "copyFields" && "إنشاء حقل نسخ جديد"}
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Field Form */}
              {activeComponent === "fields" && (
                <form onSubmit={createField} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        اسم الحقل
                      </label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الحقل"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        نوع الحقل
                      </label>
                      <select
                        value={fieldType}
                        onChange={(e) => setFieldType(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      >
                        <option value="">-- اختر نوع الحقل --</option>
                        {fieldTypes.map((ft) => (
                          <option key={ft.name} value={ft.name}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={indexed}
                          onChange={() => setIndexed(!indexed)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">مفهرس</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        تمكين البحث في هذا الحقل
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={stored}
                          onChange={() => setStored(!stored)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">مخزن</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        حفظ قيمة الحقل في الفهرس
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={multiValued}
                          onChange={() => setMultiValued(!multiValued)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">متعدد القيم</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        يمكن أن يحتوي الحقل على قيم متعددة
                      </p>
                    </div>
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
                          إنشاء الحقل
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* FieldType Form */}
              {activeComponent === "fieldTypes" && (
                <div className="space-y-4">
                  <FieldTypeCreator
                    onCreateFieldType={createFieldType}
                    selectedSolrCollection={selectedSolrCollection}
                    darkMode={darkMode}
                  />
                </div>
              )}

              {/* DynamicField Form */}
              {activeComponent === "dynamicFields" && (
                <form onSubmit={createDynamicField} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        اسم الحقل الديناميكي
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: *_txt"
                        value={dynName}
                        onChange={(e) => setDynName(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        استخدم * كحرف بدل (مثل *_txt)
                      </p>
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        نوع الحقل
                      </label>
                      <select
                        value={dynType}
                        onChange={(e) => setDynType(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      >
                        <option value="">-- اختر نوع الحقل --</option>
                        {fieldTypes.map((ft) => (
                          <option key={ft.name} value={ft.name}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={dynIndexed}
                          onChange={() => setDynIndexed(!dynIndexed)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">مفهرس</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        تمكين البحث في هذا الحقل
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={dynStored}
                          onChange={() => setDynStored(!dynStored)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">مخزن</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        حفظ قيمة الحقل في الفهرس
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer space-x-reverse">
                        <input
                          type="checkbox"
                          checked={dynMultiValued}
                          onChange={() => setDynMultiValued(!dynMultiValued)}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                        <span className="mr-2">متعدد القيم</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        يمكن أن يحتوي الحقل على قيم متعددة
                      </p>
                    </div>
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
                          إنشاء الحقل الديناميكي
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* CopyField Form */}
              {activeComponent === "copyFields" && (
                <form onSubmit={createCopyField} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        اسم الحقل المصدر
                      </label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الحقل المصدر"
                        value={copySource}
                        onChange={(e) => setCopySource(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm">
                        اسم الحقل الوجهة
                      </label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الحقل الوجهة"
                        value={copyDest}
                        onChange={(e) => setCopyDest(e.target.value)}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-sm">
                      الحد الأقصى للأحرف (اختياري)
                    </label>
                    <input
                      type="number"
                      placeholder="الحد الأقصى للأحرف للنسخ"
                      value={copyMaxChars}
                      onChange={(e) => setCopyMaxChars(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      اتركه فارغًا للسماح بعدد غير محدود من الأحرف
                    </p>
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
                          إنشاء حقل النسخ
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Item Tables */}
          <div className={`rounded-lg border shadow-md ${themeClasses.card}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="text-xl font-semibold flex items-center">
                {getComponentInfo().icon}
                {getComponentInfo().title} الحالية
              </h3>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center p-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">
                    جاري التحميل...
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredItems.length === 0 && (
              <div className="p-12 text-center">
                {getComponentInfo().icon && (
                  <div className="mx-auto w-16 h-16 text-gray-400">
                    {getComponentInfo().icon}
                  </div>
                )}
                <h4 className="text-lg font-medium mb-2 mt-4">لا توجد عناصر</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm
                    ? "لا توجد عناصر تطابق معايير البحث"
                    : `لم يتم إنشاء أي ${
                        getComponentInfo().title
                      } بعد. أنشئ عنصرًا جديدًا للبدء.`}
                </p>
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    مسح البحث
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <PlusCircle className="ml-2 h-5 w-5" />
                    إنشاء {getComponentInfo().title} جديد
                  </button>
                )}
              </div>
            )}

            {/* Tables for different component types */}
            {!isLoading && filteredItems.length > 0 && (
              <div className="overflow-x-auto">
                {/* Fields Table */}
                {activeComponent === "fields" && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={themeClasses.tableHeader}>
                      <tr>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("name")}
                        >
                          <div className="flex items-center justify-center">
                            اسم الحقل
                            {sortConfig.key === "name" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("type")}
                        >
                          <div className="flex items-center justify-center">
                            نوع الحقل
                            {sortConfig.key === "type" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          الخصائص
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredItems.map((field) => (
                        <tr
                          key={field.name}
                          className={`${themeClasses.tableRow}`}
                        >
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            {field.type}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {field.indexed && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  مفهرس
                                </span>
                              )}
                              {field.stored && (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                  مخزن
                                </span>
                              )}
                              {field.multiValued && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                  متعدد القيم
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex justify-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => openEditModal("field", field)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="تعديل الحقل"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(field);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="حذف الحقل"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Field Types Table */}
                {activeComponent === "fieldTypes" && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={themeClasses.tableHeader}>
                      <tr>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("name")}
                        >
                          <div className="flex items-center justify-center">
                            اسم النوع
                            {sortConfig.key === "name" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("class")}
                        >
                          <div className="flex items-center justify-center">
                            الصنف
                            {sortConfig.key === "class" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          المحلل
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredItems.map((ft) => {
                        const analyzerInfo = ft.analyzer
                          ? `محلل: ${ft.analyzer.tokenizer?.class || "بدون"}`
                          : "—";

                        return (
                          <tr
                            key={ft.name}
                            className={`${themeClasses.tableRow}`}
                          >
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                              {ft.name}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                              {ft.class}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                              {analyzerInfo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                              <div className="flex justify-center space-x-2 space-x-reverse">
                                <button
                                  onClick={() => openEditModal("fieldType", ft)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                  title="تعديل نوع الحقل"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setItemToDelete(ft);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="حذف نوع الحقل"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Dynamic Fields Table */}
                {activeComponent === "dynamicFields" && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={themeClasses.tableHeader}>
                      <tr>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("name")}
                        >
                          <div className="flex items-center justify-center">
                            اسم الحقل
                            {sortConfig.key === "name" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("type")}
                        >
                          <div className="flex items-center justify-center">
                            نوع الحقل
                            {sortConfig.key === "type" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          الخصائص
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredItems.map((df) => (
                        <tr
                          key={df.name}
                          className={`${themeClasses.tableRow}`}
                        >
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                            {df.name}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            {df.type}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {df.indexed && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  مفهرس
                                </span>
                              )}
                              {df.stored && (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                  مخزن
                                </span>
                              )}
                              {df.multiValued && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                  متعدد القيم
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex justify-center space-x-2 space-x-reverse">
                              <button
                                onClick={() =>
                                  openEditModal("dynamicField", df)
                                }
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="تعديل الحقل الديناميكي"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(df);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="حذف الحقل الديناميكي"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Copy Fields Table */}
                {activeComponent === "copyFields" && (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={themeClasses.tableHeader}>
                      <tr>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("source")}
                        >
                          <div className="flex items-center justify-center">
                            الحقل المصدر
                            {sortConfig.key === "source" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort("dest")}
                        >
                          <div className="flex items-center justify-center">
                            الحقل الوجهة
                            {sortConfig.key === "dest" && (
                              <span className="mr-1">
                                {sortConfig.direction === "ascending"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                          الحد الأقصى للأحرف
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredItems.map((cf, idx) => (
                        <tr
                          key={`${cf.source}-${cf.dest}-${idx}`}
                          className={`${themeClasses.tableRow}`}
                        >
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm font-medium">
                            {cf.source}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            {cf.dest}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap text-sm">
                            {cf.maxChars || "∞"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex justify-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => openEditModal("copyField", cf)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="تعديل حقل النسخ"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(cf);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="حذف حقل النسخ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditSchemaItemModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        schemaType={editSchemaType}
        item={editItem}
        collectionName={selectedSolrCollection}
        baseUrl={baseUrl}
        darkMode={darkMode}
        onSaveSuccess={() => {
          setEditModalOpen(false);
          // Re-fetch whichever list is relevant
          if (editSchemaType === "field") fetchFields();
          if (editSchemaType === "fieldType") fetchFieldTypes();
          if (editSchemaType === "dynamicField") fetchDynamicFields();
          if (editSchemaType === "copyField") fetchCopyFields();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        collectionName={
          itemToDelete?.name ||
          (itemToDelete?.source
            ? `${itemToDelete.source} → ${itemToDelete.dest}`
            : "")
        }
        onConfirm={confirmDelete}
        darkmode={darkMode}
        title={getDeleteModalInfo().title}
        mainMessage={getDeleteModalInfo().message}
        darkMode={darkMode}
      />
    </div>
  );
};

export default SolrSchemaManager;
