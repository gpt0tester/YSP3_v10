import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import {
  Search,
  Plus,
  X,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  AlertCircle,
  CheckCircle,
  Filter,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
} from "lucide-react";
import ApibaseUrl from "../ApibaseUrl";
import EditTranslationModal from "./EditTranslationModal";

function TranslationManager({ darkMode }) {
  const baseUrl = ApibaseUrl;
  const { i18n, t } = useTranslation();

  const [translations, setTranslations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [translationToEdit, setTranslationToEdit] = useState(null);
  const [newTranslation, setNewTranslation] = useState({
    key: "",
    language: "ar",
    value: "",
  });
  const [csvFile, setCsvFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    duplicates: 0,
    errors: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "key",
    direction: "ascending",
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Fetch all translations - memoized with useCallback
  const fetchTranslations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!baseUrl) {
        throw new Error("API base URL is not defined");
      }
      const res = await axios.get(`${baseUrl}/translations`);
      setTranslations(res.data);
      showNotification("Translations loaded successfully", "success");
    } catch (err) {
      console.error("Error fetching translations:", err);
      setError(err.message || "Failed to fetch translations");
      showNotification("Failed to load translations", "error");
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  // Show notification function
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Auto-dismiss after 5 seconds
  };

  /* ------------------------------ ADD NEW ------------------------------ */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTranslation((prev) => ({ ...prev, [name]: value }));
  };

  const isDuplicateTranslation = (key, language) => {
    return translations.some(
      (t) =>
        t.key.toLowerCase() === key.toLowerCase() &&
        t.language.toLowerCase() === language.toLowerCase()
    );
  };

  const handleAddTranslation = async (e) => {
    e.preventDefault();
    try {
      if (!baseUrl) {
        throw new Error("API base URL is not defined");
      }

      const { key, language, value } = newTranslation;

      if (!key.trim() || !language.trim() || !value.trim()) {
        throw new Error("All fields are required");
      }

      if (isDuplicateTranslation(key, language)) {
        throw new Error(
          `Translation already exists for key "${key}" in "${language}"`
        );
      }

      const res = await axios.post(`${baseUrl}/translations`, {
        key,
        language,
        value,
      });
      const created = res.data;

      setTranslations((prev) => [...prev, created]);
      i18n.addResource(
        created.language,
        "translation",
        created.key,
        created.value
      );

      setNewTranslation({ key: "", language: "ar", value: "" });
      showNotification(`Translation added successfully: ${key} (${language})`);
      setShowAddForm(false); // Close the form after successful addition
    } catch (err) {
      console.error("Error adding translation:", err);
      showNotification(
        `Error: ${err.message || "Failed to add translation"}`,
        "error"
      );
    }
  };

  /* ------------------------------ EDIT ------------------------------ */
  const startEditing = (translation) => {
    setTranslationToEdit(translation);
    setEditModalOpen(true);
  };

  const handleUpdateSuccess = (updated) => {
    setEditModalOpen(false);
    setTranslationToEdit(null);

    setTranslations((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t))
    );

    i18n.addResource(
      updated.language,
      "translation",
      updated.key,
      updated.value
    );

    showNotification(`Translation updated successfully: ${updated.key}`);
  };

  /* ------------------------------ DELETE ------------------------------ */
  const handleDelete = async (id) => {
    setConfirmDelete(id);
  };

  const confirmDeleteTranslation = async () => {
    if (!confirmDelete) return;

    try {
      if (!baseUrl) {
        throw new Error("API base URL is not defined");
      }

      await axios.delete(`${baseUrl}/translations/${confirmDelete}`);

      const deletedItem = translations.find((t) => t._id === confirmDelete);
      setTranslations((prev) => prev.filter((t) => t._id !== confirmDelete));
      showNotification(`Translation deleted successfully`);
    } catch (err) {
      console.error("Error deleting translation:", err);
      showNotification(`Error deleting translation: ${err.message}`, "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  /* ------------------------------ CSV IMPORT ------------------------------ */
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setImportStats({
      total: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: 0,
    });
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    setImportStats({
      total: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: 0,
    });

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const validRows = results.data.filter(
          (row) => row.key && row.language && row.value
        );

        let successCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        let duplicatesList = [];

        setImportStats((prev) => ({ ...prev, total: validRows.length }));

        for (const row of validRows) {
          try {
            const { key, language, value } = row;

            if (isDuplicateTranslation(key, language)) {
              duplicateCount++;
              duplicatesList.push(`${key} (${language})`);
              setImportStats((prev) => ({
                ...prev,
                duplicates: prev.duplicates + 1,
                failed: prev.failed + 1,
              }));
              continue;
            }

            const res = await axios.post(`${baseUrl}/translations`, {
              key,
              language,
              value,
            });

            const created = res.data;
            setTranslations((prev) => [...prev, created]);
            i18n.addResource(
              created.language,
              "translation",
              created.key,
              created.value
            );

            successCount++;
            setImportStats((prev) => ({ ...prev, success: prev.success + 1 }));
          } catch (error) {
            console.error("Error adding translation from CSV row:", error);

            if (error.response && error.response.status === 409) {
              duplicateCount++;
              setImportStats((prev) => ({
                ...prev,
                duplicates: prev.duplicates + 1,
                failed: prev.failed + 1,
              }));
            } else {
              errorCount++;
              setImportStats((prev) => ({
                ...prev,
                errors: prev.errors + 1,
                failed: prev.failed + 1,
              }));
            }
          }
        }

        setIsImporting(false);

        let message = `CSV import completed: ${successCount} of ${validRows.length} records imported successfully.`;
        if (duplicateCount > 0) {
          message += ` ${duplicateCount} duplicates skipped.`;
        }
        if (errorCount > 0) {
          message += ` ${errorCount} records failed due to errors.`;
        }

        showNotification(message, successCount > 0 ? "success" : "error");

        if (successCount > 0) {
          setShowImportForm(false); // Close import form on success
        }
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setIsImporting(false);
        showNotification(
          `Error parsing CSV file: ${err.message || "Unknown error"}`,
          "error"
        );
      },
    });
  };

  /* ------------------------------ CSV EXPORT ------------------------------ */
  const handleExportCSV = () => {
    const data = filteredTranslations.map((t) => ({
      key: t.key,
      language: t.language,
      value: t.value,
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "translations_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${data.length} translations to CSV`);
  };

  /* ------------------------------ SORTING ------------------------------ */
  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    // Reset to first page when sorting changes
    setPage(1);
  };

  /* ------------------------------ FILTERING ------------------------------ */
  const filteredTranslations = useMemo(() => {
    return translations.filter((t) => {
      const matchesSearch =
        searchTerm === "" ||
        t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.value.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLanguage =
        filterLanguage === "" || t.language === filterLanguage;

      return matchesSearch && matchesLanguage;
    });
  }, [translations, searchTerm, filterLanguage]);

  // Apply sorting and pagination
  const paginatedSortedTranslations = useMemo(() => {
    // Sort
    const sorted = [...filteredTranslations].sort((a, b) => {
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

    // Paginate
    const startIndex = (page - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTranslations, sortConfig, page, itemsPerPage]);

  // Get unique languages for filter dropdown
  const languages = useMemo(() => {
    return [...new Set(translations.map((t) => t.language))];
  }, [translations]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTranslations.length / itemsPerPage);
  }, [filteredTranslations, itemsPerPage]);

  // Handle page changes
  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterLanguage("");
    setSortConfig({ key: "key", direction: "ascending" });
    setPage(1);
  };

  // Determine theme classes
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
      ? "bg-gray-800 text-gray-100 border-gray-700"
      : "bg-gray-100 text-gray-800 border-gray-200",
    tableRow: darkMode
      ? "border-gray-700 hover:bg-gray-600"
      : "border-gray-200 hover:bg-gray-50",
    tableCell: darkMode ? "border-gray-700" : "border-gray-200",
    notification: {
      success: darkMode
        ? "bg-green-900 border-green-700 text-green-100"
        : "bg-green-100 border-green-500 text-green-800",
      error: darkMode
        ? "bg-red-900 border-red-700 text-red-100"
        : "bg-red-100 border-red-500 text-red-800",
    },
    badge: {
      ar: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      en: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    },
  };

  return (
    <div
      className={`p-6 rounded-lg ${themeClasses.container} transition-all duration-200 min-h-screen`}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Globe className="mr-2 h-6 w-6" />
            Translation Manager
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
            Manage application translations easily
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showImportForm) setShowImportForm(false);
            }}
            className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.primary}`}
          >
            {showAddForm ? (
              <X className="mr-1 h-4 w-4" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            {showAddForm ? "Cancel" : "Add New"}
          </button>

          <button
            onClick={() => {
              setShowImportForm(!showImportForm);
              if (showAddForm) setShowAddForm(false);
            }}
            className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.success}`}
          >
            {showImportForm ? (
              <X className="mr-1 h-4 w-4" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            {showImportForm ? "Cancel" : "Import"}
          </button>

          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.secondary}`}
            disabled={filteredTranslations.length === 0}
          >
            <DownloadCloud className="mr-1 h-4 w-4" />
            Export
          </button>

          <button
            onClick={fetchTranslations}
            className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.ghost}`}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg shadow-md border-l-4 flex justify-between items-center transition-all duration-300 ${
            notification.type === "error"
              ? themeClasses.notification.error
              : themeClasses.notification.success
          }`}
        >
          <div className="flex items-center">
            {notification.type === "error" ? (
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            )}
            <p>{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ADD NEW FORM */}
      {showAddForm && (
        <div
          className={`p-6 rounded-lg shadow-md mb-6 border ${themeClasses.card} transition-all duration-200`}
        >
          <form onSubmit={handleAddTranslation} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Add New Translation
              </h2>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 font-medium text-sm">Key:</label>
                <input
                  type="text"
                  name="key"
                  value={newTranslation.key}
                  onChange={handleInputChange}
                  required
                  placeholder="translation.key"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-sm">
                  Language:
                </label>
                <select
                  name="language"
                  value={newTranslation.language}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                >
                  <option value="ar">Arabic (ar)</option>
                  <option value="en">English (en)</option>
                  {/* Add other language options if needed */}
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-sm">Value:</label>
                <input
                  type="text"
                  name="value"
                  value={newTranslation.value}
                  onChange={handleInputChange}
                  required
                  placeholder="Translated text"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 border ${themeClasses.button.ghost}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.primary}`}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Translation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IMPORT FROM CSV */}
      {showImportForm && (
        <div
          className={`p-6 rounded-lg shadow-md mb-6 border ${themeClasses.card} transition-all duration-200`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Import from CSV
            </h2>
            <button
              onClick={() => setShowImportForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg mb-4 text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">CSV Format Instructions:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>
                    File must have columns named: "key", "language", and "value"
                  </li>
                  <li>Each row represents one translation</li>
                  <li>
                    Language codes should be consistent (e.g., "ar", "en")
                  </li>
                  <li>Keys must be unique per language</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-grow">
                <label
                  className={`flex justify-center w-full h-24 px-4 transition ${themeClasses.input} border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-500 focus:outline-none`}
                >
                  <span className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    <span className="font-medium text-sm mt-2">
                      {csvFile ? csvFile.name : "Select a CSV file"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Click to browse
                    </span>
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="md:w-48 flex-shrink-0">
                <button
                  onClick={handleImportCSV}
                  disabled={!csvFile || isImporting}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center justify-center ${
                    !csvFile || isImporting
                      ? "bg-gray-400 cursor-not-allowed dark:bg-gray-700 text-gray-200"
                      : themeClasses.button.success
                  }`}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Import Stats */}
          {importStats.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-3 flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Import Results:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total records:
                  </span>
                  <span className="font-medium">{importStats.total}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    Successfully imported:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {importStats.success}
                  </span>
                </div>

                {importStats.failed > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">
                        Failed imports:
                      </span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {importStats.failed}
                      </span>
                    </div>

                    {importStats.duplicates > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-600 dark:text-red-400 ml-4">
                          - Duplicates:
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {importStats.duplicates}
                        </span>
                      </div>
                    )}

                    {importStats.errors > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-600 dark:text-red-400 ml-4">
                          - Other errors:
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {importStats.errors}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
                  style={{
                    width: `${
                      (importStats.success / importStats.total) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH, FILTER, AND RESULTS COUNT */}
      <div
        className={`mb-6 border rounded-lg shadow-sm p-4 ${themeClasses.card}`}
      >
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by key or value..."
              className={`pl-10 w-full px-4 py-2 border rounded-lg ${themeClasses.input}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative">
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className={`pl-8 pr-8 py-2 border rounded-lg appearance-none ${themeClasses.input}`}
              >
                <option value="">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "ar"
                      ? "Arabic (ar)"
                      : lang === "en"
                      ? "English (en)"
                      : lang}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Globe className="h-4 w-4 text-gray-400" />
              </div>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`px-3 py-2 rounded-lg border flex items-center ${themeClasses.button.ghost}`}
            >
              <Filter className="h-4 w-4 mr-1" />
              {isFilterPanelOpen ? "Hide Filters" : "More Filters"}
            </button>

            {(searchTerm || filterLanguage) && (
              <button
                onClick={clearFilters}
                className={`px-3 py-2 rounded-lg border flex items-center ${themeClasses.button.ghost}`}
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {isFilterPanelOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Additional filters could be added here */}
            <div>
              <label className="block mb-2 text-sm font-medium">
                Items per page
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Sort by</label>
              <div className="flex gap-2">
                <select
                  value={sortConfig.key}
                  onChange={(e) =>
                    setSortConfig({ ...sortConfig, key: e.target.value })
                  }
                  className={`flex-grow px-3 py-2 border rounded-lg ${themeClasses.input}`}
                >
                  <option value="key">Key</option>
                  <option value="language">Language</option>
                  <option value="value">Value</option>
                </select>
                <button
                  onClick={() =>
                    setSortConfig({
                      ...sortConfig,
                      direction:
                        sortConfig.direction === "ascending"
                          ? "descending"
                          : "ascending",
                    })
                  }
                  className={`px-3 py-2 rounded-lg border ${themeClasses.button.ghost}`}
                >
                  {sortConfig.direction === "ascending" ? (
                    <ArrowUp className="h-5 w-5" />
                  ) : (
                    <ArrowDown className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-t pt-4 border-gray-200 dark:border-gray-700 text-sm">
          <div className="font-medium">
            {filteredTranslations.length === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">
                No translations found
              </span>
            ) : (
              <>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {filteredTranslations.length}
                </span>
                <span> translations found</span>
                {filteredTranslations.length !== translations.length && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    (filtered from {translations.length} total)
                  </span>
                )}
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div
              className={`mt-3 sm:mt-0 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Showing {(page - 1) * itemsPerPage + 1}-
              {Math.min(page * itemsPerPage, filteredTranslations.length)} of{" "}
              {filteredTranslations.length}
            </div>
          )}
        </div>
      </div>

      {/* Loading and error states */}
      {isLoading && !error && (
        <div className="flex justify-center items-center p-12 mb-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Loading translations...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-lg shadow-sm flex items-start">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error Loading Translations</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={fetchTranslations}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* TABLE OF TRANSLATIONS */}
      {!isLoading && !error && filteredTranslations.length > 0 && (
        <div
          className={`border rounded-lg shadow overflow-hidden ${themeClasses.card}`}
        >
          <div className="overflow-x-auto">
            <table
              className={`min-w-full divide-y ${
                darkMode ? "divide-gray-200" : "divide-gray-700"
              }`}
            >
              <thead className={themeClasses.tableHeader}>
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("key")}
                  >
                    <div className="flex items-center">
                      Key
                      {sortConfig.key === "key" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("language")}
                  >
                    <div className="flex items-center">
                      Language
                      {sortConfig.key === "language" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort("value")}
                  >
                    <div className="flex items-center">
                      Value
                      {sortConfig.key === "value" && (
                        <span className="ml-1">
                          {sortConfig.direction === "ascending" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedSortedTranslations.map((t) => (
                  <tr
                    key={t._id}
                    className={`${themeClasses.tableRow} transition-colors duration-150`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {t.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          themeClasses.badge[t.language] ||
                          themeClasses.badge.default
                        }`}
                      >
                        {t.language}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">
                      {t.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => startEditing(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className={`px-6 py-4 border-t flex items-center justify-between ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    page === 1
                      ? darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    page >= totalPages
                      ? darkMode
                        ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : darkMode
                      ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Showing{" "}
                    <span className="font-medium">
                      {(page - 1) * itemsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        page * itemsPerPage,
                        filteredTranslations.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {filteredTranslations.length}
                    </span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    {/* First Page Button */}
                    <button
                      onClick={() => goToPage(1)}
                      disabled={page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                        page === 1
                          ? darkMode
                            ? "bg-gray-800 border-gray-600 text-gray-600 cursor-not-allowed"
                            : "bg-gray-100 border-gray-300 text-gray-300 cursor-not-allowed"
                          : darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">First Page</span>
                      {/* Double Left Arrow */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0zM4.293 15.707a1 1 0 010-1.414L8.586 10l-4.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1}
                      className={`relative inline-flex items-center px-2 py-2 border text-sm font-medium ${
                        page === 1
                          ? darkMode
                            ? "bg-gray-800 border-gray-600 text-gray-600 cursor-not-allowed"
                            : "bg-gray-100 border-gray-300 text-gray-300 cursor-not-allowed"
                          : darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      {/* Single Left Arrow */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Calculate page number depending on current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => goToPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? darkMode
                                ? "z-10 bg-blue-900/30 border-blue-500 text-blue-300"
                                : "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : darkMode
                              ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages}
                      className={`relative inline-flex items-center px-2 py-2 border text-sm font-medium ${
                        page >= totalPages
                          ? darkMode
                            ? "bg-gray-800 border-gray-600 text-gray-600 cursor-not-allowed"
                            : "bg-gray-100 border-gray-300 text-gray-300 cursor-not-allowed"
                          : darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      {/* Single Right Arrow */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* Last Page Button */}
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={page >= totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                        page >= totalPages
                          ? darkMode
                            ? "bg-gray-800 border-gray-600 text-gray-600 cursor-not-allowed"
                            : "bg-gray-100 border-gray-300 text-gray-300 cursor-not-allowed"
                          : darkMode
                          ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Last Page</span>
                      {/* Double Right Arrow */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M15.707 15.707a1 1 0 01-1.414 0L9.293 10.707a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zM9.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No results state */}
      {!isLoading && !error && filteredTranslations.length === 0 && (
        <div
          className={`border rounded-lg shadow-sm p-12 text-center ${themeClasses.card}`}
        >
          <div className="flex flex-col items-center">
            <Search className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No translations found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              {searchTerm || filterLanguage
                ? "No translations match your current filters. Try adjusting your search criteria."
                : "There are no translations in the system yet. Add your first translation to get started."}
            </p>
            {searchTerm || filterLanguage ? (
              <button
                onClick={clearFilters}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${themeClasses.button.primary}`}
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${themeClasses.button.primary}`}
              >
                Add New Translation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-90"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${themeClasses.card}`}
            >
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium">
                      Delete Translation
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete this translation? This
                        action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmDeleteTranslation}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm ${
                    darkMode
                      ? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 focus:ring-gray-500"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Translation Modal */}
      <EditTranslationModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTranslationToEdit(null);
        }}
        translation={translationToEdit}
        baseUrl={baseUrl}
        darkMode={darkMode}
        onSaveSuccess={handleUpdateSuccess}
      />
    </div>
  );
}

export default TranslationManager;
