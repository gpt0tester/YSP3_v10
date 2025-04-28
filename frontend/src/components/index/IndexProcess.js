import React, { useState } from "react";
import ConfigsetManager from "./ConfigsetManager";
import SolrSchemaManager from "./SolrSchemaManager";
import QueryTemplatesManager from "./QueryTemplatesManager";
// Uncomment when ready to use
// import { ToastContainer } from "react-toastify";
// import useSolrCollections from "../../hooks/useSolrCollections";

const IndexProcess = ({ darkMode }) => {
  const [activeSection, setActiveSection] = useState("configset");
  // const solrCollections = useSolrCollections(); // e.g. [ { collectionName: "CRM", displayName: "الدعم" }, ...]

  const sections = [
    {
      id: "configset",
      label: "Solr Configsets",
      icon: "⚙️",
      ariaLabel: "إعدادات Solr",
      description: "Configure and manage Solr configsets",
    },
    {
      id: "schema-manager",
      label: "Solr Collections Schema",
      icon: "📋",
      ariaLabel: "إدارة مخطط Solr",
      description: "Manage data structure in your collections",
    },
    {
      id: "query-builder",
      label: "Query Template Builder",
      icon: "🔍",
      ariaLabel: "بناء نموذج استعلام",
      description: "Create and manage search query templates",
    },
  ];

  // Determine theme classes based on dark mode
  const themeClasses = {
    container: darkMode
      ? "dark:bg-gray-800 dark:text-gray-100"
      : "bg-white text-gray-800",
    card: darkMode
      ? "dark:bg-gray-700 dark:text-white"
      : "bg-white text-gray-800 border border-gray-200",
    nav: {
      active: darkMode
        ? "dark:bg-blue-600 dark:text-white"
        : "bg-blue-600 text-white",
      inactive: darkMode
        ? "dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    },
  };

  return (
    <div
      className={`${themeClasses.container} rounded-lg transition-all duration-200`}
    >
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
        <h1 className="text-2xl font-bold">Solr Index Management</h1>
        <p className="text-blue-100 mt-1">
          Configure and manage your search infrastructure
        </p>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Tabs Navigation - Modern Style */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 rtl:space-x-reverse">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  px-4 py-3 rounded-lg flex items-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                  ${
                    activeSection === section.id
                      ? `${themeClasses.nav.active} shadow-md`
                      : `${themeClasses.nav.inactive}`
                  }
                `}
                aria-label={section.ariaLabel}
                aria-current={activeSection === section.id ? "page" : undefined}
              >
                <span className="text-lg mr-2">{section.icon}</span>
                <div className="text-left rtl:text-right">
                  <div className="font-medium">{section.label}</div>
                  <div
                    className={`text-xs ${
                      activeSection === section.id
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {section.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section Content with transition */}
        <div
          className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden transition-all duration-300`}
        >
          {activeSection === "configset" && (
            <ConfigsetManager darkMode={darkMode} />
          )}
          {activeSection === "schema-manager" && (
            <SolrSchemaManager
              // solrCollections={solrCollections}
              darkMode={darkMode}
            />
          )}
          {activeSection === "query-builder" && (
            <QueryTemplatesManager
              onDefaultTemplateSelect={(updatedTemplate) => {
                console.log("Default template is now:", updatedTemplate);
              }}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>

      {/* Uncomment when ready to use Toast notifications */}
      {/* <ToastContainer position="bottom-right" theme={darkMode ? "dark" : "light"} /> */}
    </div>
  );
};

export default IndexProcess;
