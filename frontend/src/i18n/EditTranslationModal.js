// EditTranslationModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  X,
  Edit2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Key,
  Type,
} from "lucide-react";

const Modal = ({ isOpen, onClose, children, darkMode }) => {
  if (!isOpen) return null;

  // Animation classes
  const backdropClass =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300";
  const modalClass = `rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 
    ${
      darkMode
        ? "bg-gray-800 border border-gray-700"
        : "bg-white border border-gray-200"
    }`;

  return (
    <div
      className={backdropClass}
      onClick={onClose}
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default function EditTranslationModal({
  isOpen,
  onClose,
  translation,
  baseUrl,
  darkMode,
  onSaveSuccess,
}) {
  const [localTranslation, setLocalTranslation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const { i18n } = useTranslation();

  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch all translations to check for duplicates
  const [allTranslations, setAllTranslations] = useState([]);

  useEffect(() => {
    // Only fetch translations when the modal is open
    if (isOpen && baseUrl) {
      const fetchTranslations = async () => {
        try {
          setIsLoading(true);
          const res = await axios.get(`${baseUrl}/translations`);
          setAllTranslations(res.data);
        } catch (err) {
          console.error(
            "Error fetching translations for duplicate check:",
            err
          );
          // We don't set an error here to avoid blocking the edit functionality
        } finally {
          setIsLoading(false);
        }
      };

      fetchTranslations();
    }
  }, [isOpen, baseUrl]);

  // Whenever the modal opens, animate it
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  }, [isOpen]);

  // Whenever "translation" changes, copy it to local state
  useEffect(() => {
    if (translation) {
      setLocalTranslation({ ...translation });
      setError(null); // Clear any existing errors
      setIsDirty(false); // Reset dirty state
    } else {
      setLocalTranslation(null);
    }
  }, [translation]);

  // Check if a translation already exists (excluding the current one)
  const isDuplicateTranslation = (key, language, id) => {
    return allTranslations.some(
      (t) =>
        t._id !== id && // Exclude the current translation
        t.key.toLowerCase() === key.toLowerCase() &&
        t.language.toLowerCase() === language.toLowerCase()
    );
  };

  // Handle modal close with unsaved changes warning
  const handleModalClose = () => {
    if (isDirty) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalTranslation((prev) => ({ ...prev, [name]: value }));
    setError(null); // Clear error when user makes changes
    setIsDirty(true); // Mark form as dirty
  };

  const handleSave = async () => {
    // Reset state
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!localTranslation._id) {
        throw new Error("No translation ID found");
      }

      const { _id, key, language, value } = localTranslation;

      // Form validation
      if (!key.trim() || !language.trim() || !value.trim()) {
        throw new Error("All fields are required");
      }

      // Check for duplicates (only if key or language has changed)
      if (key !== translation.key || language !== translation.language) {
        if (isDuplicateTranslation(key, language, _id)) {
          throw new Error(
            `Translation already exists for key "${key}" in language "${language}"`
          );
        }
      }

      // PUT /translations/<_id>
      const res = await axios.put(`${baseUrl}/translations/${_id}`, {
        key,
        language,
        value,
      });
      const updated = res.data;

      // Update i18n resource
      i18n.addResource(
        updated.language,
        "translation",
        updated.key,
        updated.value
      );

      setSuccess("Translation updated successfully!");
      setIsDirty(false);

      // Call parent's success callback after a brief delay to show success message
      setTimeout(() => {
        if (onSaveSuccess) onSaveSuccess(updated);
        // Close modal
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      console.error("Error updating translation:", err);
      setError(err.message || "Failed to update translation");
    } finally {
      setIsLoading(false);
    }
  };

  // Get theme-based styling
  const themeClasses = {
    container: darkMode
      ? "text-gray-100 bg-gray-800"
      : "bg-white text-gray-800",
    header: darkMode
      ? "bg-gray-900 border-gray-700"
      : "bg-gray-50 border-gray-200",
    input: darkMode
      ? "text-gray-100 bg-gray-700 border-gray-600 focus:border-blue-500 focus:ring-blue-500"
      : "text-gray-800 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500",
    button: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: darkMode
        ? "bg-gray-700 text-gray-100 hover:bg-gray-600 border-gray-600"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    },
    label: darkMode ? "text-gray-300" : "text-gray-700",
    notification: {
      success: darkMode
        ? "bg-green-900 border-green-700 text-green-100"
        : "bg-green-100 border-green-500 text-green-800",
      error: darkMode
        ? "bg-red-900 border-red-700 text-red-100"
        : "bg-red-100 border-red-500 text-red-800",
    },
  };

  // If no translation is selected yet, show a loading state
  if (!localTranslation) {
    return (
      <Modal isOpen={isOpen} onClose={handleModalClose} darkMode={darkMode}>
        <div
          className={`p-6 ${themeClasses.container} flex justify-center items-center h-64`}
        >
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Loading translation data...
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} darkMode={darkMode}>
      <div className={`${themeClasses.container}`}>
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${themeClasses.header} flex justify-between items-center`}
        >
          <h2 className="text-xl font-bold flex items-center">
            <Edit2 className="mr-2 h-5 w-5 text-blue-500" />
            Edit Translation
          </h2>

          <button
            onClick={handleModalClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Notification Messages */}
          {error && (
            <div
              className={`mb-6 p-4 rounded-lg shadow-sm border-l-4 flex items-start ${themeClasses.notification.error}`}
            >
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div
              className={`mb-6 p-4 rounded-lg shadow-sm border-l-4 flex items-start ${themeClasses.notification.success}`}
            >
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
              <div>{success}</div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label
                className={`block mb-2 font-medium ${themeClasses.label} flex items-center`}
              >
                <Key className="h-4 w-4 mr-2" />
                Translation Key:
              </label>
              <input
                type="text"
                name="key"
                value={localTranslation.key || ""}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${themeClasses.input}`}
                placeholder="translation.key"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The unique identifier used to reference this translation
              </p>
            </div>

            <div>
              <label
                className={`block mb-2 font-medium ${themeClasses.label} flex items-center`}
              >
                <Globe className="h-4 w-4 mr-2" />
                Language:
              </label>
              <select
                name="language"
                value={localTranslation.language || ""}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 appearance-none ${themeClasses.input}`}
              >
                <option value="ar">Arabic (ar)</option>
                <option value="en">English (en)</option>
                {/* Add other language options if needed */}
              </select>
            </div>

            <div>
              <label
                className={`block mb-2 font-medium ${themeClasses.label} flex items-center`}
              >
                <Type className="h-4 w-4 mr-2" />
                Translated Value:
              </label>
              <textarea
                name="value"
                value={localTranslation.value || ""}
                onChange={handleInputChange}
                disabled={isLoading}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${themeClasses.input}`}
                placeholder="Translated text"
              />
            </div>
          </div>

          {/* Translation Preview */}
          <div
            className={`mt-6 p-4 border rounded-lg ${
              darkMode
                ? "border-gray-700 bg-gray-900"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <h3 className="text-sm uppercase font-semibold mb-2 text-gray-500 dark:text-gray-400">
              Preview
            </h3>
            <div className="flex items-center mb-1">
              <span className={`text-sm ${themeClasses.label}`}>Key:</span>
              <code className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">
                {localTranslation.key || ""}
              </code>
            </div>
            <div className="flex items-center mb-1">
              <span className={`text-sm ${themeClasses.label}`}>Language:</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                {localTranslation.language}
              </span>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${themeClasses.label}`}>Value:</span>
              <div
                className={`mt-1 p-2 border rounded ${
                  darkMode
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-white"
                }`}
              >
                {localTranslation.value || (
                  <span className="text-gray-400 italic">No value</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${themeClasses.button.secondary}`}
              onClick={handleModalClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 flex items-center ${themeClasses.button.primary}`}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
