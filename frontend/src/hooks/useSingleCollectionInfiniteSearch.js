// hooks/useSingleCollectionInfiniteSearch.js
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

/**
 * Hook for fetching a single collection incrementally.
 * Uses the cursor from the multi-collection search as a starting point.
 */
async function fetchSingleCollectionPage({ queryKey, pageParam }) {
  // queryKey = ["singleCollection", { baseUrl, query, collection, initialCursor }]
  const [_key, { baseUrl, query, collection }] = queryKey;

  // IMPORTANT: Use pageParam if available, fall back to initialCursor INSTEAD OF "*"
  // This prevents duplicate data when continuing from multi-collection search
  const initialCursor = queryKey[1].initialCursor || "*";
  const cursorMark = pageParam || initialCursor;

  const response = await axios.post(`${baseUrl}/search`, {
    query,
    solrCollections: [collection],
    cursorMarks: { [collection]: cursorMark },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch data");
  }

  return response.data; // { results: { col: docs[] }, nextCursorMarks: {col: cursor}, ... }
}

export function useSingleCollectionInfiniteSearch({
  baseUrl,
  query,
  collection,
  initialCursor = "*", // Accept the cursor from multi-collection search
  enabled = true,
  fq = [],
}) {
  return useInfiniteQuery({
    queryKey: [
      "singleCollection",
      { baseUrl, query, collection, initialCursor, fq },
    ],
    queryFn: fetchSingleCollectionPage,
    enabled: enabled && query?.trim() && collection,
    getNextPageParam: (lastPage) => {
      // Get the specific next cursor for this collection
      return lastPage?.nextCursorMarks?.[collection];
    },
    refetchOnWindowFocus: false,
  });
}
