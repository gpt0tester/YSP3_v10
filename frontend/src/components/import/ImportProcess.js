import React, { useState, useEffect } from "react";
import CsvUpload from "./CsvUpload";
import JsonUpload from "./JsonUpload";
import MongoToSolr from "./MongoToSolr";
import CreateIndex from "./CreateIndex";
import { toast } from "react-toastify";

const ImportProcess = ({ darkMode }) => {
  // Manage which section is active in the UI
  const [activeSection, setActiveSection] = useState("import");
  const [importType, setImportType] = useState("csv");
  const [lastCompletedImport, setLastCompletedImport] = useState(null);

  // State for dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Manage animations
  const [fadeIn, setFadeIn] = useState(false);

  // Track visited sections for guidance
  const [visitedSections, setVisitedSections] = useState({
    import: true,
    "create-index": false,
    "mongo-to-solr": false,
  });

  // Define sections for the main navigation
  const mainSections = [
    {
      id: "import",
      label: "استيراد البيانات",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      ),
      ariaLabel: "استيراد البيانات",
    },
    {
      id: "create-index",
      label: "إنشاء فهرس",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      ariaLabel: "إنشاء فهرس",
    },
    {
      id: "mongo-to-solr",
      label: "ترحيل البيانات إلى Solr",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
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
      ),
      ariaLabel: "ترحيل البيانات",
    },
  ];

  // Import type options
  const importTypes = [
    {
      id: "csv",
      label: "استيراد ملف CSV",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
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
      ),
    },
    {
      id: "json",
      label: "استيراد ملف JSON",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 ml-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
  ];

  // Handle animation on section change
  useEffect(() => {
    setFadeIn(false);
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSection, importType]);

  const handleImportSuccess = (data) => {
    setLastCompletedImport(data);
    setVisitedSections({
      ...visitedSections,
      "create-index": true,
    });

    // // Show success message
    // toast.success(`تم استيراد ${data.recordCount} سجل بنجاح!`, {
    //   position: "top-center",
    //   autoClose: 5000,
    // });

    // Optional: Auto-navigate to next step
    // setActiveSection("create-index");
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setVisitedSections({
      ...visitedSections,
      [sectionId]: true,
    });
    setDropdownOpen(false);
  };

  const handleImportTypeChange = (type) => {
    setImportType(type);
    setDropdownOpen(false);
  };

  // Styling classes
  const cardStyle = `rounded-lg shadow-lg overflow-hidden ${
    darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
  }`;
  const navButtonStyle = (isActive) => `
    flex items-center px-4 py-3 rounded-lg transition-all duration-200 
    ${
      isActive
        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
        : darkMode
        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  `;
  const dropdownItemStyle = (isActive) => `
    flex items-center w-full text-right px-4 py-2 
    ${
      darkMode && isActive
        ? "bg-blue-900/50 text-blue-300"
        : darkMode
        ? "bg-gray-700/30 text-gray-300 hover:bg-gray-600"
        : isActive
        ? "bg-blue-100 text-blue-700"
        : "hover:bg-gray-100"
    }
  `;

  // Render next step suggestion
  const renderNextStepSuggestion = () => {
    if (lastCompletedImport && activeSection === "import") {
      return (
        <div
          className={`mt-4 p-3 rounded-lg border ${
            darkMode
              ? "bg-blue-900/20 border-blue-800 text-blue-300"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div>
              <p className="font-medium">اكتمل الاستيراد بنجاح!</p>
              <p className="text-sm mt-1">
                تم استيراد {lastCompletedImport.recordCount} سجل من{" "}
                {lastCompletedImport.fileName}
              </p>
              <button
                onClick={() => setActiveSection("create-index")}
                className={`mt-2 px-3 py-1 rounded text-sm ${
                  darkMode ? "bg-blue-700 text-white" : "bg-blue-600 text-white"
                }`}
              >
                انتقل لإنشاء الفهرس
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-8xl mx-auto" dir="rtl">
      {/* Main Section Header */}
      <div className={`${cardStyle} mb-6`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 ml-2"
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
            استيراد وإدارة البيانات
          </h2>
          <p className="text-blue-100 mt-1">
            استيراد البيانات وإنشاء الفهارس وترحيلها إلى محرك البحث
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap p-4 gap-2 border-b border-gray-200 dark:border-gray-700">
          {mainSections.map((section) => (
            <button
              key={section.id}
              className={navButtonStyle(activeSection === section.id)}
              onClick={() => handleSectionChange(section.id)}
              aria-label={section.ariaLabel}
            >
              {section.icon}
              <span>{section.label}</span>

              {/* Show notification dot for unvisited next step */}
              {!visitedSections[section.id] &&
                lastCompletedImport &&
                (section.id === "create-index" ||
                  (section.id === "mongo-to-solr" &&
                    visitedSections["create-index"])) && (
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
            </button>
          ))}
        </div>
      </div>

      {/* Component Content Area */}
      <div className={cardStyle}>
        {/* Import Section with Type Selection */}
        {activeSection === "import" && (
          <div className="p-6">
            <div className="lex justify-end items-center mb-6">
              {/* Import Type Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {importTypes.find((t) => t.id === importType)?.icon}
                  <span>
                    {importTypes.find((t) => t.id === importType)?.label}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 mr-2 transform transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg z-10 ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    } ring-1 ring-black ring-opacity-5`}
                  >
                    <div
                      className={`py-1`}
                      role="menu"
                      aria-orientation="vertical"
                    >
                      {importTypes.map((type) => (
                        <button
                          key={type.id}
                          className={dropdownItemStyle(importType === type.id)}
                          onClick={() => handleImportTypeChange(type.id)}
                          role="menuitem"
                        >
                          {type.icon}
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import Component based on selected type */}
            <div
              className={`transition-opacity duration-300 ${
                fadeIn ? "opacity-100" : "opacity-0"
              }`}
            >
              {importType === "csv" && (
                <CsvUpload
                  darkMode={darkMode}
                  onSuccess={handleImportSuccess}
                />
              )}
              {importType === "json" && (
                <JsonUpload
                  darkMode={darkMode}
                  onSuccess={handleImportSuccess}
                />
              )}
            </div>

            {/* Next Step Suggestion */}
            {renderNextStepSuggestion()}
          </div>
        )}

        {/* Other Sections */}
        {activeSection === "create-index" && (
          <div
            className={`p-6 transition-opacity duration-300 ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
          >
            <CreateIndex
              darkMode={darkMode}
              lastImportData={lastCompletedImport}
              onComplete={() =>
                setVisitedSections({
                  ...visitedSections,
                  "mongo-to-solr": true,
                })
              }
            />
          </div>
        )}

        {activeSection === "mongo-to-solr" && (
          <div
            className={`p-6 transition-opacity duration-300 ${
              fadeIn ? "opacity-100" : "opacity-0"
            }`}
          >
            <MongoToSolr darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProcess;
