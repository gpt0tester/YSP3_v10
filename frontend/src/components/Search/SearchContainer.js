import React, {
  useCallback,
  useMemo,
  Suspense,
  lazy,
  useRef,
  useReducer,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import useSolrCollections from "../../hooks/useSolrCollections";
import { useMultiCollectionInfiniteSearch } from "../../hooks/useMultiCollectionInfiniteSearch";
import SearchBox from "./SearchBox";

// Lazy load the results component for code splitting
const MultiCollectionResults = lazy(() =>
  import(/* webpackChunkName: "results" */ "./MultiCollectionResults")
);

// Search state reducer to batch updates and include search history
const searchReducer = (state, action) => {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, searchQuery: action.payload };
    case "TOGGLE_COLLECTION":
      const colName = action.payload;
      const newPendingCollections = state.pendingCollections.includes(colName)
        ? state.pendingCollections.filter((c) => c !== colName)
        : [...state.pendingCollections, colName];
      return { ...state, pendingCollections: newPendingCollections };
    case "START_SEARCH":
      return {
        ...state,
        activeCollections: action.payload.activeCollections,
        isSearching: true,
      };
    case "CLEAR_SEARCH":
      return {
        ...state,
        searchQuery: "",
        isSearching: false,
      };
    case "SET_SEARCH_HISTORY":
      return { ...state, searchHistory: action.payload };
    case "ADD_SEARCH_HISTORY": {
      const newHistory = [action.payload, ...state.searchHistory.slice(0, 9)];
      try {
        localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      return { ...state, searchHistory: newHistory };
    }
    default:
      return state;
  }
};

/**
 * SearchContainer - A component that encapsulates all search logic and state
 * This separation improves performance by preventing the main App component from
 * re-rendering when search state changes
 */
