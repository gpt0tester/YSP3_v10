import React, { useState, useEffect } from "react";
import axios from "axios";
import QueryTemplateForm from "./QueryTemplateForm";
import EditQueryTemplateModal from "./EditQueryTemplateModal";
import ApibaseUrl from "../../ApibaseUrl";
import {
  FileUp,
  Search,
  Database,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  AlertTriangle,
  FileText,
  Server,
  Icon,
  ChevronDown,
} from "lucide-react";

const QueryTemplatesManager = ({ onDefaultTemplateSelect, darkMode }) => {
  const baseUrl = ApibaseUrl;

  const [templates, setTemplates] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-dismiss after 5 seconds
  };

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${baseUrl}/query-templates`);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      setError("Failed to load templates. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE a new template
  const addNewTemplate = async (templateData, isDefault) => {
    try {
      const { data: newTemplate } = await axios.post(
        `${baseUrl}/query-templates`,
        templateData
      );

      setTemplates((prev) => [...prev, newTemplate]);
      showNotification(`Template "${templateData.name}" created successfully`);
      setShowAddForm(false);

      if (isDefault) {
        await handleSetDefault(newTemplate._id);
      }

      return newTemplate; // Return for the promise in the form
    } catch (err) {
      console.error("Error creating template:", err);
      showNotification(`Failed to create template: ${err.message}`, "error");
      throw err; // Rethrow for the promise in the form
    }
  };

  // OPEN the Edit Modal
  const startEditing = (template) => {
    setTemplateToEdit(template);
    setEditModalOpen(true);
  };

  // Called by the modal after a successful PUT
  const handleModalSaveSuccess = (updatedTemplate) => {
    // close modal
    setEditModalOpen(false);
    setTemplateToEdit(null);

    // update local state
    setTemplates((prev) =>
      prev.map((t) => (t._id === updatedTemplate._id ? updatedTemplate : t))
    );

    showNotification(`Template "${updatedTemplate.name}" updated successfully`);
  };

  // DELETE
  const handleDelete = async (id) => {
    const templateToDelete = templates.find((t) => t._id === id);

    if (
      !window.confirm(
        `Are you sure you want to delete the template "${templateToDelete.name}"?`
      )
    ) {
      return;
    }

    setIsDeleting(id);

    try {
      await axios.delete(`${baseUrl}/query-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      showNotification(`Template deleted successfully`);
    } catch (error) {
      console.error("Error deleting template:", error);
      showNotification(`Failed to delete template: ${error.message}`, "error");
    } finally {
      setIsDeleting(null);
    }
  };

  // SET DEFAULT
  const handleSetDefault = async (id) => {
    try {
      const { data } = await axios.put(
        `${baseUrl}/query-templates/${id}/default`
      );
      // Update local state so only the chosen template is default
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, default: t._id === id }))
      );
      // Notify parent
      onDefaultTemplateSelect(data);

      const defaultTemplate = templates.find((t) => t._id === id);
      showNotification(`"${defaultTemplate?.name}" set as default template`);
    } catch (error) {
      console.error("Error setting default:", error);
      showNotification(
        `Failed to set default template: ${error.message}`,
        "error"
      );
    }
  };

  // Toggle expanded view for a template
  const toggleExpandTemplate = (id) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Determine theme classes
  const themeClasses = {
    container: darkMode
      ? "dark:bg-gray-800 dark:text-gray-100"
      : "bg-white text-gray-800",
    card: darkMode
      ? "dark:bg-gray-700 dark:text-gray-100"
      : "bg-white text-gray-800 border border-gray-200",
    tableHeader: darkMode
      ? "dark:bg-gray-700 dark:text-gray-100"
      : "bg-gray-100 text-gray-800",
    tableRow: darkMode
      ? "dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600"
      : "hover:bg-gray-50 border-gray-200",
    tableRowExpanded: darkMode ? "dark:bg-gray-700" : "bg-gray-50",
    button: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      success:
        "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    },
    badge: {
      default: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
    },
  };

  return (
    <div
      className={`rounded-lg shadow-md ${themeClasses.container} transition-all duration-200`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold">Query Templates Manager</h1>
        <p className="text-blue-100 text-sm mt-1">
          Configure and manage search templates
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`mx-4 mt-4 p-3 rounded-lg shadow-md ${
            notification.type === "error"
              ? "bg-red-100 border-l-4 border-red-500 text-red-700"
              : "bg-green-100 border-l-4 border-green-500 text-green-700"
          } flex justify-between items-center`}
        >
          <p>{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Manage Templates</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 text-sm font-medium ${themeClasses.button.primary}`}
          >
            {showAddForm ? "Hide Form" : "Add New Template"}
          </button>
          <button
            onClick={fetchTemplates}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 text-sm font-medium ${themeClasses.button.secondary}`}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add Template Form - Collapsible */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <QueryTemplateForm onSave={addNewTemplate} darkMode={darkMode} />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 m-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button
            onClick={fetchTemplates}
            className="mt-2 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Templates List */}
      {!isLoading && !error && (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">
            Existing Templates ({templates.length})
          </h3>

          {templates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400">
                No templates found
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={themeClasses.tableHeader}>
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Template Name
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Query Fields
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {templates.map((template) => (
                    <React.Fragment key={template._id}>
                      <tr
                        className={`${themeClasses.tableRow} ${
                          expandedTemplates[template._id]
                            ? themeClasses.tableRowExpanded
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleExpandTemplate(template._id)}
                              className="mr-2 text-blue-500 hover:text-blue-700 dark:text-blue-400"
                            >
                              {expandedTemplates[template._id] ? (
                                <ChevronDown className="h-5 w-5 mr-2 opacity-70" />
                              ) : (
                                <ChevronLeft className="h-5 w-5 mr-2 opacity-70" />
                              )}
                            </button>
                            <div>
                              <span className="font-medium">
                                {template.name}
                              </span>
                              {template.default && (
                                <span
                                  className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${themeClasses.badge.default}`}
                                >
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-md truncate">
                          <span className="text-sm">{template.qf || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-start space-x-2">
                            <button
                              onClick={() => startEditing(template)}
                              className="px-3 py-1 mx-2 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(template._id)}
                              disabled={isDeleting === template._id}
                              className={`px-3 py-1 mx-2 text-xs font-medium rounded-md ${
                                isDeleting === template._id
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600"
                                  : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100"
                              }`}
                            >
                              {isDeleting === template._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                            {!template.default && (
                              <button
                                onClick={() => handleSetDefault(template._id)}
                                className="px-3 py-1 mx-2 text-xs font-medium rounded-md bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100"
                              >
                                Set Default
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View */}
                      {expandedTemplates[template._id] && (
                        <tr className={themeClasses.tableRowExpanded}>
                          <td colSpan="3" className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <h4 className="font-semibold mb-1">
                                  Basic Settings
                                </h4>
                                <div className="space-y-1">
                                  <p>
                                    <span className="font-medium">
                                      Query Fields (qf):
                                    </span>{" "}
                                    {template.qf || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Field List (fl):
                                    </span>{" "}
                                    {template.fl || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Minimum Match (mm):
                                    </span>{" "}
                                    {template.mm || "—"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-1">
                                  Phrase Settings
                                </h4>
                                <div className="space-y-1">
                                  <p>
                                    <span className="font-medium">
                                      Phrase Fields (pf):
                                    </span>{" "}
                                    {template.pf || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Phrase Slop (ps):
                                    </span>{" "}
                                    {template.ps || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Bigram Fields (pf2):
                                    </span>{" "}
                                    {template.pf2 || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Bigram Slop (ps2):
                                    </span>{" "}
                                    {template.ps2 || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Trigram Fields (pf3):
                                    </span>{" "}
                                    {template.pf3 || "—"}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      Trigram Slop (ps3):
                                    </span>{" "}
                                    {template.ps3 || "—"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-1">
                                  Advanced Settings
                                </h4>
                                <div className="space-y-1">
                                  <p>
                                    <span className="font-medium">
                                      Facet Fields:
                                    </span>{" "}
                                    {template.facetFields &&
                                    template.facetFields.length > 0
                                      ? template.facetFields.join(", ")
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() =>
                                  toggleExpandTemplate(template._id)
                                }
                                className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200"
                              >
                                Collapse
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Template Modal */}
      <EditQueryTemplateModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTemplateToEdit(null);
        }}
        template={templateToEdit}
        baseUrl={baseUrl}
        darkMode={darkMode}
        onSaveSuccess={handleModalSaveSuccess}
      />
    </div>
  );
};

export default QueryTemplatesManager;
