import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// A very reusable modal with improved styling
const Modal = ({ isOpen, onClose, children, darkMode }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto transform animate-modal-in ${
          darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * A single modal that can edit a "field", "fieldType", "dynamicField", or "copyField"
 * by passing schemaType, item, etc.
 */
const EditSchemaItemModal = ({
  isOpen,
  onClose,
  schemaType, // "field", "fieldType", "dynamicField", "copyField"
  item, // the data object to edit
  collectionName,
  baseUrl,
  onSaveSuccess,
  darkMode,
}) => {
  // We'll keep a local copy of the item in state
  // so we can edit form fields without mutating original directly.
  const [localItem, setLocalItem] = useState(null);

  // For copyField, we need to track old source/dest separately
  // if we want to do "replace" logic
  const [oldSource, setOldSource] = useState("");
  const [oldDest, setOldDest] = useState("");

  // JSON Editor state for fieldType
  const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState("{}");
  const [jsonError, setJsonError] = useState("");

  // Loading and saving states
  const [isSaving, setIsSaving] = useState(false);

  // Initialize localItem whenever the `item` or `schemaType` changes
  useEffect(() => {
    if (!item) {
      setLocalItem(null);
      return;
    }
    // Deep copy to avoid modifying the original object
    const copy = JSON.parse(JSON.stringify(item));

    // If copyField, we might store old source/dest for the replace logic
    if (schemaType === "copyField") {
      // Expect item has { source, dest, maxChars? }
      setOldSource(copy.source);
      setOldDest(copy.dest);
    }

    setLocalItem(copy);

    // If it's a fieldType, also initialize the JSON editor content
    if (schemaType === "fieldType") {
      setJsonContent(JSON.stringify(copy, null, 2));
    }
  }, [item, schemaType]);

  if (!localItem)
    return (
      <Modal isOpen={isOpen} onClose={onClose} darkMode={darkMode}>
        <div className="p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3">Loading...</p>
        </div>
      </Modal>
    );

  // A small helper to set localItem fields
  const updateField = (key, value) => {
    setLocalItem((prev) => {
      const updated = { ...prev, [key]: value };

      // If we're in fieldType mode, also update JSON
      if (schemaType === "fieldType" && !isJsonEditorOpen) {
        setJsonContent(JSON.stringify(updated, null, 2));
      }

      return updated;
    });
  };

  // Update form from JSON editor (for fieldType)
  const updateFormFromJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setLocalItem(parsed);
      setJsonError("");
    } catch (e) {
      setJsonError("Invalid JSON: " + e.message);
    }
  };

  const handleSave = async () => {
    if (!collectionName) {
      toast.error("No collection selected!");
      return;
    }

    // If we're in JSON mode and it's a fieldType, try to apply the JSON first
    if (isJsonEditorOpen && schemaType === "fieldType") {
      try {
        const parsed = JSON.parse(jsonContent);
        setLocalItem(parsed);
      } catch (e) {
        toast.error("Invalid JSON: " + e.message);
        return;
      }
    }

    setIsSaving(true);
    try {
      // We'll do a small switch on schemaType to decide
      // the PUT route or "replace" logic.
      switch (schemaType) {
        case "field":
          // call PUT /:collectionName/fields
          await axios.put(
            `${baseUrl}/solr/${collectionName}/fields`,
            localItem
          );
          toast.success(`Field '${localItem.name}' updated successfully`);
          break;

        case "fieldType":
          // call PUT /:collectionName/fieldTypes
          await axios.put(
            `${baseUrl}/solr/${collectionName}/fieldTypes`,
            isJsonEditorOpen ? JSON.parse(jsonContent) : localItem
          );
          toast.success(`FieldType '${localItem.name}' updated successfully`);
          break;

        case "dynamicField":
          // call PUT /:collectionName/dynamicFields
          await axios.put(
            `${baseUrl}/solr/${collectionName}/dynamicFields`,
            localItem
          );
          toast.success(
            `DynamicField '${localItem.name}' updated successfully`
          );
          break;

        case "copyField":
          // call PUT /:collectionName/copyFields with oldSource, oldDest, newDef
          // localItem has { source, dest, maxChars? }
          await axios.put(`${baseUrl}/solr/${collectionName}/copyFields`, {
            oldSource,
            oldDest,
            newDef: localItem,
          });
          toast.success(
            `CopyField source='${oldSource}' => '${oldDest}' updated`
          );
          break;

        default:
          toast.error("Invalid schema type for editing");
          return;
      }

      onClose();
      onSaveSuccess?.(); // re-fetch parent data
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(
        `Error saving ${schemaType}: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Get appropriate title based on schema type
  const getTitle = () => {
    switch (schemaType) {
      case "field":
        return "Edit Field";
      case "fieldType":
        return "Edit Field Type";
      case "dynamicField":
        return "Edit Dynamic Field";
      case "copyField":
        return "Edit Copy Field";
      default:
        return `Edit ${schemaType}`;
    }
  };

  // Get appropriate icon based on schema type
  const getIcon = () => {
    switch (schemaType) {
      case "field":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        );
      case "fieldType":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-green-500"
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
        );
      case "dynamicField":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-purple-500"
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
        );
      case "copyField":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        );
    }
  };

  // We'll define separate form sections for each type
  const renderFormFields = () => {
    if (schemaType === "fieldType" && isJsonEditorOpen) {
      return (
        <div>
          {jsonError && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                darkMode ? "bg-red-900 text-red-100" : "bg-red-100 text-red-700"
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
              rows={16}
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
              Validate JSON
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
      );
    }

    if (schemaType === "field") {
      // localItem: { name, type, indexed, stored, ... }
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Field Name:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              readOnly // typically name is key, maybe can't change?
            />
            <p className="mt-1 text-xs opacity-70">
              Field names are usually not editable
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Field Type:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.type || ""}
              onChange={(e) => updateField("type", e.target.value)}
            />
          </div>

          <div
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localItem.indexed || false}
                  onChange={(e) => updateField("indexed", e.target.checked)}
                />
                <div
                  className={`w-10 h-6 ${
                    localItem.indexed
                      ? "bg-blue-600"
                      : darkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                  } rounded-full shadow-inner transition-colors`}
                ></div>
                <div
                  className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    localItem.indexed ? "translate-x-5" : ""
                  }`}
                ></div>
              </div>
              <span className="font-medium">Indexed</span>
            </label>
            <p className="text-sm opacity-75 mt-1">
              Enable searching on this field
            </p>
          </div>

          <div
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localItem.stored || false}
                  onChange={(e) => updateField("stored", e.target.checked)}
                />
                <div
                  className={`w-10 h-6 ${
                    localItem.stored
                      ? "bg-green-600"
                      : darkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                  } rounded-full shadow-inner transition-colors`}
                ></div>
                <div
                  className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    localItem.stored ? "translate-x-5" : ""
                  }`}
                ></div>
              </div>
              <span className="font-medium">Stored</span>
            </label>
            <p className="text-sm opacity-75 mt-1">
              Persist field value in index
            </p>
          </div>

          <div className="md:col-span-2">
            <div
              className={`p-3 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <label className="flex items-center space-x-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={localItem.multiValued || false}
                    onChange={(e) =>
                      updateField("multiValued", e.target.checked)
                    }
                  />
                  <div
                    className={`w-10 h-6 ${
                      localItem.multiValued
                        ? "bg-purple-600"
                        : darkMode
                        ? "bg-gray-600"
                        : "bg-gray-300"
                    } rounded-full shadow-inner transition-colors`}
                  ></div>
                  <div
                    className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                      localItem.multiValued ? "translate-x-5" : ""
                    }`}
                  ></div>
                </div>
                <span className="font-medium">Multi-Valued</span>
              </label>
              <p className="text-sm opacity-75 mt-1">
                Field can contain multiple values
              </p>
            </div>
          </div>
        </div>
      );
    } else if (schemaType === "fieldType" && !isJsonEditorOpen) {
      // localItem: { name, class, analyzer, ... }
      return (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Field Type Name:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.name || ""}
              readOnly
            />
            <p className="mt-1 text-xs opacity-70">
              Field type names are usually not editable
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Java Class:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.class || ""}
              onChange={(e) => updateField("class", e.target.value)}
            />
            <p className="mt-1 text-xs opacity-70">
              The Java class that implements this field type
            </p>
          </div>

          {/* Form-based analyzer editor would go here */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Analyzer Configuration:
              </label>
              <button
                type="button"
                onClick={() => setIsJsonEditorOpen(true)}
                className={`text-sm px-3 py-1 rounded-md ${
                  darkMode
                    ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                Open JSON Editor
              </button>
            </div>

            <div
              className={`p-4 border rounded-lg ${
                darkMode
                  ? "border-gray-700 bg-gray-700"
                  : "border-gray-300 bg-gray-100"
              }`}
            >
              <div className="mb-3">
                <h4 className="font-medium text-sm">Analyzer Type:</h4>
                <div className="mt-1 text-sm opacity-80">
                  {localItem.analyzer
                    ? "Shared Analyzer (same for index and query)"
                    : localItem.indexAnalyzer && localItem.queryAnalyzer
                    ? "Separate Analyzers (different for index and query)"
                    : "No analyzers configured"}
                </div>
              </div>

              {localItem.analyzer && (
                <div className="mb-3">
                  <h4 className="font-medium text-sm">Tokenizer:</h4>
                  <div className="mt-1 text-sm opacity-80 font-mono">
                    {localItem.analyzer.tokenizer?.class || "None"}
                  </div>
                </div>
              )}

              {localItem.analyzer && localItem.analyzer.filters && (
                <div>
                  <h4 className="font-medium text-sm">Filters:</h4>
                  <div className="mt-1 text-sm font-mono space-y-1">
                    {localItem.analyzer.filters.length > 0 ? (
                      localItem.analyzer.filters.map((filter, index) => (
                        <div key={index} className="opacity-80">
                          • {filter.class}
                        </div>
                      ))
                    ) : (
                      <div className="opacity-70">No filters configured</div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs italic opacity-70">
                For detailed analyzer editing, please use the JSON editor
              </div>
            </div>
          </div>
        </div>
      );
    } else if (schemaType === "dynamicField") {
      // localItem: { name, type, indexed, stored, ... }
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Pattern Name:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <p className="mt-1 text-xs opacity-70">
              Use * as a wildcard (e.g. *_txt)
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Field Type:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.type || ""}
              onChange={(e) => updateField("type", e.target.value)}
            />
          </div>

          <div
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localItem.indexed || false}
                  onChange={(e) => updateField("indexed", e.target.checked)}
                />
                <div
                  className={`w-10 h-6 ${
                    localItem.indexed
                      ? "bg-blue-600"
                      : darkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                  } rounded-full shadow-inner transition-colors`}
                ></div>
                <div
                  className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    localItem.indexed ? "translate-x-5" : ""
                  }`}
                ></div>
              </div>
              <span className="font-medium">Indexed</span>
            </label>
            <p className="text-sm opacity-75 mt-1">
              Enable searching on matching fields
            </p>
          </div>

          <div
            className={`p-3 rounded-lg ${
              darkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <label className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localItem.stored || false}
                  onChange={(e) => updateField("stored", e.target.checked)}
                />
                <div
                  className={`w-10 h-6 ${
                    localItem.stored
                      ? "bg-green-600"
                      : darkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                  } rounded-full shadow-inner transition-colors`}
                ></div>
                <div
                  className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    localItem.stored ? "translate-x-5" : ""
                  }`}
                ></div>
              </div>
              <span className="font-medium">Stored</span>
            </label>
            <p className="text-sm opacity-75 mt-1">
              Persist field value in index
            </p>
          </div>

          <div className="md:col-span-2">
            <div
              className={`p-3 rounded-lg ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <label className="flex items-center space-x-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={localItem.multiValued || false}
                    onChange={(e) =>
                      updateField("multiValued", e.target.checked)
                    }
                  />
                  <div
                    className={`w-10 h-6 ${
                      localItem.multiValued
                        ? "bg-purple-600"
                        : darkMode
                        ? "bg-gray-600"
                        : "bg-gray-300"
                    } rounded-full shadow-inner transition-colors`}
                  ></div>
                  <div
                    className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                      localItem.multiValued ? "translate-x-5" : ""
                    }`}
                  ></div>
                </div>
                <span className="font-medium">Multi-Valued</span>
              </label>
              <p className="text-sm opacity-75 mt-1">
                Fields can contain multiple values
              </p>
            </div>
          </div>
        </div>
      );
    } else if (schemaType === "copyField") {
      // localItem: { source, dest, maxChars? }
      // oldSource/oldDest stored separately for the "PUT" logic
      return (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Source Field:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.source || ""}
              onChange={(e) => updateField("source", e.target.value)}
            />
            <p className="mt-1 text-xs opacity-70">
              Field or pattern to copy from
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Destination Field:
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.dest || ""}
              onChange={(e) => updateField("dest", e.target.value)}
            />
            <p className="mt-1 text-xs opacity-70">Field to copy to</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max Characters (Optional):
            </label>
            <input
              type="number"
              className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-100"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
              value={localItem.maxChars || ""}
              onChange={(e) =>
                updateField(
                  "maxChars",
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            />
            <p className="mt-1 text-xs opacity-70">
              Maximum characters to copy (leave empty for unlimited)
            </p>
          </div>
        </div>
      );
    }
    return <div>No form fields for type: {schemaType}</div>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} darkMode={darkMode}>
      <div>
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center">
            {getIcon()}
            <h2 className="text-xl font-bold ml-2">{getTitle()}</h2>
          </div>

          {schemaType === "fieldType" && (
            <button
              onClick={() => setIsJsonEditorOpen(!isJsonEditorOpen)}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center text-sm ${
                isJsonEditorOpen
                  ? `${darkMode ? "bg-indigo-700" : "bg-indigo-600"} text-white`
                  : `${darkMode ? "bg-gray-700" : "bg-gray-200"}`
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
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
          )}
        </div>

        {/* Body */}
        <div className="p-6">{renderFormFields()}</div>

        {/* Footer */}
        <div
          className={`px-6 py-4 flex justify-end gap-3 border-t ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors flex items-center ${
              darkMode
                ? "bg-blue-700 hover:bg-blue-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditSchemaItemModal;
