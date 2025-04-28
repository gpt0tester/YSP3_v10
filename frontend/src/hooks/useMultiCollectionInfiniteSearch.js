// hooks/useMultiCollectionInfiniteSearch.js
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

/**
 * A single multi-collection infinite query, used for the initial "Search" across all chosen collections.
 * Typically, you'll only fetch the first chunk or two here—enough for the user to see results for each collection.
 */
async function fetchMultiCollectionPage({ queryKey, pageParam = {} }) {
  // queryKey = ["multiCollection", { baseUrl, query, collections, limit }]
  const [_key, { baseUrl, query, selectedCollections }] = queryKey;

  // If no pageParam, default each collection's cursor to "*"
  const cursorMarks = { ...pageParam };
  selectedCollections.forEach((col) => {
    if (!cursorMarks[col]) {
      cursorMarks[col] = "*";
    }
  });

  const response = await axios.post(`${baseUrl}/search`, {
    query,
    solrCollections: selectedCollections,
    cursorMarks,
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch data");
  }

  return response.data; // { results: { col: docs[] }, nextCursorMarks: {col: cursor}, numFound: {col: number}, ... }
}

export function useMultiCollectionInfiniteSearch({
  baseUrl,
  query,
  selectedCollections,
  enabled = false,
  fq = [],
}) {
  return useInfiniteQuery({
    queryKey: ["multiCollection", { baseUrl, query, selectedCollections, fq }],
    queryFn: fetchMultiCollectionPage,
    enabled: enabled && query?.trim() && selectedCollections.length > 0,
    getNextPageParam: (lastPage) => lastPage?.nextCursorMarks || undefined,
    refetchOnWindowFocus: false,
  });
}
