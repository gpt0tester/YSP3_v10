import React, { useState } from "react";

const QueryTemplateForm = ({ onSave, darkMode }) => {
  const initialState = {
    name: "",
    qf: "",
    fl: "",
    pf: "",
    pf2: "",
    pf3: "",
    ps: "",
    ps2: "",
    ps3: "",
    mm: "",
    facetFields: "",
  };

  const [template, setTemplate] = useState(initialState);
  const [isDefault, setIsDefault] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTemplate((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation for required fields
    if (!template.name.trim()) newErrors.name = "Template name is required";
    if (!template.qf.trim()) newErrors.qf = "Query fields are required";
    if (!template.fl.trim()) newErrors.fl = "Field list is required";

    // Number validation for ps, ps2, ps3 fields if they have values
    if (template.ps && isNaN(Number(template.ps))) {
      newErrors.ps = "Must be a number";
    }
    if (template.ps2 && isNaN(Number(template.ps2))) {
      newErrors.ps2 = "Must be a number";
    }
    if (template.ps3 && isNaN(Number(template.ps3))) {
      newErrors.ps3 = "Must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Convert the comma-separated string to an array of trimmed strings
      const facetFieldsArray = template.facetFields
        ? template.facetFields
            .split(",")
            .map((field) => field.trim())
            .filter(Boolean) // remove empty strings
        : [];

      // Build the final template object
      const finalTemplate = {
        ...template,
        facetFields: facetFieldsArray,
      };

      // Pass both the form data and the "isDefault" flag up to the parent
      await onSave(finalTemplate, isDefault);

      // Reset form on successful submission
      setTemplate(initialState);
      setIsDefault(false);
      setActiveTab("basic");
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define theme classes
  const themeClasses = {
    container: darkMode
      ? "dark:bg-gray-800 dark:text-gray-100"
      : "bg-white text-gray-800",
    card: darkMode
      ? "dark:bg-gray-700 dark:text-gray-100"
      : "bg-white text-gray-800 border border-gray-200",
    inputField: darkMode
      ? "bg-gray-600 text-gray-100 border-gray-500 focus:border-blue-400"
      : "bg-gray-50 text-gray-800 border-gray-300 focus:border-blue-500",
    label: darkMode ? "dark:text-gray-200" : "text-gray-700",
    tab: {
      active: darkMode
        ? "bg-gray-600 text-white border-b-2 border-blue-400"
        : "bg-white text-blue-600 border-b-2 border-blue-500",
      inactive: darkMode
        ? "dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-600"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
    },
    button: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-400",
    },
  };

  return (
    <div
      className={`rounded-lg shadow-md overflow-hidden ${themeClasses.card} transition-all duration-200`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <h2 className="text-xl font-bold">Add New Query Template</h2>
        <p className="text-blue-100 text-sm mt-1">
          Configure search parameters and behavior
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-600">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "basic"
              ? themeClasses.tab.active
              : themeClasses.tab.inactive
          }`}
          onClick={() => setActiveTab("basic")}
        >
          Basic Settings
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "phrase"
              ? themeClasses.tab.active
              : themeClasses.tab.inactive
          }`}
          onClick={() => setActiveTab("phrase")}
        >
          Phrase Settings
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

      <form onSubmit={handleSubmit} className="p-6">
        {/* Basic Settings Tab */}
        {activeTab === "basic" && (
          <div className="space-y-4">
            {/* Template Name */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
              >
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={template.name}
                onChange={handleChange}
                placeholder="Enter a descriptive name"
                className={`w-full px-4 py-2 rounded-md border ${
                  themeClasses.inputField
                } ${errors.name ? "border-red-500" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Query Fields */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
              >
                Query Fields (qf) <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Fields to search with optional boosts
                </span>
              </label>
              <input
                type="text"
                name="qf"
                value={template.qf}
                onChange={handleChange}
                placeholder="e.g., title^3 description^2 content^1"
                className={`w-full px-4 py-2 rounded-md border ${
                  themeClasses.inputField
                } ${errors.qf ? "border-red-500" : ""}`}
              />
              {errors.qf && (
                <p className="mt-1 text-sm text-red-500">{errors.qf}</p>
              )}
            </div>

            {/* Field List */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
              >
                Fields List (fl) <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Fields to return in search results
                </span>
              </label>
              <input
                type="text"
                name="fl"
                value={template.fl}
                onChange={handleChange}
                placeholder="e.g., id name title description"
                className={`w-full px-4 py-2 rounded-md border ${
                  themeClasses.inputField
                } ${errors.fl ? "border-red-500" : ""}`}
              />
              {errors.fl && (
                <p className="mt-1 text-sm text-red-500">{errors.fl}</p>
              )}
            </div>

            {/* Minimum Match */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
              >
                Minimum Match (mm)
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Minimum number of terms that must match
                </span>
              </label>
              <input
                type="text"
                name="mm"
                value={template.mm}
                onChange={handleChange}
                placeholder="e.g., 75% or 2"
                className={`w-full px-4 py-2 rounded-md border ${themeClasses.inputField}`}
              />
            </div>

            {/* Default Template Checkbox */}
            <div className="pt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className={`ml-2 text-sm ${themeClasses.label}`}>
                  Set as default template
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Phrase Settings Tab */}
        {activeTab === "phrase" && (
          <div className="space-y-4">
            <div className="mb-4">
              <div
                className={`mt-4 p-3 border-l-4 border-blue-500 rounded ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-blue-200"
                    : "bg-blue-50 border-gray-200 text-blue-800"
                }   rounded-lg border`}
              >
                <p className="text-sm">
                  Phrase settings improve relevance for multi-word search
                  queries by considering word proximity and order.
                </p>
              </div>
            </div>

            {/* Two-column layout for related fields */}
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
                  value={template.pf}
                  onChange={handleChange}
                  placeholder="e.g., title^5 description^2"
                  className={`w-full px-4 py-2 rounded-md border ${themeClasses.inputField}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Boosts documents where all query terms appear in close
                  proximity
                </p>
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
                  value={template.ps}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                  className={`w-full px-4 py-2 rounded-md border ${
                    themeClasses.inputField
                  } ${errors.ps ? "border-red-500" : ""}`}
                />
                {errors.ps && (
                  <p className="mt-1 text-sm text-red-500">{errors.ps}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  How far apart terms can be
                </p>
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
                  value={template.pf2}
                  onChange={handleChange}
                  placeholder="e.g., title^5 description^2"
                  className={`w-full px-4 py-2 rounded-md border ${themeClasses.inputField}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Boosts when adjacent pairs of query terms appear together
                </p>
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
                  value={template.ps2}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                  className={`w-full px-4 py-2 rounded-md border ${
                    themeClasses.inputField
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
                  value={template.pf3}
                  onChange={handleChange}
                  placeholder="e.g., title^5 description^2"
                  className={`w-full px-4 py-2 rounded-md border ${themeClasses.inputField}`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Boosts when three consecutive query terms appear together
                </p>
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
                  value={template.ps3}
                  onChange={handleChange}
                  placeholder="e.g., 2"
                  className={`w-full px-4 py-2 rounded-md border ${
                    themeClasses.inputField
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
            {/* Facet Fields */}
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${themeClasses.label}`}
              >
                Facet Fields
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  Fields to use for faceted navigation
                </span>
              </label>
              <textarea
                name="facetFields"
                value={template.facetFields}
                onChange={handleChange}
                placeholder="e.g., category, author, tags, price_range"
                rows="3"
                className={`w-full px-4 py-2 rounded-md border ${themeClasses.inputField}`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter multiple fields separated by commas
              </p>
            </div>

            {/* Help information */}
            <div
              className={`mt-4 p-4 ${
                darkMode
                  ? "text-gray-300 bg-gray-700 border-gray-600"
                  : "text-gray-600 bg-gray-50 border-gray-200"
              }   rounded-lg border`}
            >
              <h3 className={`font-medium mb-2 ${themeClasses.label}`}>
                About Advanced Settings
              </h3>
              <p className="text-sm">
                Facet fields allow users to filter search results by categories
                or attributes. For example, adding "category" as a facet field
                would allow users to narrow down results by selecting specific
                categories.
              </p>
              <p className="text-sm">
                Common facet fields include: category, brand, price_range,
                rating, color, size, etc.
              </p>
            </div>
          </div>
        )}

        {/* Form Buttons - Always visible regardless of active tab */}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTemplate(initialState);
              setIsDefault(false);
              setErrors({});
            }}
            className={`px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
              darkMode
                ? "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
              themeClasses.button.primary
            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Saving..." : "Save Template"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QueryTemplateForm;
