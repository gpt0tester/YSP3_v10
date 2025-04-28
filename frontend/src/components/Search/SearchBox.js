import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const SearchBox = ({
  onSearch,
  isSearching,
  solrCollections = [],
  selectedSolrCollections = [],
  onToggleCollection,
  darkMode,
}) => {
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [showCollections, setShowCollections] = useState(false);

  // Instead of forcing `isSearchAll` in various places, we derive it automatically:
  const [isSearchAll, setIsSearchAll] = useState(false);

  const [showKeyboardTip, setShowKeyboardTip] = useState(false);
  const [recentCollections, setRecentCollections] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const searchInputRef = useRef(null);
  const collectionsContainerRef = useRef(null);
  const buttonRef = useRef(null);

  // Whenever the number of selected collections changes, decide if we are effectively "searching all".
  useEffect(() => {
    // If user has selected *all* available collections, we consider that "Search All" is ON
    if (
      solrCollections.length > 0 &&
      solrCollections.length === selectedSolrCollections.length
    ) {
      setIsSearchAll(true);
    } else {
      setIsSearchAll(false);
    }
  }, [selectedSolrCollections, solrCollections]);

  // Clear all currently selected collections
  const handleClearSelections = () => {
    selectedSolrCollections.forEach((col) => onToggleCollection(col));
  };

  // When "Search All" is toggled ON, select all; when OFF, clear all.
  const handleToggleSearchAll = () => {
    // If *not* all are selected, select them all
    if (selectedSolrCollections.length !== solrCollections.length) {
      solrCollections.forEach((item) => {
        const name = typeof item === "string" ? item : item.collectionName;
        // Only toggle if not already selected
        if (!selectedSolrCollections.includes(name)) {
          onToggleCollection(name);
        }
      });
    } else {
      // If all are selected, clear them
      handleClearSelections();
    }
  };

  // Toggle the Collections dropdown
  const toggleCollections = (e) => {
    e.stopPropagation();
    if (!showCollections) {
      setTimeout(() => {
        if (collectionsContainerRef.current) {
          collectionsContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }
    setShowCollections((prev) => !prev);
  };

  // Close dropdown if user clicks outside it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showCollections) return;
      if (buttonRef.current && buttonRef.current.contains(event.target)) {
        return;
      }
      if (
        collectionsContainerRef.current &&
        !collectionsContainerRef.current.contains(event.target)
      ) {
        setShowCollections(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCollections]);

  // Filter logic
  const filteredCollections = solrCollections.filter((item) => {
    const collectionName =
      typeof item === "string" ? item : item.collectionName;
    const displayName =
      typeof item === "string" ? item : item.displayName || item.collectionName;
    return (
      filterText === "" ||
      displayName.toLowerCase().includes(filterText.toLowerCase()) ||
      collectionName.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  // Grouped collections by first letter
  const groupedCollections = filteredCollections.reduce((groups, item) => {
    const collectionName =
      typeof item === "string" ? item : item.collectionName;
    const displayName =
      typeof item === "string" ? item : item.displayName || item.collectionName;
    const firstChar = displayName.charAt(0).toUpperCase();

    if (!groups[firstChar]) {
      groups[firstChar] = [];
    }
    groups[firstChar].push({ collectionName, displayName });
    return groups;
  }, {});

  // Click a single collection to toggle it
  const handleCollectionClick = (collectionName) => {
    onToggleCollection(collectionName);

    // Keep track of recently toggled
    if (!selectedSolrCollections.includes(collectionName)) {
      setRecentCollections((prev) => {
        const newRecent = [
          collectionName,
          ...prev.filter((c) => c !== collectionName),
        ].slice(0, 5);
        return newRecent;
      });
    }
    // Note: we no longer manually set isSearchAll here. We let the `useEffect` decide.
  };

  // Handle search submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (query.trim() && selectedSolrCollections.length > 0) {
      onSearch(query);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape closes collections
      if (e.key === "Escape" && showCollections) {
        e.preventDefault();
        setShowCollections(false);
      }
      // Ctrl+K or Cmd+K to focus
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Enter triggers form
      if (
        e.key === "Enter" &&
        document.activeElement === searchInputRef.current
      ) {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCollections, query, selectedSolrCollections]);

  // Theme classes (same as before)
  const themeClasses = {
    container: darkMode
      ? "bg-gray-800 text-gray-100 border-gray-700"
      : "bg-white text-gray-800 border-gray-200",
    section: darkMode
      ? "dark:bg-gray-800 dark:border-gray-700"
      : "bg-white border-gray-200",
    input: darkMode
      ? "bg-gray-700 border-gray-600 text-gray-100 dark:placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-800 placeholder-gray-400",
    collectionsList: darkMode ? "dark:bg-gray-900" : "bg-gray-50",
    button: {
      primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-opacity-50",
      secondary: darkMode
        ? "bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-500 focus:ring-opacity-50"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 focus:ring-opacity-50",
      disabled: darkMode
        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
        : "bg-gray-300 text-gray-600 cursor-not-allowed",
    },
    collection: {
      selected: darkMode
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "bg-blue-500 text-white hover:bg-blue-600",
      unselected: darkMode
        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100",
    },
    badge: darkMode ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800",
    tab: {
      active: darkMode
        ? "border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400"
        : "border-blue-500 text-blue-600",
      inactive: darkMode
        ? "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        : "border-transparent text-gray-500 hover:text-gray-700",
    },
  };

  return (
    <div
      className={`rounded-lg shadow-lg border ${themeClasses.container} transition-all duration-200`}
    >
      {/* Header with icon, title, and toggles */}
      <div
        className={`px-6 py-4 border-b ${themeClasses.section} flex items-center justify-between`}
      >
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div
            className={`flex items-center justify-center rounded-full w-10 h-10 bg-blue-100 dark:bg-blue-900`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 dark:text-blue-300"
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
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {t("search.title", "بحث متقدم")}
            </h2>
          </div>
        </div>

        {/* Right side: "بحث شامل" + "عرض/إخفاء المجموعات" */}
        <div className="flex items-center gap-3">
          {/* بحث شامل */}
          <button
            onClick={handleToggleSearchAll}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors duration-200 flex items-center justify-start text-sm ${
              isSearchAll
                ? themeClasses.button.primary
                : themeClasses.button.secondary
            } focus:outline-none focus:ring-2`}
            aria-label={
              isSearchAll
                ? t("selectedCollections.cancelSearchAll", "إلغاء البحث الشامل")
                : t("selectedCollections.searchAll", "بحث شامل")
            }
          >
            {isSearchAll ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                {t("selectedCollections.cancelSearchAll", "إلغاء البحث الشامل")}
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0"
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
                {t("selectedCollections.searchAll", "بحث شامل")}
              </>
            )}
          </button>

          {/* عرض/إخفاء المجموعات */}
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleCollections}
            className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
          >
            {showCollections
              ? t("collectionSelector.hideCollections", "إخفاء المجموعات")
              : t("collectionSelector.showCollections", "عرض المجموعات")}
          </button>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="px-6 pt-6 pb-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
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
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowKeyboardTip(true)}
              onBlur={() => setShowKeyboardTip(false)}
              placeholder={t("search.placeholder", "ادخل كلمات البحث...")}
              className={`w-full pl-10 pr-10 py-3 border rounded-lg ${themeClasses.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={t("search.fieldLabel", "حقل البحث")}
            />
            {/* Clear query button */}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={t("search.clearQuery", "مسح البحث")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {/* Keyboard shortcut tip */}
            {showKeyboardTip && (
              <div className="absolute -bottom-10 left-3 bg-gray-800 text-white px-3 py-1.5 rounded text-xs shadow-lg z-10 animate-fadeIn">
                <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                {t("search.keyboardShortcut", "اختصار لوحة المفاتيح")}:
                <kbd className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">
                  Ctrl
                </kbd>
                +
                <kbd className="mx-1 px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">
                  K
                </kbd>
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={
              isSearching ||
              query.length === 0 ||
              selectedSolrCollections.length === 0
            }
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center whitespace-nowrap ${
              isSearching ||
              query.length === 0 ||
              selectedSolrCollections.length === 0
                ? themeClasses.button.disabled
                : themeClasses.button.primary
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 hover:shadow-md`}
          >
            {isSearching ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("search.searching", "جارٍ البحث...")}
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1.5 rtl:ml-1.5 rtl:mr-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {t("search.buttonLabel", "بحث")}
              </>
            )}
          </button>
        </div>

        {/* Validation message */}
        {query.length === 0 && selectedSolrCollections.length > 0 && (
          <div className="mt-2 animate-fadeIn">
            <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {t("search.noQueryWarning", "أدخل كلمات للبحث عنها")}
            </div>
          </div>
        )}
      </form>

      {/* Selected Collections summary */}
      <div className="px-6">
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedSolrCollections.length > 0 ? (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400 py-1">
                {t("selectedCollections.searchIn", "البحث في")}:
              </span>
              {selectedSolrCollections.slice(0, 3).map((name, idx) => {
                const displayName = solrCollections.find(
                  (item) =>
                    (typeof item === "string" ? item : item.collectionName) ===
                    name
                );
                const label =
                  typeof displayName === "string"
                    ? displayName
                    : displayName?.displayName || name;

                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${themeClasses.badge} hover:shadow-sm transition-shadow`}
                  >
                    {t(name, { defaultValue: label })}
                    <button
                      type="button"
                      onClick={() => handleCollectionClick(name)}
                      className="ml-1 focus:outline-none hover:bg-opacity-20 hover:bg-black rounded-full p-0.5 transition-colors"
                      aria-label={t("selectedCollections.remove", "إزالة")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                );
              })}
              {selectedSolrCollections.length > 3 && (
                <button
                  type="button"
                  onClick={toggleCollections}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${themeClasses.badge} hover:shadow-sm transition-shadow`}
                >
                  +{selectedSolrCollections.length - 3}{" "}
                  {t("selectedCollections.more", "المزيد")}
                </button>
              )}
            </>
          ) : (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {t(
                "search.noCollectionsError",
                "يجب تحديد مجموعة واحدة على الأقل للبحث"
              )}
            </span>
          )}
        </div>
      </div>

      {/* Container for the Collections dropdown */}
      <div
        className={`relative ${themeClasses.section}`}
        ref={collectionsContainerRef}
      >
        {showCollections && (
          <div
            className={`absolute top-full left-0 right-0 z-10 border-b shadow-lg ${themeClasses.section} p-4 max-h-96 overflow-y-auto animate-slideDown`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Actions and filter row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
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
                </div>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={t(
                    "collectionSelector.searchPlaceholder",
                    "بحث عن مجموعة..."
                  )}
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg ${themeClasses.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={t(
                      "collectionSelector.clearFilter",
                      "مسح التصفية"
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {selectedSolrCollections.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelections}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm ${themeClasses.button.secondary} focus:outline-none focus:ring-2 hover:shadow-sm`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0 inline"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    {t("collectionSelector.clearAll", "مسح الكل")}
                  </button>
                )}
                {selectedSolrCollections.length !== solrCollections.length &&
                  solrCollections.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSearchAll}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm ${themeClasses.button.primary} focus:outline-none focus:ring-2 hover:shadow-sm`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1.5 rtl:ml-1.5 rtl:mr-0 inline"
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
                      {t("collectionSelector.selectAll", "تحديد الكل")}
                    </button>
                  )}
              </div>
            </div>

            {/* Tabs for "all" vs "recent" */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <nav className="flex -mb-px" aria-label="Collections tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`mr-4 py-2 px-1 font-medium text-sm border-b-2 transition-colors duration-200 ${
                    activeTab === "all"
                      ? themeClasses.tab.active
                      : themeClasses.tab.inactive
                  }`}
                >
                  {t("collectionSelector.allTab", "جميع المجموعات")}
                </button>
                {recentCollections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("recent")}
                    className={`mr-4 py-2 px-1 font-medium text-sm border-b-2 transition-colors duration-200 ${
                      activeTab === "recent"
                        ? themeClasses.tab.active
                        : themeClasses.tab.inactive
                    }`}
                  >
                    {t("collectionSelector.recentTab", "المستخدمة مؤخراً")}
                  </button>
                )}
              </nav>
            </div>

            {/* Recent Collections */}
            {activeTab === "recent" && recentCollections.length > 0 && (
              <div className="mb-4 animate-fadeIn">
                <div className="flex flex-wrap gap-2">
                  {recentCollections.map((name, idx) => {
                    const displayName = solrCollections.find(
                      (item) =>
                        (typeof item === "string"
                          ? item
                          : item.collectionName) === name
                    );
                    const label =
                      typeof displayName === "string"
                        ? displayName
                        : displayName?.displayName || name;
                    const isSelected = selectedSolrCollections.includes(name);

                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleCollectionClick(name)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? themeClasses.collection.selected
                            : themeClasses.collection.unselected
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 hover:shadow-sm`}
                      >
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-md mr-2 ${
                            isSelected
                              ? "bg-white bg-opacity-20"
                              : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">
                          {t(name, { defaultValue: label })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Collections */}
            {activeTab === "all" && (
              <div className={`p-4 rounded-lg ${themeClasses.collectionsList}`}>
                {filteredCollections.length > 0 ? (
                  Object.keys(groupedCollections)
                    .sort()
                    .map((letter) => (
                      <div key={letter} className="mb-4 last:mb-0">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                          {letter}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {groupedCollections[letter].map((item, idx) => {
                            const isSelected = selectedSolrCollections.includes(
                              item.collectionName
                            );
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() =>
                                  handleCollectionClick(item.collectionName)
                                }
                                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? themeClasses.collection.selected
                                    : themeClasses.collection.unselected
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 hover:shadow-sm`}
                              >
                                <span
                                  className={`w-5 h-5 flex items-center justify-center rounded-md mr-2 ${
                                    isSelected
                                      ? "bg-white bg-opacity-20"
                                      : "bg-gray-200 dark:bg-gray-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </span>
                                <span className="truncate">
                                  {t(item.collectionName, {
                                    defaultValue: item.displayName,
                                  })}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 animate-fadeIn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                      {filterText
                        ? t(
                            "collectionSelector.noMatches",
                            "لا توجد مجموعات تطابق معايير البحث"
                          )
                        : t(
                            "collectionSelector.noAvailableCollections",
                            "لا توجد مجموعات متاحة حالياً"
                          )}
                    </p>
                    {filterText && (
                      <button
                        type="button"
                        onClick={() => setFilterText("")}
                        className={`px-4 py-2 rounded-lg text-sm ${themeClasses.button.secondary}`}
                      >
                        {t("collectionSelector.clearFilter", "مسح البحث")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBox;
