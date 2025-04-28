import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import ApibaseUrl from "../../ApibaseUrl";

const FieldTypeCreator = ({
  onCreateFieldType,
  selectedSolrCollection,
  darkMode,
}) => {
  const baseUrl = ApibaseUrl;

  // Form fields state
  const [ftName, setFtName] = useState("");
  const [ftClass, setFtClass] = useState("solr.TextField");
  const [useAnalyzer, setUseAnalyzer] = useState(false);
  const [analyzerType, setAnalyzerType] = useState("shared");

  // Tokenizers state
  const [sharedTokenizer, setSharedTokenizer] = useState("");
  const [indexTokenizer, setIndexTokenizer] = useState("");
  const [queryTokenizer, setQueryTokenizer] = useState("");

  // Filters state
  const [sharedFilters, setSharedFilters] = useState([]);
  const [indexFilters, setIndexFilters] = useState([]);
  const [queryFilters, setQueryFilters] = useState([]);

  // For NGram
  const [minGramSize, setMinGramSize] = useState("");
  const [maxGramSize, setMaxGramSize] = useState("");

  // For Phonetic
  const [encoder, setEncoder] = useState("");
  const [phoneticInject, setPhoneticInject] = useState(false);

  // Database options state
  const [fieldTypeClasses, setFieldTypeClasses] = useState([]);
  const [tokenizers, setTokenizers] = useState([]);
  const [filterFactories, setFilterFactories] = useState([]);
  const [phoneticEncoders, setPhoneticEncoders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin mode state
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedType, setSelectedType] = useState("fieldTypeClass");
  const [newOption, setNewOption] = useState({ value: "", label: "" });

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [originalValue, setOriginalValue] = useState("");

  // Active tab state for analyzers
  const [activeAnalyzerTab, setActiveAnalyzerTab] = useState("shared");
  const [activeFiltersCategoryTab, setActiveFiltersCategoryTab] =
    useState("all");

  // JSON Editor state
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState("{}");
  const [jsonError, setJsonError] = useState("");

  // Available option types
  const optionTypes = [
    { value: "fieldTypeClass", label: "Field Type Classes" },
    { value: "tokenizer", label: "Tokenizers" },
    { value: "filter", label: "Filter Factories" },
    { value: "phoneticEncoder", label: "Phonetic Encoders" },
  ];

  // Get the current options for the selected admin type
  const getCurrentOptions = () => {
    switch (selectedType) {
      case "fieldTypeClass":
        return fieldTypeClasses;
      case "tokenizer":
        return tokenizers;
      case "filter":
        return filterFactories;
      case "phoneticEncoder":
        return phoneticEncoders;
      default:
        return [];
    }
  };

  // Filter categories for better organization
  const filterCategories = [
    { id: "all", name: "All Filters" },
    {
      id: "case",
      name: "Case Filters",
      filters: ["solr.LowerCaseFilterFactory", "solr.UpperCaseFilterFactory"],
    },
    {
      id: "stemming",
      name: "Stemming",
      filters: [
        "solr.PorterStemFilterFactory",
        "solr.KStemFilterFactory",
        "solr.SnowballPorterFilterFactory",
      ],
    },
    {
      id: "ngram",
      name: "N-Gram",
      filters: ["solr.NGramFilterFactory", "solr.EdgeNGramFilterFactory"],
    },
    {
      id: "phonetic",
      name: "Phonetic",
      filters: ["solr.PhoneticFilterFactory"],
    },
    {
      id: "stopwords",
      name: "Stop Words",
      filters: ["solr.StopFilterFactory", "solr.CommonGramsFilterFactory"],
    },
    { id: "other", name: "Other", filters: [] }, // Filters not in other categories
  ];

  // Get filters for the active category
  const getFiltersForCategory = (category, allFilters) => {
    if (category === "all") return allFilters;

    const foundCategory = filterCategories.find((cat) => cat.id === category);
    if (!foundCategory || !foundCategory.filters) {
      const knownFilters = filterCategories
        .filter((cat) => cat.id !== "all" && cat.id !== "other")
        .flatMap((cat) => cat.filters || []);

      return allFilters.filter(
        (filter) => !knownFilters.includes(filter.value)
      );
    }

    return allFilters.filter((filter) =>
      foundCategory.filters.includes(filter.value)
    );
  };

  // Load options from the database on component mount
  useEffect(() => {
    fetchAllOptions();
  }, []);

  // Update JSON preview whenever form state changes
  useEffect(() => {
    updateJsonFromForm();
  }, [
    ftName,
    ftClass,
    useAnalyzer,
    analyzerType,
    sharedTokenizer,
    indexTokenizer,
    queryTokenizer,
    sharedFilters,
    indexFilters,
    queryFilters,
    minGramSize,
    maxGramSize,
    encoder,
    phoneticInject,
  ]);

  // Fetch all options from the server
  const fetchAllOptions = async () => {
    setLoading(true);
    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      const response = await axios.get(`${baseUrl}/solr-constants`);
      const allOptions = response.data;

      setFieldTypeClasses(allOptions.fieldTypeClass || []);
      setTokenizers(allOptions.tokenizer || []);
      setFilterFactories(allOptions.filter || []);
      setPhoneticEncoders(allOptions.phoneticEncoder || []);
    } catch (error) {
      console.error("Error loading Solr options:", error);
      toast.error("Failed to load options from server");
    } finally {
      setLoading(false);
    }
  };

  // Initialize database with default values
  const handleInitialize = async () => {
    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      setLoading(true);
      await axios.post(`${baseUrl}/solr-constants/initialize`);
      toast.success("Solr options initialized successfully");
      fetchAllOptions();
    } catch (error) {
      console.error("Error initializing options:", error);
      toast.error("Failed to initialize options");
    } finally {
      setLoading(false);
    }
  };

  // Start editing an option
  const handleEditOption = (option) => {
    setEditMode(true);
    setEditingOption({
      value: option.value,
      label: option.label,
    });
    setOriginalValue(option.value);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingOption(null);
    setOriginalValue("");
    setNewOption({ value: "", label: "" });
  };

  // Update an existing option
  const handleUpdateOption = async (e) => {
    e.preventDefault();

    if (!editingOption.value || !editingOption.label) {
      toast.error("Both value and label are required");
      return;
    }

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      setLoading(true);
      await axios.put(
        `${baseUrl}/solr-constants/${selectedType}/${originalValue}`,
        editingOption
      );
      toast.success("Option updated successfully");

      // Reset form and exit edit mode
      setEditMode(false);
      setEditingOption(null);
      setOriginalValue("");
      setNewOption({ value: "", label: "" });

      // Refresh options
      fetchAllOptions();
    } catch (error) {
      console.error("Error updating option:", error);
      if (error.response && error.response.status === 409) {
        toast.error("This value already exists");
      } else if (error.response && error.response.status === 404) {
        toast.error("Option not found");
      } else {
        toast.error("Failed to update option");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a new option
  const handleAddOption = async (e) => {
    e.preventDefault();

    if (!newOption.value || !newOption.label) {
      toast.error("Both value and label are required");
      return;
    }

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      setLoading(true);
      await axios.post(`${baseUrl}/solr-constants/${selectedType}`, newOption);
      toast.success(`${newOption.label} added successfully`);

      // Reset form
      setNewOption({ value: "", label: "" });

      // Refresh options
      fetchAllOptions();
    } catch (error) {
      console.error("Error adding option:", error);
      if (error.response && error.response.status === 409) {
        toast.error("This option already exists");
      } else {
        toast.error("Failed to add option");
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete an option
  const handleDeleteOption = async (optionValue) => {
    if (window.confirm("Are you sure you want to remove this option?")) {
      try {
        if (!baseUrl) {
          throw new Error("لم يتم تعريف عنوان API الأساسي.");
        }

        setLoading(true);
        await axios.delete(
          `${baseUrl}/solr-constants/${selectedType}/${optionValue}`
        );
        toast.success("Option removed successfully");
        fetchAllOptions();
      } catch (error) {
        console.error("Error removing option:", error);
        toast.error("Failed to remove option");
      } finally {
        setLoading(false);
      }
    }
  };

  // Reset options to defaults
  const handleResetOptions = async () => {
    if (
      window.confirm(
        `Are you sure you want to reset all ${selectedType} options to defaults?`
      )
    ) {
      try {
        if (!baseUrl) {
          throw new Error("لم يتم تعريف عنوان API الأساسي.");
        }
        setLoading(true);
        await axios.post(`${baseUrl}/solr-constants/${selectedType}/reset`);
        toast.success("Options reset to defaults");
        fetchAllOptions();
      } catch (error) {
        console.error("Error resetting options:", error);
        toast.error("Failed to reset options");
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle filter toggle based on analyzer type
  const handleFilterToggle = (filterClass, type) => {
    switch (type) {
      case "shared":
        setSharedFilters((prev) =>
          prev.includes(filterClass)
            ? prev.filter((f) => f !== filterClass)
            : [...prev, filterClass]
        );
        break;
      case "index":
        setIndexFilters((prev) =>
          prev.includes(filterClass)
            ? prev.filter((f) => f !== filterClass)
            : [...prev, filterClass]
        );
        break;
      case "query":
        setQueryFilters((prev) =>
          prev.includes(filterClass)
            ? prev.filter((f) => f !== filterClass)
            : [...prev, filterClass]
        );
        break;
      default:
        break;
    }
  };

  // Helper function to create filter objects
  const createFilterObjects = (filterClasses) => {
    return filterClasses.map((fClass) => {
      // NGramFilter
      if (
        fClass === "solr.NGramFilterFactory" ||
        fClass === "solr.EdgeNGramFilterFactory"
      ) {
        const filterObj = { class: fClass };
        if (minGramSize) filterObj.minGramSize = Number(minGramSize);
        if (maxGramSize) filterObj.maxGramSize = Number(maxGramSize);
        return filterObj;
      }
      // PhoneticFilter
      else if (fClass === "solr.PhoneticFilterFactory") {
        const filterObj = { class: "solr.PhoneticFilterFactory" };
        if (encoder) {
          filterObj.encoder = encoder;
        }
        filterObj.inject = phoneticInject;
        return filterObj;
      }
      // Other filters
      return { class: fClass };
    });
  };

  // Helper function to create tokenizer object
  const createTokenizerObject = (tokenizerClass) => {
    if (!tokenizerClass) return { class: "solr.StandardTokenizerFactory" };

    const tokenizerObj = { class: tokenizerClass };

    // If it's NGramTokenizer, add minGramSize, maxGramSize if set
    if (
      tokenizerClass === "solr.NGramTokenizerFactory" ||
      tokenizerClass === "solr.EdgeNGramTokenizerFactory"
    ) {
      if (minGramSize) tokenizerObj.minGramSize = Number(minGramSize);
      if (maxGramSize) tokenizerObj.maxGramSize = Number(maxGramSize);
    }

    return tokenizerObj;
  };

  // Generate JSON preview from form state
  const updateJsonFromForm = () => {
    let fieldTypeObj = {
      name: ftName || "[fieldType name]",
      class: ftClass,
    };

    // If user wants to configure analyzer
    if (ftClass === "solr.TextField" && useAnalyzer) {
      if (analyzerType === "shared") {
        // Shared analyzer (same for index and query)
        fieldTypeObj.analyzer = {
          tokenizer: createTokenizerObject(sharedTokenizer),
          filters: createFilterObjects(sharedFilters),
        };
      } else {
        // Separate index and query analyzers
        fieldTypeObj.indexAnalyzer = {
          tokenizer: createTokenizerObject(indexTokenizer),
          filters: createFilterObjects(indexFilters),
        };

        fieldTypeObj.queryAnalyzer = {
          tokenizer: createTokenizerObject(queryTokenizer),
          filters: createFilterObjects(queryFilters),
        };
      }
    }

    // Format JSON with indentation for readability
    setJsonContent(JSON.stringify(fieldTypeObj, null, 2));
  };

  // Update form state from JSON editor
  const updateFormFromJson = () => {
    try {
      const parsedJson = JSON.parse(jsonContent);
      setJsonError("");

      // Update form fields from JSON
      if (parsedJson.name) setFtName(parsedJson.name);
      if (parsedJson.class) setFtClass(parsedJson.class);

      // Handle analyzer configurations
      const hasAnalyzer =
        parsedJson.analyzer ||
        (parsedJson.indexAnalyzer && parsedJson.queryAnalyzer);
      setUseAnalyzer(hasAnalyzer);

      if (parsedJson.analyzer) {
        setAnalyzerType("shared");
        if (
          parsedJson.analyzer.tokenizer &&
          parsedJson.analyzer.tokenizer.class
        ) {
          setSharedTokenizer(parsedJson.analyzer.tokenizer.class);
        }
        if (
          parsedJson.analyzer.filters &&
          Array.isArray(parsedJson.analyzer.filters)
        ) {
          setSharedFilters(parsedJson.analyzer.filters.map((f) => f.class));
        }
      } else if (parsedJson.indexAnalyzer && parsedJson.queryAnalyzer) {
        setAnalyzerType("separate");

        // Index analyzer
        if (
          parsedJson.indexAnalyzer.tokenizer &&
          parsedJson.indexAnalyzer.tokenizer.class
        ) {
          setIndexTokenizer(parsedJson.indexAnalyzer.tokenizer.class);
        }
        if (
          parsedJson.indexAnalyzer.filters &&
          Array.isArray(parsedJson.indexAnalyzer.filters)
        ) {
          setIndexFilters(parsedJson.indexAnalyzer.filters.map((f) => f.class));
        }

        // Query analyzer
        if (
          parsedJson.queryAnalyzer.tokenizer &&
          parsedJson.queryAnalyzer.tokenizer.class
        ) {
          setQueryTokenizer(parsedJson.queryAnalyzer.tokenizer.class);
        }
        if (
          parsedJson.queryAnalyzer.filters &&
          Array.isArray(parsedJson.queryAnalyzer.filters)
        ) {
          setQueryFilters(parsedJson.queryAnalyzer.filters.map((f) => f.class));
        }
      }

      // Handle NGram configuration - find it in any analyzer
      let ngramConfig = null;
      if (parsedJson.analyzer && parsedJson.analyzer.tokenizer) {
        if (
          parsedJson.analyzer.tokenizer.class ===
            "solr.NGramTokenizerFactory" ||
          parsedJson.analyzer.tokenizer.class ===
            "solr.EdgeNGramTokenizerFactory"
        ) {
          ngramConfig = parsedJson.analyzer.tokenizer;
        }
      } else if (
        parsedJson.indexAnalyzer &&
        parsedJson.indexAnalyzer.tokenizer
      ) {
        if (
          parsedJson.indexAnalyzer.tokenizer.class ===
            "solr.NGramTokenizerFactory" ||
          parsedJson.indexAnalyzer.tokenizer.class ===
            "solr.EdgeNGramTokenizerFactory"
        ) {
          ngramConfig = parsedJson.indexAnalyzer.tokenizer;
        }
      }

      if (ngramConfig) {
        if (ngramConfig.minGramSize) setMinGramSize(ngramConfig.minGramSize);
        if (ngramConfig.maxGramSize) setMaxGramSize(ngramConfig.maxGramSize);
      }

      // Handle Phonetic configuration
      let phoneticConfig = null;
      if (parsedJson.analyzer && parsedJson.analyzer.filters) {
        phoneticConfig = parsedJson.analyzer.filters.find(
          (f) => f.class === "solr.PhoneticFilterFactory"
        );
      } else if (parsedJson.indexAnalyzer && parsedJson.indexAnalyzer.filters) {
        phoneticConfig = parsedJson.indexAnalyzer.filters.find(
          (f) => f.class === "solr.PhoneticFilterFactory"
        );
      }

      if (phoneticConfig) {
        if (phoneticConfig.encoder) setEncoder(phoneticConfig.encoder);
        if (phoneticConfig.inject !== undefined)
          setPhoneticInject(phoneticConfig.inject);
      }
    } catch (e) {
      setJsonError("Invalid JSON: " + e.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedSolrCollection) {
      toast.info("Please select a collection first");
      return;
    }
    if (!ftName.trim()) {
      toast.error("FieldType Name is required");
      return;
    }

    let fieldTypeObj = {
      name: ftName,
      class: ftClass,
    };

    // If user wants to configure analyzer
    if (ftClass === "solr.TextField" && useAnalyzer) {
      if (analyzerType === "shared") {
        // Shared analyzer (same for index and query)
        fieldTypeObj.analyzer = {
          tokenizer: createTokenizerObject(sharedTokenizer),
          filters: createFilterObjects(sharedFilters),
        };
      } else {
        // Separate index and query analyzers
        fieldTypeObj.indexAnalyzer = {
          tokenizer: createTokenizerObject(indexTokenizer),
          filters: createFilterObjects(indexFilters),
        };

        fieldTypeObj.queryAnalyzer = {
          tokenizer: createTokenizerObject(queryTokenizer),
          filters: createFilterObjects(queryFilters),
        };
      }
    }

    // If JSON editor is open, try to use that instead
    if (isJsonEditorOpen) {
      try {
        fieldTypeObj = JSON.parse(jsonContent);
        if (!fieldTypeObj.name || !fieldTypeObj.name.trim()) {
          toast.error("FieldType Name is required in JSON");
          return;
        }
      } catch (e) {
        toast.error("Invalid JSON: " + e.message);
        return;
      }
    }

    // Pass the new fieldType object to parent
    onCreateFieldType(fieldTypeObj);

    // Reset form
    setFtName("");
    setFtClass("solr.TextField");
    setUseAnalyzer(false);
    setAnalyzerType("shared");
    setSharedTokenizer("");
    setIndexTokenizer("");
    setQueryTokenizer("");
    setSharedFilters([]);
    setIndexFilters([]);
    setQueryFilters([]);
    setMinGramSize("");
    setMaxGramSize("");
    setEncoder("");
    setPhoneticInject(false);
    setJsonContent("{}");
    setIsJsonEditorOpen(false);
  };

  // Show extra NGram fields based on current analyzer type - only for shared analyzer view
  const showNGramOptions =
    analyzerType === "shared" &&
    sharedFilters.some((f) => f.includes("NGramFilterFactory"));

  // Show loading indicator while options are being loaded
  if (loading) {
    return (
      <div
        className={`p-8 rounded-lg shadow-md flex items-center justify-center ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mr-3"></div>
        <p className="text-lg">Loading Solr options...</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
        darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
      }`}
    >
      {/* Header */}
      <div
        className={`p-6 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold mb-1 flex items-center">
              <span className="text-emerald-500 mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </span>
              Create New Field Type
            </h3>
            <p className="text-sm opacity-75">
              Collection:{" "}
              <span className="font-medium">
                {selectedSolrCollection || "None selected"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsJsonEditorOpen(!isJsonEditorOpen);
                if (isJsonEditorOpen) {
                  // When closing JSON editor, attempt to parse and update form
                  updateFormFromJson();
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                isJsonEditorOpen
                  ? `${
                      darkMode ? "bg-indigo-700" : "bg-indigo-600"
                    } text-white hover:bg-opacity-90`
                  : `${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } hover:bg-opacity-80`
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              {isJsonEditorOpen ? "Form Editor" : "JSON Editor"}
            </button>
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                showAdmin
                  ? `${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } hover:bg-opacity-80`
                  : `${
                      darkMode ? "bg-emerald-700" : "bg-emerald-600"
                    } text-white hover:bg-opacity-90`
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {showAdmin ? "Hide Admin Panel" : "Manage Solr Options"}
            </button>
          </div>
        </div>
      </div>

      {/* Admin panel */}
      {showAdmin && (
        <div
          className={`p-6 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <span className="text-blue-500 mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </span>
              Solr Options Management
            </h3>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleInitialize}
                className={`px-4 py-2 rounded-lg shadow-sm flex items-center transition-colors ${
                  darkMode
                    ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                Initialize Database
              </button>

              <button
                onClick={fetchAllOptions}
                className={`px-4 py-2 rounded-lg shadow-sm flex items-center transition-colors ${
                  darkMode
                    ? "bg-blue-700 hover:bg-blue-800 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh Options
              </button>
            </div>

            {/* Rest of the admin panel code here */}
            {/* This would be the same as the previous implementation */}
          </div>
        </div>
      )}

      {/* Main Form or JSON Editor */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          {isJsonEditorOpen ? (
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <span className="text-indigo-500 mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </span>
                JSON Editor
              </h3>

              {jsonError && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    darkMode
                      ? "bg-red-900 text-red-100"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {jsonError}
                </div>
              )}

              <div className="mb-4">
                <textarea
                  value={jsonContent}
                  onChange={(e) => {
                    setJsonContent(e.target.value);
                    // Clear error when user starts editing
                    if (jsonError) setJsonError("");
                  }}
                  dir="ltr"
                  rows={20}
                  className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-opacity-50 ${
                    darkMode
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
                      : "bg-gray-50 border-gray-300 text-gray-800 focus:border-indigo-500 focus:ring-indigo-200"
                  }`}
                  style={{ direction: "ltr", textAlign: "left" }}
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={updateFormFromJson}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  Validate & Apply
                </button>

                <div className="text-sm text-right opacity-70">
                  <p>Press Tab to indent, use Shift+Tab to unindent</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-opacity-10 bg-blue-500">
                <h4 className="text-sm font-semibold mb-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  JSON Structure Guidelines
                </h4>
                <ul className="text-xs list-disc list-inside space-y-1 opacity-80">
                  <li>
                    The{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      name
                    </code>{" "}
                    and{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      class
                    </code>{" "}
                    fields are required
                  </li>
                  <li>
                    For text fields with analyzers, use either{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      analyzer
                    </code>{" "}
                    (shared) or{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      indexAnalyzer
                    </code>
                    /
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      queryAnalyzer
                    </code>{" "}
                    (separate)
                  </li>
                  <li>
                    Each analyzer should have a{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      tokenizer
                    </code>{" "}
                    and optional{" "}
                    <code className="font-mono bg-opacity-20 bg-gray-500 px-1 rounded">
                      filters
                    </code>{" "}
                    array
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Regular form fields here */}
              {/* This would be similar to the previous implementation */}
              {/* FieldType Name */}
              <div>
                <label className="block mb-2 text-sm font-medium">
                  FieldType Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="myNGramText"
                  value={ftName}
                  onChange={(e) => setFtName(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
                      : "bg-white border-gray-300 text-gray-800 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                />
                <p className="mt-1 text-xs opacity-70">
                  Give your field type a descriptive name
                </p>
              </div>

              {/* FieldType Class */}
              <div>
                <label className="block mb-2 text-sm font-medium">
                  FieldType Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={ftClass}
                  onChange={(e) => setFtClass(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
                      : "bg-white border-gray-300 text-gray-800 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                >
                  {fieldTypeClasses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs opacity-70">
                  Select the Java class for this field type
                </p>
              </div>
            </div>
          )}

          {/* Analyzer options only if TextField - only shown in form mode */}
          {ftClass === "solr.TextField" && !isJsonEditorOpen && (
            <div
              className={`mb-6 p-6 rounded-lg border ${
                darkMode
                  ? "border-gray-700 bg-gray-700"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold flex items-center">
                  <span className="text-purple-500 mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </span>
                  Text Analysis Configuration
                </h4>

                <div className="relative inline-block">
                  <div className="flex items-center">
                    <span className="mr-2 text-sm">Configure Analyzer:</span>
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={useAnalyzer}
                        onChange={(e) => setUseAnalyzer(e.target.checked)}
                      />
                      <div
                        className={`w-11 h-6 ${
                          useAnalyzer
                            ? "bg-emerald-600"
                            : darkMode
                            ? "bg-gray-600"
                            : "bg-gray-300"
                        } rounded-full peer transition-colors`}
                      ></div>
                      <div
                        className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                          useAnalyzer ? "translate-x-5" : ""
                        }`}
                      ></div>
                    </label>
                  </div>
                </div>
              </div>

              {useAnalyzer && (
                <div className="mt-4">
                  {/* Analyzer Type Selection */}
                  <div className="mb-6">
                    <span className="block mb-2 text-sm font-medium">
                      Analyzer Type:
                    </span>
                    <div className="flex flex-wrap gap-3">
                      <label
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                          analyzerType === "shared"
                            ? `${
                                darkMode ? "bg-blue-700" : "bg-blue-600"
                              } text-white`
                            : `${
                                darkMode ? "bg-gray-700" : "bg-gray-200"
                              } hover:opacity-80`
                        }`}
                      >
                        <input
                          type="radio"
                          name="analyzerType"
                          value="shared"
                          checked={analyzerType === "shared"}
                          onChange={() => setAnalyzerType("shared")}
                          className="sr-only"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        Shared Analyzer
                      </label>
                      <label
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                          analyzerType !== "shared"
                            ? `${
                                darkMode ? "bg-blue-700" : "bg-blue-600"
                              } text-white`
                            : `${
                                darkMode ? "bg-gray-700" : "bg-gray-200"
                              } hover:opacity-80`
                        }`}
                      >
                        <input
                          type="radio"
                          name="analyzerType"
                          value="separate"
                          checked={analyzerType !== "shared"}
                          onChange={() => setAnalyzerType("separate")}
                          className="sr-only"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        Separate Analyzers (Index & Query)
                      </label>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                      {analyzerType === "shared"
                        ? "Use the same analyzer for both indexing and querying"
                        : "Use different analyzers for indexing and querying"}
                    </p>
                  </div>

                  {/* Analyzer Configuration Tabs */}
                  {analyzerType === "shared" ? (
                    // SHARED ANALYZER CONFIGURATION
                    <div
                      className={`p-6 rounded-lg border ${
                        darkMode
                          ? "border-gray-600 bg-gray-800"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <h4 className="font-bold mb-4 flex items-center text-blue-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        Shared Analyzer
                      </h4>

                      {/* Tokenizer Selection */}
                      <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium">
                          Tokenizer:
                        </label>
                        <select
                          value={sharedTokenizer}
                          onChange={(e) => setSharedTokenizer(e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                              : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                          }`}
                        >
                          <option value="">-- Choose tokenizer --</option>
                          {tokenizers.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs opacity-70">
                          Tokenizer breaks text into individual tokens
                        </p>
                      </div>

                      {/* NGram Tokenizer Options for shared */}
                      {(sharedTokenizer === "solr.NGramTokenizerFactory" ||
                        sharedTokenizer ===
                          "solr.EdgeNGramTokenizerFactory") && (
                        <div
                          className={`mt-4 mb-4 p-4 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <h5 className="font-medium mb-3">
                            NGram Configuration
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block mb-1 text-sm">
                                Min Gram Size:
                              </label>
                              <input
                                type="number"
                                value={minGramSize}
                                onChange={(e) => setMinGramSize(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                    : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-sm">
                                Max Gram Size:
                              </label>
                              <input
                                type="number"
                                value={maxGramSize}
                                onChange={(e) => setMaxGramSize(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                    : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Filter Selection - with category tabs */}
                      <div className="mt-4">
                        <label className="block mb-2 text-sm font-medium">
                          Filters:
                        </label>

                        {/* Filter Category Tabs */}
                        <div className="flex flex-wrap mb-2 border-b border-gray-300 dark:border-gray-600">
                          {filterCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() =>
                                setActiveFiltersCategoryTab(category.id)
                              }
                              className={`px-3 py-2 text-sm font-medium transition-colors ${
                                activeFiltersCategoryTab === category.id
                                  ? `${
                                      darkMode
                                        ? "border-b-2 border-blue-500 text-blue-400"
                                        : "border-b-2 border-blue-500 text-blue-600"
                                    }`
                                  : `${
                                      darkMode
                                        ? "text-gray-400 hover:text-gray-300"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>

                        {/* Filter Checkboxes */}
                        <div
                          className={`p-4 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {getFiltersForCategory(
                              activeFiltersCategoryTab,
                              filterFactories
                            ).map((filt) => (
                              <div
                                key={filt.value}
                                className={`p-2 rounded-lg transition-colors ${
                                  darkMode
                                    ? sharedFilters.includes(filt.value)
                                      ? "bg-blue-900 bg-opacity-40"
                                      : "hover:bg-gray-600"
                                    : sharedFilters.includes(filt.value)
                                    ? "bg-blue-100"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                <label className="flex items-start cursor-pointer">
                                  <div className="flex items-center h-5">
                                    <input
                                      type="checkbox"
                                      checked={sharedFilters.includes(
                                        filt.value
                                      )}
                                      onChange={() =>
                                        handleFilterToggle(filt.value, "shared")
                                      }
                                      className={`w-4 h-4 rounded border focus:ring-3 focus:ring-blue-300 ${
                                        darkMode
                                          ? "bg-gray-700 border-gray-600 focus:ring-blue-600"
                                          : "bg-gray-100 border-gray-300"
                                      } ${
                                        sharedFilters.includes(filt.value)
                                          ? "text-blue-600"
                                          : ""
                                      }`}
                                    />
                                  </div>
                                  <div className="ml-2 text-sm">
                                    <span className="font-medium block">
                                      {filt.label}
                                    </span>
                                    <span className="opacity-60 text-xs font-mono">
                                      {filt.value
                                        .replace("solr.", "")
                                        .replace("Factory", "")}
                                    </span>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* PhoneticFilter options - only for shared analyzer type */}
                      {sharedFilters.includes("solr.PhoneticFilterFactory") && (
                        <div
                          className={`mt-4 p-4 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <h5 className="font-medium mb-3">
                            Phonetic Filter Configuration
                          </h5>
                          <div className="mb-4">
                            <label className="block mb-1 text-sm">
                              Encoder Algorithm:
                            </label>
                            <select
                              value={encoder}
                              onChange={(e) => setEncoder(e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                darkMode
                                  ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                  : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                              }`}
                            >
                              <option value="">-- Choose Encoder --</option>
                              {phoneticEncoders.map((en) => (
                                <option key={en.value} value={en.value}>
                                  {en.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={phoneticInject}
                                onChange={() =>
                                  setPhoneticInject(!phoneticInject)
                                }
                              />
                              <div
                                className={`w-10 h-5 ${
                                  phoneticInject
                                    ? "bg-blue-600"
                                    : darkMode
                                    ? "bg-gray-600"
                                    : "bg-gray-300"
                                } rounded-full shadow-inner transition-colors`}
                              ></div>
                              <div
                                className={`absolute w-4 h-4 bg-white rounded-full shadow transform ${
                                  phoneticInject
                                    ? "translate-x-5"
                                    : "translate-x-1"
                                } top-0.5 left-0 transition-transform`}
                              ></div>
                            </div>
                            <div className="ml-3 text-sm">
                              Inject The Original Token
                            </div>
                          </label>
                        </div>
                      )}

                      {/* NGramFilter options for shared analyzer only */}
                      {showNGramOptions && (
                        <div
                          className={`mt-4 p-4 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-gray-300 bg-gray-50"
                          }`}
                        >
                          <h5 className="font-medium mb-3">
                            NGram Filter Configuration
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block mb-1 text-sm">
                                Min Gram Size:
                              </label>
                              <input
                                type="number"
                                value={minGramSize}
                                onChange={(e) => setMinGramSize(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                    : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-sm">
                                Max Gram Size:
                              </label>
                              <input
                                type="number"
                                value={maxGramSize}
                                onChange={(e) => setMaxGramSize(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                  darkMode
                                    ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500"
                                    : "bg-white border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // SEPARATE INDEX AND QUERY ANALYZERS
                    <div>
                      {/* Analyzer Type Tabs */}
                      <div className="flex mb-4 border-b border-gray-300 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={() => setActiveAnalyzerTab("index")}
                          className={`py-2 px-4 text-sm font-medium ${
                            activeAnalyzerTab === "index"
                              ? `${
                                  darkMode
                                    ? "border-b-2 border-green-500 text-green-400"
                                    : "border-b-2 border-green-500 text-green-600"
                                }`
                              : `${
                                  darkMode
                                    ? "text-gray-400 hover:text-gray-300"
                                    : "text-gray-500 hover:text-gray-700"
                                }`
                          }`}
                        >
                          Index Analyzer
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveAnalyzerTab("query")}
                          className={`py-2 px-4 text-sm font-medium ${
                            activeAnalyzerTab === "query"
                              ? `${
                                  darkMode
                                    ? "border-b-2 border-amber-500 text-amber-400"
                                    : "border-b-2 border-amber-500 text-amber-600"
                                }`
                              : `${
                                  darkMode
                                    ? "text-gray-400 hover:text-gray-300"
                                    : "text-gray-500 hover:text-gray-700"
                                }`
                          }`}
                        >
                          Query Analyzer
                        </button>
                      </div>

                      {/* Index Analyzer */}
                      {activeAnalyzerTab === "index" && (
                        <div
                          className={`p-6 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-800"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <h4 className="font-bold mb-4 flex items-center text-green-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            Index Analyzer
                          </h4>

                          {/* Tokenizer Selection */}
                          <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium">
                              Tokenizer:
                            </label>
                            <select
                              value={indexTokenizer}
                              onChange={(e) =>
                                setIndexTokenizer(e.target.value)
                              }
                              className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                  : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                              }`}
                            >
                              <option value="">-- Choose tokenizer --</option>
                              {tokenizers.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                  {tz.label}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs opacity-70">
                              Tokenizer for the index-time analyzer
                            </p>
                          </div>

                          {/* NGram Tokenizer Options for index analyzer */}
                          {(indexTokenizer === "solr.NGramTokenizerFactory" ||
                            indexTokenizer ===
                              "solr.EdgeNGramTokenizerFactory") && (
                            <div
                              className={`mt-4 mb-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                NGram Configuration
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Min Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={minGramSize}
                                    onChange={(e) =>
                                      setMinGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Max Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={maxGramSize}
                                    onChange={(e) =>
                                      setMaxGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Filter Selection - with category tabs */}
                          <div className="mt-4">
                            <label className="block mb-2 text-sm font-medium">
                              Filters:
                            </label>

                            {/* Filter Category Tabs */}
                            <div className="flex flex-wrap mb-2 border-b border-gray-300 dark:border-gray-600">
                              {filterCategories.map((category) => (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() =>
                                    setActiveFiltersCategoryTab(category.id)
                                  }
                                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    activeFiltersCategoryTab === category.id
                                      ? `${
                                          darkMode
                                            ? "border-b-2 border-green-500 text-green-400"
                                            : "border-b-2 border-green-500 text-green-600"
                                        }`
                                      : `${
                                          darkMode
                                            ? "text-gray-400 hover:text-gray-300"
                                            : "text-gray-500 hover:text-gray-700"
                                        }`
                                  }`}
                                >
                                  {category.name}
                                </button>
                              ))}
                            </div>

                            {/* Filter Checkboxes */}
                            <div
                              className={`p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {getFiltersForCategory(
                                  activeFiltersCategoryTab,
                                  filterFactories
                                ).map((filt) => (
                                  <div
                                    key={filt.value}
                                    className={`p-2 rounded-lg transition-colors ${
                                      darkMode
                                        ? indexFilters.includes(filt.value)
                                          ? "bg-green-900 bg-opacity-40"
                                          : "hover:bg-gray-600"
                                        : indexFilters.includes(filt.value)
                                        ? "bg-green-100"
                                        : "hover:bg-gray-100"
                                    }`}
                                  >
                                    <label className="flex items-start cursor-pointer">
                                      <div className="flex items-center h-5">
                                        <input
                                          type="checkbox"
                                          checked={indexFilters.includes(
                                            filt.value
                                          )}
                                          onChange={() =>
                                            handleFilterToggle(
                                              filt.value,
                                              "index"
                                            )
                                          }
                                          className={`w-4 h-4 rounded border focus:ring-3 focus:ring-green-300 ${
                                            darkMode
                                              ? "bg-gray-700 border-gray-600 focus:ring-green-600"
                                              : "bg-gray-100 border-gray-300"
                                          } ${
                                            indexFilters.includes(filt.value)
                                              ? "text-green-600"
                                              : ""
                                          }`}
                                        />
                                      </div>
                                      <div className="ml-2 text-sm">
                                        <span className="font-medium block">
                                          {filt.label}
                                        </span>
                                        <span className="opacity-60 text-xs font-mono">
                                          {filt.value
                                            .replace("solr.", "")
                                            .replace("Factory", "")}
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* NGramFilter options for index analyzer */}
                          {(indexFilters.includes("solr.NGramFilterFactory") ||
                            indexFilters.includes(
                              "solr.EdgeNGramFilterFactory"
                            )) && (
                            <div
                              className={`mt-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                NGram Filter Configuration
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Min Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={minGramSize}
                                    onChange={(e) =>
                                      setMinGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Max Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={maxGramSize}
                                    onChange={(e) =>
                                      setMaxGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* PhoneticFilter options for index analyzer */}
                          {indexFilters.includes(
                            "solr.PhoneticFilterFactory"
                          ) && (
                            <div
                              className={`mt-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                Phonetic Filter Configuration
                              </h5>
                              <div className="mb-4">
                                <label className="block mb-1 text-sm">
                                  Encoder Algorithm:
                                </label>
                                <select
                                  value={encoder}
                                  onChange={(e) => setEncoder(e.target.value)}
                                  className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                    darkMode
                                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-green-500 focus:ring-green-500"
                                      : "bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-green-200"
                                  }`}
                                >
                                  <option value="">-- Choose Encoder --</option>
                                  {phoneticEncoders.map((en) => (
                                    <option key={en.value} value={en.value}>
                                      {en.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={phoneticInject}
                                    onChange={() =>
                                      setPhoneticInject(!phoneticInject)
                                    }
                                  />
                                  <div
                                    className={`w-10 h-5 ${
                                      phoneticInject
                                        ? "bg-green-600"
                                        : darkMode
                                        ? "bg-gray-600"
                                        : "bg-gray-300"
                                    } rounded-full shadow-inner transition-colors`}
                                  ></div>
                                  <div
                                    className={`absolute w-4 h-4 bg-white rounded-full shadow transform ${
                                      phoneticInject
                                        ? "translate-x-5"
                                        : "translate-x-1"
                                    } top-0.5 left-0 transition-transform`}
                                  ></div>
                                </div>
                                <div className="ml-3 text-sm">
                                  Inject The Original Token
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Query Analyzer */}
                      {activeAnalyzerTab === "query" && (
                        <div
                          className={`p-6 rounded-lg border ${
                            darkMode
                              ? "border-gray-600 bg-gray-800"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <h4 className="font-bold mb-4 flex items-center text-amber-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                            Query Analyzer
                          </h4>

                          {/* Tokenizer Selection */}
                          <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium">
                              Tokenizer:
                            </label>
                            <select
                              value={queryTokenizer}
                              onChange={(e) =>
                                setQueryTokenizer(e.target.value)
                              }
                              className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                darkMode
                                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                  : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                              }`}
                            >
                              <option value="">-- Choose tokenizer --</option>
                              {tokenizers.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                  {tz.label}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs opacity-70">
                              Tokenizer for the query-time analyzer
                            </p>
                          </div>

                          {/* NGram Tokenizer Options for query analyzer */}
                          {(queryTokenizer === "solr.NGramTokenizerFactory" ||
                            queryTokenizer ===
                              "solr.EdgeNGramTokenizerFactory") && (
                            <div
                              className={`mt-4 mb-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                NGram Configuration
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Min Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={minGramSize}
                                    onChange={(e) =>
                                      setMinGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Max Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={maxGramSize}
                                    onChange={(e) =>
                                      setMaxGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Filter Selection - with category tabs */}
                          <div className="mt-4">
                            <label className="block mb-2 text-sm font-medium">
                              Filters:
                            </label>

                            {/* Filter Category Tabs */}
                            <div className="flex flex-wrap mb-2 border-b border-gray-300 dark:border-gray-600">
                              {filterCategories.map((category) => (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() =>
                                    setActiveFiltersCategoryTab(category.id)
                                  }
                                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    activeFiltersCategoryTab === category.id
                                      ? `${
                                          darkMode
                                            ? "border-b-2 border-amber-500 text-amber-400"
                                            : "border-b-2 border-amber-500 text-amber-600"
                                        }`
                                      : `${
                                          darkMode
                                            ? "text-gray-400 hover:text-gray-300"
                                            : "text-gray-500 hover:text-gray-700"
                                        }`
                                  }`}
                                >
                                  {category.name}
                                </button>
                              ))}
                            </div>

                            {/* Filter Checkboxes */}
                            <div
                              className={`p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {getFiltersForCategory(
                                  activeFiltersCategoryTab,
                                  filterFactories
                                ).map((filt) => (
                                  <div
                                    key={filt.value}
                                    className={`p-2 rounded-lg transition-colors ${
                                      darkMode
                                        ? queryFilters.includes(filt.value)
                                          ? "bg-amber-900 bg-opacity-40"
                                          : "hover:bg-gray-600"
                                        : queryFilters.includes(filt.value)
                                        ? "bg-amber-100"
                                        : "hover:bg-gray-100"
                                    }`}
                                  >
                                    <label className="flex items-start cursor-pointer">
                                      <div className="flex items-center h-5">
                                        <input
                                          type="checkbox"
                                          checked={queryFilters.includes(
                                            filt.value
                                          )}
                                          onChange={() =>
                                            handleFilterToggle(
                                              filt.value,
                                              "query"
                                            )
                                          }
                                          className={`w-4 h-4 rounded border focus:ring-3 focus:ring-amber-300 ${
                                            darkMode
                                              ? "bg-gray-700 border-gray-600 focus:ring-amber-600"
                                              : "bg-gray-100 border-gray-300"
                                          } ${
                                            queryFilters.includes(filt.value)
                                              ? "text-amber-600"
                                              : ""
                                          }`}
                                        />
                                      </div>
                                      <div className="ml-2 text-sm">
                                        <span className="font-medium block">
                                          {filt.label}
                                        </span>
                                        <span className="opacity-60 text-xs font-mono">
                                          {filt.value
                                            .replace("solr.", "")
                                            .replace("Factory", "")}
                                        </span>
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* NGramFilter options for query analyzer */}
                          {(queryFilters.includes("solr.NGramFilterFactory") ||
                            queryFilters.includes(
                              "solr.EdgeNGramFilterFactory"
                            )) && (
                            <div
                              className={`mt-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                NGram Filter Configuration
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Min Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={minGramSize}
                                    onChange={(e) =>
                                      setMinGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-sm">
                                    Max Gram Size:
                                  </label>
                                  <input
                                    type="number"
                                    value={maxGramSize}
                                    onChange={(e) =>
                                      setMaxGramSize(e.target.value)
                                    }
                                    className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                      darkMode
                                        ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                        : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* PhoneticFilter options for query analyzer */}
                          {queryFilters.includes(
                            "solr.PhoneticFilterFactory"
                          ) && (
                            <div
                              className={`mt-4 p-4 rounded-lg border ${
                                darkMode
                                  ? "border-gray-600 bg-gray-700"
                                  : "border-gray-300 bg-gray-50"
                              }`}
                            >
                              <h5 className="font-medium mb-3">
                                Phonetic Filter Configuration
                              </h5>
                              <div className="mb-4">
                                <label className="block mb-1 text-sm">
                                  Encoder Algorithm:
                                </label>
                                <select
                                  value={encoder}
                                  onChange={(e) => setEncoder(e.target.value)}
                                  className={`w-full px-4 py-2 border rounded-lg transition-colors focus:ring-2 focus:ring-opacity-50 ${
                                    darkMode
                                      ? "bg-gray-800 border-gray-600 text-gray-100 focus:border-amber-500 focus:ring-amber-500"
                                      : "bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:ring-amber-200"
                                  }`}
                                >
                                  <option value="">-- Choose Encoder --</option>
                                  {phoneticEncoders.map((en) => (
                                    <option key={en.value} value={en.value}>
                                      {en.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={phoneticInject}
                                    onChange={() =>
                                      setPhoneticInject(!phoneticInject)
                                    }
                                  />
                                  <div
                                    className={`w-10 h-5 ${
                                      phoneticInject
                                        ? "bg-amber-600"
                                        : darkMode
                                        ? "bg-gray-600"
                                        : "bg-gray-300"
                                    } rounded-full shadow-inner transition-colors`}
                                  ></div>
                                  <div
                                    className={`absolute w-4 h-4 bg-white rounded-full shadow transform ${
                                      phoneticInject
                                        ? "translate-x-5"
                                        : "translate-x-1"
                                    } top-0.5 left-0 transition-transform`}
                                  ></div>
                                </div>
                                <div className="ml-3 text-sm">
                                  Inject The Original Token
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className={`px-6 py-3 rounded-lg shadow-md transition-all flex items-center ${
                darkMode
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              } transform hover:-translate-y-0.5`}
              disabled={showAdmin && editMode}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Field Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldTypeCreator;