const SearchContainer = ({ baseUrl, darkMode }) => {
  const { t } = useTranslation();

  // Refs for tracking expensive calculations
  const prevSearchRef = useRef(null);

  // Use reducer for batched state updates
  const [searchState, dispatch] = useReducer(searchReducer, {
    searchQuery: "",
    pendingCollections: [],
    activeCollections: [],
    isSearching: false,
    searchHistory: [],
  });

  const {
    searchQuery,
    pendingCollections,
    activeCollections,
    isSearching,
    searchHistory,
  } = searchState;

  // Load search history from localStorage on initial mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("searchHistory");
      if (savedHistory) {
        dispatch({
          type: "SET_SEARCH_HISTORY",
          payload: JSON.parse(savedHistory),
        });
      }
    } catch (e) {
      console.error("Error loading search history:", e);
    }
  }, []);

  // Get all available collections
  const solrCollections = useSolrCollections();

  // Memoize the selected collection names for performance
  const selectedCollectionNames = useMemo(
    () => activeCollections.map((c) => c.collectionName),
    [activeCollections]
  );

  // Set up the search query hook
  const {
    data: multiData,
    isFetching,
    isFetchingNextPage,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useMultiCollectionInfiniteSearch({
    baseUrl,
    query: searchQuery,
    selectedCollections: selectedCollectionNames,
    limit: 50,
    enabled: isSearching && selectedCollectionNames.length > 0,
  });

  // Handler for toggling collections in the UI - using reducer
  const handleSolrCollectionSelection = useCallback((colName) => {
    dispatch({ type: "TOGGLE_COLLECTION", payload: colName });
  }, []);

  // Pre-compute filtered collections
  const getFilteredCollections = useCallback(() => {
    if (!solrCollections || !pendingCollections.length) return [];

    return solrCollections
      .filter((item) => pendingCollections.includes(item.collectionName))
      .map((c) => c);
  }, [pendingCollections, solrCollections]);

  // Memoize the filtered collections to avoid recomputing on every render
  const filteredCollections = useMemo(
    () => getFilteredCollections(),
    [getFilteredCollections]
  );

  // Handler for submitting a search - using reducer for state updates
  const handleSearchSubmit = useCallback(
    (query) => {
      // Skip if same search is repeated
      if (prevSearchRef.current === query && isSearching) {
        return;
      }

      // Validate input
      if (!query.trim()) {
        toast.warning(t("enterSearchText", "الرجاء إدخال نص للبحث"), {
          autoClose: 3000,
        });
        return;
      }

      if (pendingCollections.length === 0) {
        toast.warning(
          t("selectCollection", "الرجاء اختيار مجموعة واحدة على الأقل"),
          { autoClose: 3000 }
        );
        return;
      }

      // Store query for comparison in future searches
      prevSearchRef.current = query;

      // Update query
      dispatch({ type: "SET_QUERY", payload: query });

      // Add to search history - now handled locally in the component
      const searchItem = {
        query,
        collections: filteredCollections.map(
          (c) => c.displayName || c.collectionName
        ),
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: "ADD_SEARCH_HISTORY", payload: searchItem });

      // Batch updates with reducer
      dispatch({
        type: "START_SEARCH",
        payload: { activeCollections: filteredCollections },
      });

      // Use requestAnimationFrame for better performance than setTimeout
      requestAnimationFrame(() => refetch());
    },
    [pendingCollections, filteredCollections, t, refetch, isSearching]
  );

  // Handle clearing the search
  const handleClearSearch = useCallback(() => {
    prevSearchRef.current = null;
    dispatch({ type: "CLEAR_SEARCH" });
  }, []);

  // Extract loading spinner to separate component for better memoization
  const LoadingSpinner = useMemo(
    () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div
            className={`w-12 h-12 border-4 border-t-4 rounded-full animate-spin ${
              darkMode
                ? "border-gray-600 border-t-blue-500"
                : "border-gray-200 border-t-blue-600"
            }`}
          ></div>
          <span
            className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {t("loading", "جارٍ التحميل...")}
          </span>
        </div>
      </div>
    ),
    [darkMode, t]
  );

  // Handler for loading more results
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized props for SearchBox to prevent unnecessary re-renders
  const searchBoxProps = useMemo(
    () => ({
      onSearch: handleSearchSubmit,
      isSearching: isFetching || isFetchingNextPage,
      solrCollections,
      selectedSolrCollections: pendingCollections,
      onToggleCollection: handleSolrCollectionSelection,
      maxCollections: 5,
      darkMode,
      searchQuery,
      setSearchQuery: (query) =>
        dispatch({ type: "SET_QUERY", payload: query }),
      searchHistory,
      onClearSearch: handleClearSearch,
    }),
    [
      handleSearchSubmit,
      isFetching,
      isFetchingNextPage,
      solrCollections,
      pendingCollections,
      handleSolrCollectionSelection,
      darkMode,
      searchQuery,
      searchHistory,
      handleClearSearch,
    ]
  );

  // Memoized props for MultiCollectionResults
  const resultsProps = useMemo(
    () => ({
      baseUrl,
      multiData,
      isFetching,
      isFetchingNextPage,
      isError,
      error,
      activeCollections,
      searchQuery,
      darkMode,
      onLoadMore: handleLoadMore,
      hasMoreResults: hasNextPage,
    }),
    [
      baseUrl,
      multiData,
      isFetching,
      isFetchingNextPage,
      isError,
      error,
      activeCollections,
      searchQuery,
      darkMode,
      handleLoadMore,
      hasNextPage,
    ]
  );

  // Only render results if we have query and collections
  const shouldShowResults =
    isSearching && searchQuery.trim() && activeCollections.length > 0;

  return (
    <div className="search-container">
      <MemoizedSearchBox {...searchBoxProps} />

      {shouldShowResults && (
        <Suspense fallback={LoadingSpinner}>
          {multiData ? <MemoizedResults {...resultsProps} /> : LoadingSpinner}
        </Suspense>
      )}
    </div>
  );
};

// Memoized child components to prevent unnecessary re-renders
const MemoizedSearchBox = React.memo(SearchBox);
const MemoizedResults = React.memo(MultiCollectionResults);

// Custom comparison function for React.memo
const propsAreEqual = (prevProps, nextProps) => {
  return (
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.baseUrl === nextProps.baseUrl
  );
};

export default React.memo(SearchContainer, propsAreEqual);
