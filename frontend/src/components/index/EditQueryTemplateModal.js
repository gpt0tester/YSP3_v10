import React, { useState, useEffect } from "react";
import axios from "axios";

const Modal = ({ isOpen, onClose, children, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className={`${
          darkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden transition-transform duration-300 transform`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default function EditQueryTemplateModal({
  isOpen,
  onClose,
  template,
  baseUrl,
  darkMode,
  onSaveSuccess,
}) {
  const [localTemplate, setLocalTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [originalTemplate, setOriginalTemplate] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state whenever the parent sets a new 'template'
  useEffect(() => {
    if (template) {
      // Handle facetFields if it's an array in the API but we need a string for the form
      const formattedTemplate = {
        ...template,
        facetFields: Array.isArray(template.facetFields)
          ? template.facetFields.join(", ")
          : template.facetFields || "",
      };

      setLocalTemplate(formattedTemplate);
      setOriginalTemplate(JSON.stringify(formattedTemplate));
      setActiveTab("basic");
      setErrors({});
    } else {
      setLocalTemplate(null);
      setOriginalTemplate(null);
    }
  }, [template]);

  // Check for changes
  useEffect(() => {
    if (localTemplate && originalTemplate) {
      setHasChanges(JSON.stringify(localTemplate) !== originalTemplate);
    }
  }, [localTemplate, originalTemplate]);

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!localTemplate) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="flex justify-center items-center p-12 text-gray-500 dark:text-gray-300">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent"></div>
        </div>
      </Modal>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalTemplate((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!localTemplate.name?.trim())
      newErrors.name = "Template name is required";
    if (!localTemplate.qf?.trim()) newErrors.qf = "Query fields are required";
    if (!localTemplate.fl?.trim()) newErrors.fl = "Field list is required";

    // Number validation for ps, ps2, ps3 fields if they have values
    if (localTemplate.ps && isNaN(Number(localTemplate.ps))) {
      newErrors.ps = "Must be a number";
    }
    if (localTemplate.ps2 && isNaN(Number(localTemplate.ps2))) {
      newErrors.ps2 = "Must be a number";
    }
    if (localTemplate.ps3 && isNaN(Number(localTemplate.ps3))) {
      newErrors.ps3 = "Must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Convert facetFields from comma-separated string to array
      const templateToSave = { ...localTemplate };

      // Handle facetFields
      if (typeof templateToSave.facetFields === "string") {
        templateToSave.facetFields = templateToSave.facetFields
          .split(",")
          .map((field) => field.trim())
          .filter(Boolean);
      }

      // Send update to API
      const response = await axios.put(
        `${baseUrl}/query-templates/${templateToSave._id}`,
        templateToSave
      );

      // If API returns updated document, use that instead
      const updatedTemplate = response.data || templateToSave;

      if (onSaveSuccess) onSaveSuccess(updatedTemplate);
      if (onClose) onClose();
    } catch (error) {
      console.error("Error updating template:", error);
      setErrors({ api: error.message || "Error updating template" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to cancel?"
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Theme classes
  const themeClasses = {
    container: darkMode
      ? "bg-gray-800 text-gray-100"
      : "bg-white text-gray-800",
    input: darkMode
      ? "bg-gray-700 text-gray-100 border-gray-600 focus:border-blue-400"
      : "bg-gray-50 text-gray-800 border-gray-300 focus:border-blue-500",
    label: darkMode ? "text-gray-200" : "text-gray-700",
    tab: {
      active: darkMode
        ? "bg-gray-700 text-white border-b-2 border-blue-400"
        : "bg-white text-blue-600 border-b-2 border-blue-500",
      inactive: darkMode
        ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
    },
    button: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    },
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} darkMode={darkMode}>
      <div className={themeClasses.container}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold">Edit Template</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {localTemplate.name}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "basic"
                  ? themeClasses.tab.active
                  : themeClasses.tab.inactive
              }`}
              onClick={() => setActiveTab("basic")}
            >
              Basic
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "phrase"
                  ? themeClasses.tab.active
                  : themeClasses.tab.inactive
              }`}
              onClick={() => setActiveTab("phrase")}
            >
              Phrase
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "advanced"
                  ? themeClasses.tab.active
                  : themeClasses.tab.inactive
              }`}
              onClick={() => setActiveTab("advanced")}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div
          className="overflow-y-auto p-6"
          style={{ maxHeight: "calc(90vh - 170px)" }}
        >
          {/* API error message */}
          {errors.api && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <p>{errors.api}</p>
            </div>
          )}

          {/* Basic Tab */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                >
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={localTemplate.name || ""}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    themeClasses.input
                  } ${errors.name ? "border-red-500" : ""}`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                >
                  Query Fields (qf) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  name="qf"
                  value={localTemplate.qf || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., title^3 description^2 content^1"
                  className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    themeClasses.input
                  } ${errors.qf ? "border-red-500" : ""}`}
                />
                {errors.qf && (
                  <p className="mt-1 text-sm text-red-500">{errors.qf}</p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                >
                  Fields List (fl) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  name="fl"
                  value={localTemplate.fl || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., id name title description"
                  className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    themeClasses.input
                  } ${errors.fl ? "border-red-500" : ""}`}
                />
                {errors.fl && (
                  <p className="mt-1 text-sm text-red-500">{errors.fl}</p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                >
                  Minimum Match (mm)
                </label>
                <input
                  type="text"
                  name="mm"
                  value={localTemplate.mm || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., 75% or 2"
                  className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${themeClasses.input}`}
                />
              </div>
            </div>
          )}

          {/* Phrase Tab */}
          {activeTab === "phrase" && (
            <div>
              <div
                className={`mt-4 p-3 border-l-4 border-blue-500 rounded ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-blue-200"
                    : "bg-blue-50 border-gray-200 text-blue-800"
                }   rounded-lg border`}
              >
                <p className="text-sm mb-2">
                  Phrase settings improve relevance for multi-word search
                  queries by considering word proximity and order.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phrase Fields */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Phrase Fields (pf)
                  </label>
                  <input
                    type="text"
                    name="pf"
                    value={localTemplate.pf || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., title^5 description^2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${themeClasses.input}`}
                  />
                </div>

                {/* Phrase Slop */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Phrase Slop (ps)
                  </label>
                  <input
                    type="text"
                    name="ps"
                    value={localTemplate.ps || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                      themeClasses.input
                    } ${errors.ps ? "border-red-500" : ""}`}
                  />
                  {errors.ps && (
                    <p className="mt-1 text-sm text-red-500">{errors.ps}</p>
                  )}
                </div>

                {/* Bigram Fields */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Bigram Fields (pf2)
                  </label>
                  <input
                    type="text"
                    name="pf2"
                    value={localTemplate.pf2 || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., title^5 description^2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${themeClasses.input}`}
                  />
                </div>

                {/* Bigram Slop */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Bigram Slop (ps2)
                  </label>
                  <input
                    type="text"
                    name="ps2"
                    value={localTemplate.ps2 || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                      themeClasses.input
                    } ${errors.ps2 ? "border-red-500" : ""}`}
                  />
                  {errors.ps2 && (
                    <p className="mt-1 text-sm text-red-500">{errors.ps2}</p>
                  )}
                </div>

                {/* Trigram Fields */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Trigram Fields (pf3)
                  </label>
                  <input
                    type="text"
                    name="pf3"
                    value={localTemplate.pf3 || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., title^5 description^2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${themeClasses.input}`}
                  />
                </div>

                {/* Trigram Slop */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                  >
                    Trigram Slop (ps3)
                  </label>
                  <input
                    type="text"
                    name="ps3"
                    value={localTemplate.ps3 || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 2"
                    className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                      themeClasses.input
                    } ${errors.ps3 ? "border-red-500" : ""}`}
                  />
                  {errors.ps3 && (
                    <p className="mt-1 text-sm text-red-500">{errors.ps3}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "advanced" && (
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
                >
                  Facet Fields
                </label>
                <textarea
                  rows={3}
                  name="facetFields"
                  value={localTemplate.facetFields || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., category, author, tags, price_range"
                  className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 ${themeClasses.input}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter multiple fields separated by commas
                </p>
              </div>

              <div
                className={`mt-4 p-4 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-50 border-gray-200"
                }   rounded-lg border`}
              >
                <h3 className={`font-medium mb-2 ${themeClasses.label}`}>
                  About Facet Fields
                </h3>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  } mb-2`}
                >
                  Facet fields allow users to filter search results by
                  categories or attributes. For example, adding "category" as a
                  facet field would allow users to narrow down results by
                  selecting specific categories.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with actions - always visible */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                darkMode
                  ? "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                themeClasses.button.primary
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isSaving || !hasChanges ? "opacity-75 cursor-not-allowed" : ""
              }`}
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
