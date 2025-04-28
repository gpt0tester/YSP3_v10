import React, { useState, useEffect, useRef } from "react";
import ItemList from "./ItemList";
import { useSingleCollectionInfiniteSearch } from "../../hooks/useSingleCollectionInfiniteSearch";
import { useTranslation } from "react-i18next";

const itemsPerPage = 9;

export default function MultiCollectionResults({
  baseUrl,
  multiData,
  isFetching,
  isError,
  error,
  activeCollections,
  searchQuery,
  darkMode,
}) {
  const { t } = useTranslation();

  // Store documents by collection
  const [docsByCollection, setDocsByCollection] = useState({});

  // Keep pagination state totally separate (prevent resets when toggling)
  const [localPageByCollection, setLocalPageByCollection] = useState({});

  // Selected collection
  const [selectedCollection, setSelectedCollection] = useState(null);

  // Add state to track the latest cursor marks for each collection
  const [cursorMarksByCollection, setCursorMarksByCollection] = useState({});

  // Track previous search query and multi-data to detect actual changes
  const prevSearchRef = useRef(searchQuery);
  const prevMultiDataRef = useRef(null);

  // DATA HANDLING: Process multiData once when it arrives, avoid reprocessing on collection toggle
  useEffect(() => {
    if (!multiData?.pages?.length) return;

    // Skip if we've already processed this exact multiData object
    if (prevMultiDataRef.current === multiData) return;

    prevMultiDataRef.current = multiData;

    // Check if search query changed (to clear previous data)
    const isNewSearch = prevSearchRef.current !== searchQuery;
    if (isNewSearch) {
      prevSearchRef.current = searchQuery;

      // RESET PAGINATION HERE ONLY - on actual new search
      const resetPages = {};
      activeCollections.forEach((c) => {
        resetPages[c.collectionName] = 1; // Always page 1
      });
      setLocalPageByCollection(resetPages);

      // Clear docs for a new search
      setDocsByCollection({});

      // Clear cursor marks for new search
      setCursorMarksByCollection({});
    }

    // Process the data - but avoid duplicating data from previous multiData
    const newDocsMap = isNewSearch ? {} : { ...docsByCollection };

    activeCollections.forEach((c) => {
      const colName = c.collectionName;

      // Only process if this is a new search or we don't have data for this collection yet
      if (isNewSearch || !newDocsMap[colName]) {
        const colDocs = multiData.pages.flatMap(
          (page) => page.results[colName] || []
        );
        newDocsMap[colName] = colDocs;
      }
    });

    setDocsByCollection(newDocsMap);

    // Extract and save the latest cursor marks from the most recent page
    const latestPage = multiData.pages[multiData.pages.length - 1];
    if (latestPage?.nextCursorMarks) {
      setCursorMarksByCollection((prev) => ({
        ...prev,
        ...latestPage.nextCursorMarks,
      }));
    }

    // Auto-select first non-empty collection if none selected
    if (!selectedCollection) {
      const nonEmptyCollections = Object.entries(newDocsMap).filter(
        ([_, docs]) => docs && docs.length > 0
      );

      if (nonEmptyCollections.length > 0) {
        setSelectedCollection(nonEmptyCollections[0][0]);
      }
    }
  }, [multiData, activeCollections, searchQuery]);

  // Error state
  if (isError) {
    return (
      <div
        dir="rtl"
        className={`p-6 rounded-lg text-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <div
          className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${
            darkMode ? "bg-red-900/30" : "bg-red-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${darkMode ? "text-red-400" : "text-red-500"}`}
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
        </div>
        <h3
          className={`text-xl font-bold mb-2 ${
            darkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          {t("errorOccurred", "حدث خطأ")}
        </h3>
        <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
          {error?.message || t("unexpectedError", "خطأ غير متوقع")}
        </p>
      </div>
    );
  }

  // Loading state
  if (!multiData) {
    return (
      <div
        dir="rtl"
        className={`p-8 rounded-lg flex flex-col items-center justify-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        {isFetching ? (
          <>
            <div className="relative w-16 h-16 mb-4">
              <div
                className={`absolute inset-0 rounded-full ${
                  darkMode ? "border-t-blue-400" : "border-t-blue-600"
                } border-4 border-gray-200 animate-spin`}
              ></div>
            </div>
            <p
              className={`text-lg ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {t("fetchingData", "جاري جلب البيانات...")}
            </p>
          </>
        ) : (
          <>
            <div
              className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${
                darkMode ? "bg-blue-900/30" : "bg-blue-100"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-8 w-8 ${
                  darkMode ? "text-blue-400" : "text-blue-600"
                }`}
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
            </div>
            <p
              className={`text-lg ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {t("noResults", "لا توجد نتائج.")}
            </p>
          </>
        )}
      </div>
    );
  }

  // Check if we have any results
  const hasAnyResults = Object.values(docsByCollection).some(
    (docs) => docs && docs.length > 0
  );

  if (!hasAnyResults && !isFetching) {
    return (
      <div
        dir="rtl"
        className={`p-8 rounded-lg flex flex-col items-center justify-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <div
          className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${
            darkMode ? "bg-yellow-900/30" : "bg-yellow-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${
              darkMode ? "text-yellow-400" : "text-yellow-600"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3
          className={`text-xl font-bold mb-2 ${
            darkMode ? "text-gray-200" : "text-gray-800"
          }`}
        >
          {t("noSearchResults", "لا توجد نتائج للبحث")}
        </h3>
        <p
          className={`text-center max-w-md ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {t(
            "tryDifferentSearch",
            "حاول استخدام كلمات بحث مختلفة أو تحقق من التهجئة."
          )}
        </p>
      </div>
    );
  }

  // Return total found from the first page
  function getNumFound(collection) {
    const colName = collection.collectionName;

    // First try to get from numFound object
    if (
      multiData.pages[0]?.numFound &&
      multiData.pages[0].numFound[colName] !== undefined
    ) {
      return multiData.pages[0].numFound[colName];
    }

    // Fallback: count docs
    const docsInCollection = docsByCollection[colName] || [];
    return docsInCollection.length;
  }

  return (
    <div
      dir="rtl"
      className={`pb-8 rounded-lg ${
        darkMode ? "text-gray-100" : "text-gray-800"
      }`}
    >
      {/* Search info */}
      {searchQuery && (
        <div className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          <p className="text-sm">
            {t("searchingFor", "نتائج البحث عن:")}{" "}
            <span
              className={`font-medium ${
                darkMode ? "text-blue-300" : "text-blue-600"
              }`}
            >
              "{searchQuery}"
            </span>
          </p>
        </div>
      )}

      {/* Collection tabs */}
      <div className="mb-6">
        <div
          className={`border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <nav className="-mb-px flex flex-wrap gap-1">
            {activeCollections.map((col) => {
              const numFound = getNumFound(col);
              const isActive = selectedCollection === col.collectionName;

              return (
                <button
                  key={col.collectionName}
                  disabled={numFound === 0}
                  onClick={() => setSelectedCollection(col.collectionName)}
                  className={`
                    relative py-3 px-4 rounded-t-lg font-medium text-sm
                    transition-colors duration-200 focus:outline-none
                    ${numFound === 0 ? "opacity-50 cursor-not-allowed" : ""}
                    ${
                      isActive
                        ? `${
                            darkMode
                              ? "text-blue-400 border-b-2 border-blue-400"
                              : "text-blue-600 border-b-2 border-blue-600"
                          }`
                        : `${
                            darkMode
                              ? "text-gray-400 hover:text-gray-300 hover:border-b-2 hover:border-gray-500"
                              : "text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
                          }`
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {col.displayName}
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      isActive
                        ? darkMode
                          ? "bg-blue-900 text-blue-200"
                          : "bg-blue-100 text-blue-700"
                        : darkMode
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {numFound}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {!selectedCollection ? (
        <div
          className={`p-8 text-center rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <p>{t("selectCollection", "يرجى اختيار مجموعة.")}</p>
        </div>
      ) : (
        <CollectionView
          baseUrl={baseUrl}
          searchQuery={searchQuery}
          collectionInfo={activeCollections.find(
            (c) => c.collectionName === selectedCollection
          )}
          docsByCollection={docsByCollection}
          setDocsByCollection={setDocsByCollection}
          localPageByCollection={localPageByCollection}
          setLocalPageByCollection={setLocalPageByCollection}
          cursorMarksByCollection={cursorMarksByCollection}
          setCursorMarksByCollection={setCursorMarksByCollection}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function CollectionView({
  baseUrl,
  searchQuery,
  collectionInfo,
  docsByCollection,
  setDocsByCollection,
  localPageByCollection,
  setLocalPageByCollection,
  cursorMarksByCollection,
  setCursorMarksByCollection,
  darkMode,
}) {
  const { t } = useTranslation();
  const colName = collectionInfo?.collectionName;
  const colDisplay = collectionInfo?.displayName || colName;

  // Custom state for "Load More"
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [noMoreData, setNoMoreData] = useState(false);

  // Tracking for fetch data and last collection
  const lastColNameRef = useRef(null);

  // Reset "no more data" when collection changes
  useEffect(() => {
    if (lastColNameRef.current !== colName) {
      setNoMoreData(false);
      lastColNameRef.current = colName;
    }
  }, [colName]);

  // Get the infinite query hook (only for fetchNextPage)
  const {
    fetchNextPage,
    isError: singleIsError,
    error: singleError,
  } = useSingleCollectionInfiniteSearch({
    baseUrl,
    query: searchQuery,
    collection: colName,
    initialCursor: cursorMarksByCollection[colName] || "*", // Pass the cursor from multi-collection query
    enabled: false, // never auto-fetch
  });

  // Get all documents and set up pagination
  const allDocs = docsByCollection[colName] || [];

  // IMPORTANT: Initialize page to 1 if not set, but DON'T reset on collection change
  const localPage = localPageByCollection[colName] || 1;
  const totalLocalPages = Math.max(1, Math.ceil(allDocs.length / itemsPerPage));

  // Initialize page to 1 ONLY if not set yet (NOT on every render)
  useEffect(() => {
    if (localPageByCollection[colName] === undefined) {
      setLocalPageByCollection((prev) => ({
        ...prev,
        [colName]: 1,
      }));
    }
  }, [colName, localPageByCollection, setLocalPageByCollection]);

  // Slice docs for current page
  const startIndex = (localPage - 1) * itemsPerPage;
  const currentDocs = allDocs.slice(startIndex, startIndex + itemsPerPage);

  // Handle error
  if (singleIsError) {
    return (
      <div
        className={`p-4 rounded-lg ${
          darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-700"
        }`}
      >
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p>
            {t("partialFetchError", "خطأ عند الجلب الجزئي لمجموعة")}{" "}
            {colDisplay}: {singleError?.message}
          </p>
        </div>
      </div>
    );
  }

  // Load more data
  async function handleLoadMore() {
    try {
      setIsLoadingMore(true);

      const result = await fetchNextPage();
      const newPages = result?.data?.pages;

      if (!newPages || !newPages.length) {
        setNoMoreData(true);
        return;
      }

      const lastPage = newPages[newPages.length - 1];

      if (!lastPage) {
        setNoMoreData(true);
        return;
      }

      const newDocs = lastPage?.results?.[colName] || [];
      const newCursor = lastPage.nextCursorMarks?.[colName];

      // Check if we got new data
      if (newDocs.length > 0) {
        // IMPORTANT: Create new doc array to avoid duplicate references
        const existingDocs = [...(docsByCollection[colName] || [])];
        const combinedDocs = [...existingDocs, ...newDocs];

        // Add to collection
        setDocsByCollection((prev) => ({
          ...prev,
          [colName]: combinedDocs,
        }));
      } else {
        // No new docs, end reached
        setNoMoreData(true);
      }
    } catch (error) {
      console.error("Error loading more data:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div>
      {allDocs.length === 0 ? (
        <div
          className={`p-8 rounded-lg text-center ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
            {t("noResultsToDisplay", "لا توجد نتائج للعرض.")}
          </p>
        </div>
      ) : (
        <>
          <ItemList
            title={`${t("resultsFrom", "نتائج من")} ${colDisplay}`}
            items={currentDocs}
            searchQuery={searchQuery}
            collectionName={colName}
            displayName={colDisplay}
            darkMode={darkMode}
          />

          {/* Pagination controls */}
          {allDocs.length > itemsPerPage && (
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
              <div
                className={`inline-flex rounded-md shadow-sm ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
                role="group"
              >
                <button
                  onClick={() =>
                    setLocalPageByCollection((prev) => ({
                      ...prev,
                      [colName]: 1,
                    }))
                  }
                  disabled={localPage <= 1}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-r-md border
                    ${
                      darkMode
                        ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={t("firstPage", "الصفحة الأولى")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <button
                  onClick={() =>
                    setLocalPageByCollection((prev) => ({
                      ...prev,
                      [colName]: Math.max(localPage - 1, 1),
                    }))
                  }
                  disabled={localPage <= 1}
                  className={`
                    px-3 py-2 text-sm font-medium border-t border-b
                    ${
                      darkMode
                        ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={t("previousPage", "الصفحة السابقة")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                <span
                  className={`
                    flex items-center px-4 py-2 text-sm font-medium border-t border-b
                    ${
                      darkMode
                        ? "bg-gray-700 text-gray-200 border-gray-600"
                        : "bg-gray-100 text-gray-700 border-gray-300"
                    }
                  `}
                >
                  {localPage} / {totalLocalPages}
                </span>

                <button
                  onClick={() =>
                    setLocalPageByCollection((prev) => ({
                      ...prev,
                      [colName]: Math.min(localPage + 1, totalLocalPages),
                    }))
                  }
                  disabled={localPage >= totalLocalPages}
                  className={`
                    px-3 py-2 text-sm font-medium border-t border-b
                    ${
                      darkMode
                        ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={t("nextPage", "الصفحة التالية")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <button
                  onClick={() =>
                    setLocalPageByCollection((prev) => ({
                      ...prev,
                      [colName]: totalLocalPages,
                    }))
                  }
                  disabled={localPage >= totalLocalPages}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-l-md border
                    ${
                      darkMode
                        ? "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-label={t("lastPage", "الصفحة الأخيرة")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Load More section */}
          <div
            className={`mt-8 p-4 rounded-lg text-center ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <p
              className={`mb-3 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {t("loadedItems", "تم تحميل")} {allDocs.length}{" "}
              {t("itemsFrom", "عنصر من")} {colDisplay}
            </p>

            {!noMoreData && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className={`
                  flex items-center justify-center mx-auto px-5 py-2.5 rounded-md transition-colors
                  ${isLoadingMore ? "cursor-not-allowed" : ""}
                  ${
                    darkMode
                      ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-800"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                  }
                `}
              >
                {isLoadingMore ? (
                  <>
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
                    {t("loading", "جاري التحميل...")}
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {t("loadMoreFromServer", "عرض المزيد من الخادم")}
                  </>
                )}
              </button>
            )}

            {noMoreData && (
              <div
                className={`inline-flex items-center px-4 py-2 rounded-md ${
                  darkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
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
                {t("noMoreData", "لا توجد بيانات إضافية لهذه المجموعة.")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
