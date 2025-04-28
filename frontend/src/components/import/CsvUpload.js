import React, { useReducer, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Papa from "papaparse";
import ApibaseUrl from "../../ApibaseUrl";

// Initial state for the reducer
const initialState = {
  ui: {
    activeTab: "upload",
    isDragging: false,
    showAdvancedOptions: false,
    showFieldMapping: false,
    isAnalyzing: false,
    isUploading: false,
    uploadComplete: false,
  },
  file: {
    selected: null,
    name: "",
    size: 0,
  },
  collection: {
    selected: "",
    list: [],
    loading: false,
  },
  parsing: {
    delimiter: "comma",
    encoding: "utf-8",
    hasHeader: true,
    previewRows: 5,
    batchSize: 1000,
    skipEmptyLines: false,
  },
  data: {
    csvData: [],
    fields: [],
    fieldMappings: {},
    dataStats: null,
    showPreview: false,
    previewError: "",
  },
  progress: {
    uploadProgress: 0,
    totalRows: 0,
    uploadStartTime: null,
    estimatedTimeRemaining: null,
    uploadStats: null,
  },
  network: {
    retryCount: 0,
    status: "online", // 'online', 'offline', 'reconnecting'
    lastError: null,
  },
};

// Action types for the reducer
const ACTION_TYPES = {
  SET_ACTIVE_TAB: "SET_ACTIVE_TAB",
  SET_IS_DRAGGING: "SET_IS_DRAGGING",
  TOGGLE_ADVANCED_OPTIONS: "TOGGLE_ADVANCED_OPTIONS",
  TOGGLE_FIELD_MAPPING: "TOGGLE_FIELD_MAPPING",
  SET_IS_ANALYZING: "SET_IS_ANALYZING",
  SET_IS_UPLOADING: "SET_IS_UPLOADING",
  SET_UPLOAD_COMPLETE: "SET_UPLOAD_COMPLETE",

  SET_FILE: "SET_FILE",
  RESET_FILE: "RESET_FILE",

  SET_COLLECTIONS: "SET_COLLECTIONS",
  SET_COLLECTION_LOADING: "SET_COLLECTION_LOADING",
  SET_SELECTED_COLLECTION: "SET_SELECTED_COLLECTION",

  SET_PARSER_OPTION: "SET_PARSER_OPTION",

  SET_CSV_DATA: "SET_CSV_DATA",
  SET_FIELDS: "SET_FIELDS",
  UPDATE_FIELD_MAPPING: "UPDATE_FIELD_MAPPING",
  SET_DATA_STATS: "SET_DATA_STATS",
  SET_SHOW_PREVIEW: "SET_SHOW_PREVIEW",
  SET_PREVIEW_ERROR: "SET_PREVIEW_ERROR",

  UPDATE_PROGRESS: "UPDATE_PROGRESS",
  SET_UPLOAD_STATS: "SET_UPLOAD_STATS",
  RESET_PROGRESS: "RESET_PROGRESS",

  SET_NETWORK_STATUS: "SET_NETWORK_STATUS",
  SET_NETWORK_ERROR: "SET_NETWORK_ERROR",
  INCREMENT_RETRY: "INCREMENT_RETRY",

  RESET_ALL: "RESET_ALL",
};

// Reducer function to handle all state updates
function csvReducer(state, action) {
  switch (action.type) {
    // UI actions
    case ACTION_TYPES.SET_ACTIVE_TAB:
      return { ...state, ui: { ...state.ui, activeTab: action.payload } };
    case ACTION_TYPES.SET_IS_DRAGGING:
      return { ...state, ui: { ...state.ui, isDragging: action.payload } };
    case ACTION_TYPES.TOGGLE_ADVANCED_OPTIONS:
      return {
        ...state,
        ui: { ...state.ui, showAdvancedOptions: !state.ui.showAdvancedOptions },
      };
    case ACTION_TYPES.TOGGLE_FIELD_MAPPING:
      return {
        ...state,
        ui: { ...state.ui, showFieldMapping: !state.ui.showFieldMapping },
      };
    case ACTION_TYPES.SET_IS_ANALYZING:
      return { ...state, ui: { ...state.ui, isAnalyzing: action.payload } };
    case ACTION_TYPES.SET_IS_UPLOADING:
      return { ...state, ui: { ...state.ui, isUploading: action.payload } };
    case ACTION_TYPES.SET_UPLOAD_COMPLETE:
      return { ...state, ui: { ...state.ui, uploadComplete: action.payload } };

    // File actions
    case ACTION_TYPES.SET_FILE:
      return {
        ...state,
        file: {
          selected: action.payload.file,
          name: action.payload.file.name,
          size: formatFileSize(action.payload.file.size),
        },
        data: {
          ...state.data,
          showPreview: false,
          previewError: "",
          dataStats: null,
        },
      };
    case ACTION_TYPES.RESET_FILE:
      return {
        ...state,
        file: { selected: null, name: "", size: 0 },
        data: {
          ...state.data,
          showPreview: false,
          previewError: "",
          dataStats: null,
          csvData: [],
          fields: [],
        },
      };

    // Collection actions
    case ACTION_TYPES.SET_COLLECTIONS:
      return {
        ...state,
        collection: { ...state.collection, list: action.payload },
      };
    case ACTION_TYPES.SET_COLLECTION_LOADING:
      return {
        ...state,
        collection: { ...state.collection, loading: action.payload },
      };
    case ACTION_TYPES.SET_SELECTED_COLLECTION:
      return {
        ...state,
        collection: { ...state.collection, selected: action.payload },
      };

    // Parser option actions
    case ACTION_TYPES.SET_PARSER_OPTION:
      return {
        ...state,
        parsing: {
          ...state.parsing,
          [action.payload.name]: action.payload.value,
        },
      };

    // Data actions
    case ACTION_TYPES.SET_CSV_DATA:
      return { ...state, data: { ...state.data, csvData: action.payload } };
    case ACTION_TYPES.SET_FIELDS:
      return { ...state, data: { ...state.data, fields: action.payload } };
    case ACTION_TYPES.UPDATE_FIELD_MAPPING:
      return {
        ...state,
        data: {
          ...state.data,
          fieldMappings: {
            ...state.data.fieldMappings,
            [action.payload.columnIndex]: {
              ...state.data.fieldMappings[action.payload.columnIndex],
              targetField: action.payload.targetField,
            },
          },
        },
      };
    case ACTION_TYPES.SET_DATA_STATS:
      return { ...state, data: { ...state.data, dataStats: action.payload } };
    case ACTION_TYPES.SET_SHOW_PREVIEW:
      return { ...state, data: { ...state.data, showPreview: action.payload } };
    case ACTION_TYPES.SET_PREVIEW_ERROR:
      return {
        ...state,
        data: { ...state.data, previewError: action.payload },
      };

    // Progress actions
    case ACTION_TYPES.UPDATE_PROGRESS:
      return {
        ...state,
        progress: {
          ...state.progress,
          ...action.payload,
        },
      };
    case ACTION_TYPES.SET_UPLOAD_STATS:
      return {
        ...state,
        progress: { ...state.progress, uploadStats: action.payload },
      };
    case ACTION_TYPES.RESET_PROGRESS:
      return {
        ...state,
        progress: {
          uploadProgress: 0,
          totalRows: 0,
          uploadStartTime: null,
          estimatedTimeRemaining: null,
          uploadStats: null,
        },
      };

    // Network actions
    case ACTION_TYPES.SET_NETWORK_STATUS:
      return {
        ...state,
        network: { ...state.network, status: action.payload },
      };
    case ACTION_TYPES.SET_NETWORK_ERROR:
      return {
        ...state,
        network: { ...state.network, lastError: action.payload },
      };
    case ACTION_TYPES.INCREMENT_RETRY:
      return {
        ...state,
        network: { ...state.network, retryCount: state.network.retryCount + 1 },
      };
    case ACTION_TYPES.INCREMENT_RETRY:
      return {
        ...state,
        network: {
          ...state.network,
          retryCount:
            action.payload !== undefined
              ? action.payload
              : state.network.retryCount + 1,
        },
      };

    // Reset everything
    case ACTION_TYPES.RESET_ALL:
      return {
        ...initialState,
        collection: { ...state.collection }, // Keep the collections list
      };

    default:
      return state;
  }
}

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTimeRemaining = (seconds) => {
  if (!seconds || seconds < 0) return "جاري الحساب...";
  if (seconds < 60) return `${Math.ceil(seconds)} ثانية`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes} دقيقة ${remainingSeconds} ثانية`;
};

const calculateElapsedTime = (startTime) => {
  if (!startTime) return "0 ثانية";
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  if (seconds < 60) return `${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} دقيقة ${remainingSeconds} ثانية`;
};

// Main component
const CsvUpload = ({ darkMode, onSuccess }) => {
  const baseUrl = ApibaseUrl;

  // Use reducer for managing state
  const [state, dispatch] = useReducer(csvReducer, initialState);

  // Destructure state for easier access
  const { ui, file, collection, parsing, data, progress, network } = state;

  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const previewTableRef = useRef(null);
  const abortControllerRef = useRef(null);
  const sseRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Get corresponding delimiter character
  const getDelimiterChar = () => {
    const delimiterMap = {
      comma: ",",
      semicolon: ";",
      tab: "⇥",
      space: "␣",
      pipe: "|",
    };
    return delimiterMap[parsing.delimiter] || ",";
  };

  // 1. Modify cleanupConnections to take an optional parameter to specify which connections to clean up
  const cleanupConnections = useCallback((skipFetchRequests = false) => {
    // Cancel any ongoing SSE connections
    if (sseRef.current) {
      console.log("Closing SSE connection");
      sseRef.current.close();
      sseRef.current = null;
    }

    // Cancel any ongoing HTTP requests
    if (abortControllerRef.current && !skipFetchRequests) {
      console.log("Aborting HTTP requests");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear any retry timers
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // 2. Use a separate AbortController for collections fetch
  useEffect(() => {
    let isMounted = true;
    // Create a dedicated abort controller for this fetch operation
    const fetchAbortController = new AbortController();

    const fetchCollections = async () => {
      dispatch({ type: ACTION_TYPES.SET_COLLECTION_LOADING, payload: true });

      try {
        if (!baseUrl) {
          throw new Error("لم يتم تعريف عنوان API الأساسي.");
        }

        const response = await axios.get(`${baseUrl}/collections`, {
          signal: fetchAbortController.signal,
          timeout: 10000, // 10 second timeout
        });

        if (isMounted) {
          dispatch({
            type: ACTION_TYPES.SET_COLLECTIONS,
            payload: response.data.collections,
          });
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "online",
          });
        }
      } catch (error) {
        // Don't show error if it's a canceled request during unmount
        if (isMounted && !axios.isCancel(error)) {
          console.error("خطأ في جلب المجموعات:", error);

          // Check if it's a network error
          if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
            dispatch({
              type: ACTION_TYPES.SET_NETWORK_STATUS,
              payload: "offline",
            });
          }

          toast.error("حدث خطأ أثناء جلب المجموعات. يرجى المحاولة مرة أخرى.");
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_ERROR,
            payload: error.message,
          });
        }
      } finally {
        if (isMounted) {
          dispatch({
            type: ACTION_TYPES.SET_COLLECTION_LOADING,
            payload: false,
          });
        }
      }
    };

    fetchCollections();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      fetchAbortController.abort(); // Only abort this specific fetch
      cleanupConnections(true); // Skip aborting fetch requests when cleaning up
    };
  }, [baseUrl, cleanupConnections]);

  // Reset progress when upload completes
  useEffect(() => {
    if (ui.uploadComplete) {
      const timer = setTimeout(() => {
        dispatch({
          type: ACTION_TYPES.UPDATE_PROGRESS,
          payload: { uploadProgress: 0 },
        });
        dispatch({ type: ACTION_TYPES.SET_UPLOAD_COMPLETE, payload: false });
      }, 5000); // Reset progress bars 5 seconds after completion

      return () => clearTimeout(timer);
    }
  }, [ui.uploadComplete]);

  // Handle drag events for file upload
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: ACTION_TYPES.SET_IS_DRAGGING, payload: true });
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: ACTION_TYPES.SET_IS_DRAGGING, payload: false });
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: ACTION_TYPES.SET_IS_DRAGGING, payload: false });

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    };

    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener("dragover", handleDragOver);
      dropZone.addEventListener("dragleave", handleDragLeave);
      dropZone.addEventListener("drop", handleDrop);
    }

    return () => {
      if (dropZone) {
        dropZone.removeEventListener("dragover", handleDragOver);
        dropZone.removeEventListener("dragleave", handleDragLeave);
        dropZone.removeEventListener("drop", handleDrop);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+P for preview
      if (e.altKey && e.key === "p" && file.selected && collection.selected) {
        e.preventDefault();
        handleShowPreview();
      }

      // Alt+U for upload
      if (e.altKey && e.key === "u" && data.showPreview && !ui.isUploading) {
        e.preventDefault();
        handleSubmitImport();
      }

      // Alt+C for cancel
      if (e.altKey && e.key === "c" && ui.isUploading) {
        e.preventDefault();
        handleCancelUpload();
      }

      // Alt+A for advanced options
      if (e.altKey && e.key === "a") {
        e.preventDefault();
        dispatch({ type: ACTION_TYPES.TOGGLE_ADVANCED_OPTIONS });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [file.selected, collection.selected, data.showPreview, ui.isUploading]);

  // More efficient CSV analysis with sampling for large files
  const analyzeCSV = (data, sampleSize = 5000) => {
    if (!data || data.length <= 1) return null;

    try {
      // Determine if we need to sample (for very large datasets)
      const needsSampling = data.length > sampleSize + 1; // +1 for header

      // If sampling, take first row (header) and random sample of the rest
      const dataToAnalyze = needsSampling
        ? [data[0]].concat(
            data
              .slice(1)
              .sort(() => 0.5 - Math.random())
              .slice(0, sampleSize - 1)
          )
        : data;

      const statsObj = {
        totalRows: data.length - (parsing.hasHeader ? 1 : 0),
        totalColumns: data[0].length,
        emptyValues: 0,
        sampledRows: needsSampling ? sampleSize : data.length,
        columnStats: [],
      };

      // Initialize column stats
      for (let i = 0; i < data[0].length; i++) {
        statsObj.columnStats.push({
          uniqueValues: new Set(),
          emptyCount: 0,
          numericCount: 0,
          minLength: Infinity,
          maxLength: 0,
          possibleType: "unknown",
        });
      }

      // Process sampled data
      const startRow = parsing.hasHeader ? 1 : 0;
      for (let i = startRow; i < dataToAnalyze.length; i++) {
        const row = dataToAnalyze[i];

        for (let j = 0; j < row.length; j++) {
          const value = row[j];
          // Skip if column doesn't exist in this row
          if (j >= row.length) continue;

          const stats = statsObj.columnStats[j];

          // Check for empty values
          if (!value || value.trim() === "") {
            stats.emptyCount++;
            statsObj.emptyValues++;
            continue;
          }

          // Add to unique values (limit to 100)
          if (stats.uniqueValues.size < 100) {
            stats.uniqueValues.add(value);
          }

          // Check if numeric
          if (!isNaN(value) && value.trim() !== "") {
            stats.numericCount++;
          }

          // Min/max length
          const valueLength = value.length;
          stats.minLength = Math.min(stats.minLength, valueLength);
          stats.maxLength = Math.max(stats.maxLength, valueLength);
        }
      }

      // Determine probable types and scale values for sampled data
      const samplingRatio = needsSampling
        ? data.length / dataToAnalyze.length
        : 1;

      statsObj.columnStats.forEach((stats) => {
        // Scale empty count to full dataset size
        if (needsSampling) {
          stats.emptyCount = Math.round(stats.emptyCount * samplingRatio);
        }

        const dataRowCount = statsObj.totalRows - stats.emptyCount;

        if (dataRowCount === 0) {
          stats.possibleType = "empty";
        } else if (
          stats.numericCount / (dataToAnalyze.length - startRow) >
          0.9
        ) {
          stats.possibleType = "number";
        } else if (
          stats.uniqueValues.size / (dataToAnalyze.length - startRow) < 0.1 &&
          stats.uniqueValues.size > 1
        ) {
          stats.possibleType = "category";
        } else {
          stats.possibleType = "text";
        }

        // Convert Set to count for JSON serialization
        stats.uniqueCount = stats.uniqueValues.size;
        stats.uniqueValuesList = needsSampling
          ? "Sampled data - exact counts unavailable"
          : Array.from(stats.uniqueValues).slice(0, 20);
        delete stats.uniqueValues;
      });

      // Scale total empty values
      if (needsSampling) {
        statsObj.emptyValues = Math.round(statsObj.emptyValues * samplingRatio);
        statsObj.note = "Statistics generated from sampled data.";
      }

      return statsObj;
    } catch (error) {
      console.error("Error analyzing CSV data:", error);
      // Return a minimal stats object to prevent undefined errors
      return {
        totalRows: data.length - (parsing.hasHeader ? 1 : 0),
        totalColumns: 0,
        emptyValues: 0,
        error: error.message,
        columnStats: [],
      };
    }
  };

  // Handle file validation and selection
  const handleFileSelection = (file) => {
    // Reset states
    dispatch({ type: ACTION_TYPES.SET_PREVIEW_ERROR, payload: "" });
    dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: false });
    dispatch({ type: ACTION_TYPES.SET_DATA_STATS, payload: null });

    // Check if it's a CSV file
    if (file && !file.type.includes("csv") && !file.name.endsWith(".csv")) {
      toast.error("يرجى اختيار ملف بصيغة CSV فقط.");
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      return;
    }

    dispatch({ type: ACTION_TYPES.SET_FILE, payload: { file } });

    // Switch to the upload tab if we're on a different tab
    if (ui.activeTab !== "upload") {
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "upload" });
    }
  };

  // Handle file input change
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  // Handle collection change
  const handleCollectionChange = (event) => {
    dispatch({
      type: ACTION_TYPES.SET_SELECTED_COLLECTION,
      payload: event.target.value,
    });
  };

  // Handler for parser option changes
  const handleParserOptionChange = (name, value) => {
    dispatch({
      type: ACTION_TYPES.SET_PARSER_OPTION,
      payload: { name, value },
    });
  };

  // 3. Update the handleReset function to use the modified cleanupConnections
  const handleReset = () => {
    // Clean up any connections first, but don't skip fetch requests here
    cleanupConnections(false);

    // Reset all state
    dispatch({ type: ACTION_TYPES.RESET_ALL });

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }

    // Go back to the upload tab
    dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "upload" });
  };

  // Improved preview generation with error handling and sampling for large files
  const generatePreview = useCallback(() => {
    if (!file.selected || !collection.selected) return;

    dispatch({ type: ACTION_TYPES.SET_PREVIEW_ERROR, payload: "" });
    dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: false });
    dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: true });
    dispatch({ type: ACTION_TYPES.SET_DATA_STATS, payload: null });
    dispatch({ type: ACTION_TYPES.SET_CSV_DATA, payload: [] });
    dispatch({ type: ACTION_TYPES.SET_FIELDS, payload: [] });

    const delimiterMap = {
      comma: ",",
      semicolon: ";",
      tab: "\t",
      space: " ",
      pipe: "|",
    };
    const delimChar = delimiterMap[parsing.delimiter] || ",";

    // For large files, first check a small sample to validate format
    const validateSample = async () => {
      try {
        // Only read first ~100KB for validation
        const sampleSize = Math.min(file.selected.size, 100 * 1024);
        const sampleBlob = file.selected.slice(0, sampleSize);

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const sampleContent = evt.target.result;
            const firstFewLines = sampleContent
              .split("\n")
              .slice(0, 5)
              .join("\n");

            // Check if delimiter seems valid
            const columns = firstFewLines.split(delimChar);
            let warningMessage = null;

            if (columns.length <= 1 && sampleContent.length > 0) {
              // Instead of failing, just show a warning
              const potentialDelimiters = Object.entries(delimiterMap)
                .filter(([key, char]) => sampleContent.split(char).length > 1)
                .map(([key]) => key);

              if (potentialDelimiters.length > 0) {
                warningMessage = `تنبيه: يبدو أن الملف لا يستخدم الفاصل "${delimChar}". ربما يكون أفضل تجربة: ${potentialDelimiters.join(
                  ", "
                )}`;
              } else {
                warningMessage =
                  "تنبيه: قد لا يكون هذا ملف CSV صالح. تحقق من تنسيق الملف.";
              }
            }

            // Get approximate line count for more accurate total rows
            const lineCount = sampleContent.split("\n").length;
            const estimatedTotalRows = Math.round(
              (lineCount / sampleSize) * file.selected.size
            );

            resolve({
              warningMessage,
              estimatedTotalRows:
                file.selected.size > sampleSize
                  ? estimatedTotalRows
                  : lineCount - (parsing.hasHeader ? 1 : 0),
            });
          };

          reader.onerror = () => {
            resolve({
              warningMessage: "فشل في قراءة عينة من الملف.",
              estimatedTotalRows: 0,
            });
          };

          reader.readAsText(sampleBlob, parsing.encoding);
        });
      } catch (error) {
        console.error("Error reading file sample:", error);
        return {
          warningMessage: `فشل في قراءة عينة من الملف: ${error.message}`,
          estimatedTotalRows: 0,
        };
      }
    };

    // Now process the file for preview
    const processPreview = async () => {
      try {
        // First validate the file format using a small sample
        const { warningMessage, estimatedTotalRows } = await validateSample();

        if (warningMessage) {
          dispatch({
            type: ACTION_TYPES.SET_PREVIEW_ERROR,
            payload: warningMessage,
          });
        }

        // For large files, only read a preview chunk
        const isLargeFile = file.selected.size > 5 * 1024 * 1024; // 5MB
        const chunkSize = isLargeFile ? 500 * 1024 : file.selected.size; // 500KB for large files
        const fileChunk = file.selected.slice(0, chunkSize);

        const reader = new FileReader();
        reader.onload = (evt) => {
          const fileContent = evt.target.result;

          // Parse the preview chunk
          Papa.parse(fileContent, {
            delimiter: delimChar,
            encoding: parsing.encoding,
            skipEmptyLines: parsing.skipEmptyLines,
            preview: Math.max(parsing.previewRows + 1, 30), // Get a bit more data for analysis
            complete: (results) => {
              dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: false });

              if (results.errors && results.errors.length > 0) {
                // Show warning but still display data if possible
                console.warn("Warnings in CSV parse:", results.errors);
                dispatch({
                  type: ACTION_TYPES.SET_PREVIEW_ERROR,
                  payload:
                    warningMessage ||
                    `تنبيه: قد تكون هناك مشاكل في تحليل ملف CSV: ${results.errors[0].message}`,
                });
              } else if (warningMessage) {
                dispatch({
                  type: ACTION_TYPES.SET_PREVIEW_ERROR,
                  payload: warningMessage,
                });
              }

              if (!results.data || results.data.length === 0) {
                dispatch({
                  type: ACTION_TYPES.SET_PREVIEW_ERROR,
                  payload: "لم يتم العثور على بيانات في ملف CSV.",
                });
                return;
              }

              dispatch({
                type: ACTION_TYPES.SET_CSV_DATA,
                payload: results.data,
              });

              // Determine fields based on header presence
              if (parsing.hasHeader && results.data.length > 0) {
                // First row is header
                const headerRow = results.data[0];
                const fieldsDetected = headerRow.map((col, index) => ({
                  name: col || `Column${index + 1}`,
                  type: "String",
                  index,
                  original: col || `Column${index + 1}`, // Keep original name for mapping
                }));

                dispatch({
                  type: ACTION_TYPES.SET_FIELDS,
                  payload: fieldsDetected,
                });

                // Initialize field mappings
                const initialMappings = {};
                fieldsDetected.forEach((field) => {
                  initialMappings[field.index] = {
                    targetField: field.name,
                    originalField: field.original,
                  };
                });

                // Update field mappings only if not already set
                if (Object.keys(data.fieldMappings).length === 0) {
                  fieldsDetected.forEach((field) => {
                    dispatch({
                      type: ACTION_TYPES.UPDATE_FIELD_MAPPING,
                      payload: {
                        columnIndex: field.index,
                        targetField: field.name,
                      },
                    });
                  });
                }
              } else {
                // No header - generate column names
                const firstRow = results.data[0] || [];
                const fieldsDetected = firstRow.map((_, index) => ({
                  name: `Column${index + 1}`,
                  type: "String",
                  index,
                  original: `Column${index + 1}`,
                }));

                dispatch({
                  type: ACTION_TYPES.SET_FIELDS,
                  payload: fieldsDetected,
                });

                // Initialize field mappings
                if (Object.keys(data.fieldMappings).length === 0) {
                  fieldsDetected.forEach((field) => {
                    dispatch({
                      type: ACTION_TYPES.UPDATE_FIELD_MAPPING,
                      payload: {
                        columnIndex: field.index,
                        targetField: field.name,
                      },
                    });
                  });
                }
              }

              // Analyze data
              const dataAnalysis = analyzeCSV(results.data);

              // Update total rows with our best estimate
              if (dataAnalysis) {
                // For large files where we only processed a chunk, use our estimated total
                if (isLargeFile) {
                  dataAnalysis.totalRows = estimatedTotalRows;
                  dataAnalysis.note =
                    "Approximate count for large file. Statistics based on sample.";
                }
              }

              dispatch({
                type: ACTION_TYPES.SET_DATA_STATS,
                payload: dataAnalysis,
              });

              // Update total rows
              dispatch({
                type: ACTION_TYPES.UPDATE_PROGRESS,
                payload: {
                  totalRows: isLargeFile
                    ? estimatedTotalRows
                    : dataAnalysis.totalRows,
                },
              });

              dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: true });
              dispatch({
                type: ACTION_TYPES.SET_ACTIVE_TAB,
                payload: "preview",
              });
            },
            error: (error) => {
              dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: false });
              dispatch({
                type: ACTION_TYPES.SET_PREVIEW_ERROR,
                payload: `فشل في تحليل الملف: ${error.message}`,
              });
            },
          });
        };

        reader.onerror = () => {
          dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: false });
          dispatch({
            type: ACTION_TYPES.SET_PREVIEW_ERROR,
            payload: "فشل في قراءة الملف.",
          });
        };

        reader.readAsText(fileChunk, parsing.encoding);
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: false });
        dispatch({
          type: ACTION_TYPES.SET_PREVIEW_ERROR,
          payload: `خطأ: ${error.message}`,
        });
      }
    };

    processPreview();
  }, [file.selected, collection.selected, parsing, data.fieldMappings]);

  // Handle preview button click
  const handleShowPreview = (event) => {
    if (event) event.preventDefault();

    if (!file.selected) {
      toast.error("يرجى اختيار ملف CSV.");
      return;
    }
    if (!collection.selected) {
      toast.error("يرجى اختيار مجموعة.");
      return;
    }

    generatePreview();
  };

  // Toggle field mapping mode
  const toggleFieldMapping = () => {
    dispatch({ type: ACTION_TYPES.TOGGLE_FIELD_MAPPING });
  };

  // Update field mapping
  const updateFieldMapping = (columnIndex, newTargetField) => {
    dispatch({
      type: ACTION_TYPES.UPDATE_FIELD_MAPPING,
      payload: {
        columnIndex,
        targetField: newTargetField,
      },
    });
  };

  // Enhanced cancel upload function with better cleanup
  const handleCancelUpload = () => {
    // Create and use a new controller for cancellation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Close SSE connection
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
    dispatch({
      type: ACTION_TYPES.UPDATE_PROGRESS,
      payload: { uploadProgress: 0 },
    });

    toast.info("تم إلغاء عملية الرفع.");
  };

  // "Quick Upload" without preview
  const handleQuickUpload = () => {
    if (!file.selected || !collection.selected) {
      toast.error("يرجى اختيار ملف CSV ومجموعة.");
      return;
    }

    // Automatically adjust batch size based on file size
    if (file.selected.size > 100 * 1024 * 1024) {
      // > 100MB
      handleParserOptionChange("batchSize", 5000);
    } else if (file.selected.size > 10 * 1024 * 1024) {
      // > 10MB
      handleParserOptionChange("batchSize", 2000);
    } else if (file.selected.size > 1 * 1024 * 1024) {
      // > 1MB
      handleParserOptionChange("batchSize", 1000);
    }

    // Proceed directly to upload
    handleSubmitImport();
  };
  // Enhanced upload function with better error handling and retries
  const handleSubmitImport = async () => {
    if (!file.selected || !collection.selected) {
      toast.error("يرجى اختيار ملف CSV ومجموعة.");
      return;
    }

    // Confirm if file is large (>10MB)
    if (file.selected.size > 10 * 1024 * 1024) {
      if (
        !window.confirm(
          `هذا ملف كبير (${file.size}). هل أنت متأكد من المتابعة؟`
        )
      ) {
        return;
      }
    }

    dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: true });
    dispatch({
      type: ACTION_TYPES.UPDATE_PROGRESS,
      payload: {
        uploadProgress: 0,
        estimatedTimeRemaining: null,
        uploadStartTime: Date.now(),
      },
    });
    dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "progress" });

    // Reset upload stats
    dispatch({ type: ACTION_TYPES.SET_UPLOAD_STATS, payload: null });

    // Create a new abort controller for this upload
    cleanupConnections(); // Clean up any existing connections
    abortControllerRef.current = new AbortController();

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("csvFile", file.selected);
      formData.append("collectionName", collection.selected);
      formData.append("delimiter", parsing.delimiter);
      formData.append("encoding", parsing.encoding);
      formData.append("hasHeader", parsing.hasHeader.toString());
      formData.append("batchSize", parsing.batchSize.toString());
      formData.append("skipEmptyLines", parsing.skipEmptyLines.toString());

      // Add field mappings if we're using custom mapping
      if (Object.keys(data.fieldMappings).length > 0) {
        formData.append("fieldMappings", JSON.stringify(data.fieldMappings));
      }

      console.log("Starting upload with formData", {
        collection: collection.selected,
        delimiter: parsing.delimiter,
        encoding: parsing.encoding,
        hasHeader: parsing.hasHeader,
      });

      // Open SSE channel for real-time progress BEFORE making the POST request
      // This ensures we don't miss any early progress updates
      openSSEChannel(collection.selected);

      // Perform the upload with the abort controller's signal
      const response = await axios.post(
        `${baseUrl}/upload-csv/${collection.selected}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              dispatch({
                type: ACTION_TYPES.UPDATE_PROGRESS,
                payload: { uploadProgress: percent },
              });
            }
          },
          timeout: 0, // No timeout for large uploads
          signal: abortControllerRef.current.signal,
        }
      );

      // When the server accepts the file (status 202), don't switch to results tab
      // and don't set uploadStats yet - wait for SSE to complete
      if (response.status === 200 || response.status === 202) {
        console.log("Upload response:", response.data);

        // Only notify the user that upload started, but don't set upload stats yet
        toast.info("تم قبول الملف وبدأت المعالجة. يرجى الانتظار...");

        // Switch to results tab after upload completes
        dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "progress" });
        dispatch({ type: ACTION_TYPES.SET_NETWORK_STATUS, payload: "online" });
      } else {
        toast.error("فشل في استيراد الملف.");
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Upload aborted by user");
        toast.info("تم إلغاء عملية الرفع.");
      } else {
        console.error("CSV upload error:", err);

        // Network error handling with retry
        if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "offline",
          });
          toast.error("انقطع الاتصال بالخادم. سنحاول إعادة الاتصال تلقائيًا.");

          // SSE will reconnect automatically in most browsers
          // Just update the UI to reflect status
        } else if (err.response) {
          // Server responded with error
          const errorMessage =
            err.response.data?.message || `خطأ ${err.response.status}`;

          if (err.response.status === 400) {
            toast.error(`خطأ في تنسيق البيانات: ${errorMessage}`);
          } else if (err.response.status === 404) {
            toast.error(`المجموعة المحددة غير موجودة: ${errorMessage}`);
          } else if (err.response.status === 413) {
            toast.error(`حجم الملف كبير جدًا: ${errorMessage}`);
          } else if (err.response.status >= 500) {
            toast.error(`خطأ في الخادم: ${errorMessage}`);
          } else {
            toast.error(`فشل في استيراد ملف CSV: ${errorMessage}`);
          }

          dispatch({
            type: ACTION_TYPES.SET_PREVIEW_ERROR,
            payload: `خطأ: ${errorMessage}`,
          });
        } else {
          toast.error(`حدث خطأ أثناء استيراد ملف CSV: ${err.message}`);
        }

        dispatch({
          type: ACTION_TYPES.SET_NETWORK_ERROR,
          payload: err.message,
        });
      }
    } finally {
      // We don't set isUploading false here if we still have an active SSE connection
      // The SSE completion handler will set it when done
      if (!sseRef.current) {
        dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
      }
    }
  };

  // Modify the openSSEChannel function to handle reconnection more robustly:
  const openSSEChannel = (collectionName) => {
    try {
      const sseUrl = `${baseUrl}/upload-csv/progress/${collectionName}`;
      console.log("Opening SSE connection to:", sseUrl);

      // Close any existing connection
      if (sseRef.current) {
        console.log("Closing previous SSE connection");
        sseRef.current.close();
        sseRef.current = null;
      }

      // Create new connection
      sseRef.current = new EventSource(sseUrl);

      // Connection opened successfully
      sseRef.current.onopen = () => {
        console.log("SSE connection opened successfully");
        dispatch({ type: ACTION_TYPES.SET_NETWORK_STATUS, payload: "online" });
        dispatch({ type: ACTION_TYPES.INCREMENT_RETRY, payload: 0 }); // Reset retry count on successful connection
      };

      // Handle incoming messages
      sseRef.current.onmessage = (event) => {
        try {
          console.log("SSE message received:", event.data);
          const data = JSON.parse(event.data);

          // Extract values with fallbacks
          const processedCount =
            typeof data.processedCount === "number" ? data.processedCount : 0;
          const totalRows =
            typeof data.totalRows === "number"
              ? data.totalRows
              : progress.totalRows || 0;
          const done = Boolean(data.done);

          // Update processed rows and total rows first
          dispatch({
            type: ACTION_TYPES.UPDATE_PROGRESS,
            payload: {
              totalRows: totalRows,
            },
          });

          // Only handle completion when done flag is true
          if (done) {
            console.log("SSE signals processing is complete");

            // Close the connection
            if (sseRef.current) {
              sseRef.current.close();
              sseRef.current = null;
            }

            dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
            dispatch({ type: ACTION_TYPES.SET_UPLOAD_COMPLETE, payload: true });

            // Now set the upload stats from the SSE data
            const successCount = data.totalInserted || processedCount || 0;
            const failedCount = data.totalFailed || 0;

            // Added check for totalInserted and totalFailed from backend
            if (
              data.totalInserted !== undefined ||
              data.totalFailed !== undefined
            ) {
              dispatch({
                type: ACTION_TYPES.SET_UPLOAD_STATS,
                payload: {
                  successCount: successCount,
                  failedCount: failedCount,
                  totalRows: totalRows || successCount + failedCount,
                  timestamp: new Date().toISOString(),
                  processingTime:
                    data.processingTime ||
                    Date.now() - progress.uploadStartTime,
                  failedSamples: data.failedSamples || [],
                },
              });
            }

            // Only switch to results tab when processing is complete
            dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "results" });

            // Call the onSuccess callback if provided
            if (onSuccess) {
              onSuccess({
                fileName: file.selected?.name ?? "",
                collectionName: collection.selected,
                recordCount: successCount,
              });
            }

            // if (percent === 100) {
            //   // toast.success("تم الانتهاء من معالجة البيانات بنجاح!");
            // }
          }
        } catch (parseErr) {
          console.error("Failed to parse SSE event:", parseErr, event.data);
        }
      };

      // Handle errors
      sseRef.current.onerror = (err) => {
        console.error("SSE error:", err);

        // Check if we should try to reconnect
        if (network.retryCount < 3) {
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "reconnecting",
          });
          dispatch({ type: ACTION_TYPES.INCREMENT_RETRY });

          // Most browsers will automatically attempt to reconnect
          // But we'll add a manual reconnect after a delay just in case
          retryTimerRef.current = setTimeout(() => {
            if (sseRef.current) {
              // If we still have a reference but in error state, try reopening
              console.log(`Manual reconnect attempt ${network.retryCount + 1}`);
              openSSEChannel(collectionName);
            }
          }, 5000); // 5 second delay before manual reconnect
        } else {
          // Too many retries, give up
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }

          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "offline",
          });
          dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
          dispatch({ type: ACTION_TYPES.SET_UPLOAD_COMPLETE, payload: true });

          // Notify user
          toast.error(
            "فشل الاتصال بالخادم. يرجى التحقق من الاتصال وإعادة المحاولة لاحقًا."
          );
        }
      };

      // Set a timeout for SSE connection
      setTimeout(() => {
        // If SSE is still open but we don't have any update for 3 minutes, close it
        if (
          sseRef.current &&
          ui.isUploading &&
          new Date() - progress.uploadStartTime > 3 * 60 * 1000
        ) {
          console.log("SSE timeout - no updates received for 3 minutes");

          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }

          dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
          dispatch({ type: ACTION_TYPES.SET_UPLOAD_COMPLETE, payload: true });

          toast.warning(
            "انتهت مهلة الاتصال. قد تكون العملية لا تزال جارية في الخادم."
          );
        }
      }, 3 * 60 * 1000); // 3 minute timeout
    } catch (err) {
      console.error("Error setting up SSE:", err);
    }
  };

  // Detect column type and return appropriate icon/color
  const getColumnTypeIndicator = (columnIndex) => {
    // More robust check to prevent "stats is undefined" errors
    if (
      !data.dataStats ||
      !data.dataStats.columnStats ||
      !data.dataStats.columnStats[columnIndex]
    ) {
      return null;
    }

    const stats = data.dataStats.columnStats[columnIndex];
    if (!stats) {
      return null;
    }

    let icon = null;
    let color = darkMode ? "text-gray-400" : "text-gray-600";
    let tooltip = "";

    switch (stats.possibleType) {
      case "number":
        icon = (
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
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        );
        color = darkMode ? "text-blue-400" : "text-blue-600";
        tooltip = "عددي";
        break;
      case "category":
        icon = (
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        );
        color = darkMode ? "text-green-400" : "text-green-600";
        tooltip = "فئة";
        break;
      case "text":
        icon = (
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
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        );
        color = darkMode ? "text-purple-400" : "text-purple-600";
        tooltip = "نص";
        break;
      case "empty":
        icon = (
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
              d="M18 12H6"
            />
          </svg>
        );
        color = darkMode ? "text-red-400" : "text-red-600";
        tooltip = "فارغ";
        break;
      default:
        icon = (
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
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
        tooltip = "غير معروف";
    }

    return (
      <div className={`flex items-center ${color}`} title={tooltip}>
        {icon}
        <span className="ml-1 text-xs">
          {stats.emptyCount > 0 && `${stats.emptyCount} فارغ`}
        </span>
      </div>
    );
  };

  // Component styles
  const cardStyle = `rounded-lg ${
    darkMode
      ? "bg-gray-800 text-white"
      : "bg-white text-gray-800 border border-gray-200"
  }`;
  const inputStyle = `w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
    darkMode
      ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
      : "bg-white border-gray-300 text-gray-800 focus:ring-blue-400"
  }`;
  const buttonPrimaryStyle = `px-4 py-2 rounded-lg transition-colors ${
    darkMode
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-blue-500 hover:bg-blue-600 text-white"
  }`;
  const buttonSecondaryStyle = `px-4 py-2 rounded-lg transition-colors ${
    darkMode
      ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
  }`;
  const buttonSuccessStyle = `px-4 py-2 rounded-lg transition-colors ${
    darkMode
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-green-500 hover:bg-green-600 text-white"
  }`;
  const buttonDangerStyle = `px-4 py-2 rounded-lg transition-colors ${
    darkMode
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-red-500 hover:bg-red-600 text-white"
  }`;

  // Add network status indicator style
  const getNetworkStatusStyle = () => {
    switch (network.status) {
      case "online":
        return darkMode ? "text-green-400" : "text-green-600";
      case "offline":
        return darkMode ? "text-red-400" : "text-red-600";
      case "reconnecting":
        return darkMode ? "text-yellow-400" : "text-yellow-600";
      default:
        return darkMode ? "text-gray-400" : "text-gray-600";
    }
  };

  const getNetworkStatusIcon = () => {
    switch (network.status) {
      case "online":
        return (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "offline":
        return (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "reconnecting":
        return (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      default:
        return (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  // 2. Add a new utility function for formatting processing time
  // Add this to your utility functions at the top of the component

  const formatProcessingTime = (timeInMs) => {
    // Ensure we're working with a number
    const ms = typeof timeInMs === "string" ? parseInt(timeInMs) : timeInMs;

    if (isNaN(ms) || ms <= 0) return "0 ثانية";

    // For times less than 1 second
    if (ms < 1000) {
      return `${ms} مللي ثانية`;
    }

    // For times less than 1 minute
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)} ثانية`;
    }

    // For times 1 minute or more
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);

    if (seconds === "0.0") {
      return `${minutes} دقيقة`;
    }

    return `${minutes} دقيقة ${seconds} ثانية`;
  };

  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      {/* Header with tabs */}
      <div className={`${cardStyle} shadow-md p-4 mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-7 w-7 mr-2 ${
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <h2 className="text-xl font-bold">رفع ملف CSV</h2>
          </div>

          {/* Network status indicator */}
          <div className={`flex items-center mr-4 ${getNetworkStatusStyle()}`}>
            {getNetworkStatusIcon()}
            <span className="ml-1 text-xs">
              {network.status === "online" && "متصل"}
              {network.status === "offline" && "غير متصل"}
              {network.status === "reconnecting" && "جاري إعادة الاتصال..."}
            </span>
          </div>

          {/* Keyboard shortcuts */}
          <div className="hidden md:flex items-center space-x-2 rtl:space-x-reverse text-xs">
            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
              اختصارات:
            </span>
            <kbd
              className={`px-1.5 py-0.5 rounded border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-300"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            >
              Alt+P
            </kbd>
            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
              معاينة
            </span>

            <kbd
              className={`px-1.5 py-0.5 rounded border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-300"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            >
              Alt+U
            </kbd>
            <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
              رفع
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              ui.activeTab === "upload"
                ? darkMode
                  ? "border-blue-500 text-blue-400"
                  : "border-blue-500 text-blue-600"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() =>
              dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "upload" })
            }
          >
            <div className="flex items-center">
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
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              اختيار الملف
            </div>
          </button>

          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              ui.activeTab === "preview"
                ? darkMode
                  ? "border-blue-500 text-blue-400"
                  : "border-blue-500 text-blue-600"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() =>
              data.showPreview &&
              dispatch({
                type: ACTION_TYPES.SET_ACTIVE_TAB,
                payload: "preview",
              })
            }
            disabled={!data.showPreview}
          >
            <div className="flex items-center">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              معاينة البيانات
            </div>
          </button>

          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              ui.activeTab === "settings"
                ? darkMode
                  ? "border-blue-500 text-blue-400"
                  : "border-blue-500 text-blue-600"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() =>
              dispatch({
                type: ACTION_TYPES.SET_ACTIVE_TAB,
                payload: "settings",
              })
            }
          >
            <div className="flex items-center">
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              إعدادات التحليل
            </div>
          </button>

          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              ui.activeTab === "progress" || ui.activeTab === "results"
                ? darkMode
                  ? "border-blue-500 text-blue-400"
                  : "border-blue-500 text-blue-600"
                : darkMode
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() =>
              (progress.uploadStats || ui.isUploading) &&
              dispatch({
                type: ACTION_TYPES.SET_ACTIVE_TAB,
                payload: ui.isUploading ? "progress" : "results",
              })
            }
            disabled={!progress.uploadStats && !ui.isUploading}
          >
            <div className="flex items-center">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {ui.isUploading ? "التقدم" : "النتائج"}
            </div>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className={`${cardStyle} shadow-lg p-6`}>
        {/* File Upload Tab */}
        {ui.activeTab === "upload" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collection selection */}
              <div>
                <label className="block font-medium mb-2">اختر المجموعة</label>
                {collection.loading ? (
                  <div
                    className={`w-full px-4 py-2 rounded-lg flex items-center ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <svg
                      className="animate-spin h-5 w-5 mr-3 text-blue-500"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>جاري تحميل المجموعات...</span>
                  </div>
                ) : (
                  <select
                    value={collection.selected}
                    onChange={handleCollectionChange}
                    className={inputStyle}
                  >
                    <option value="">-- اختر المجموعة --</option>
                    {collection.list.map((col) => (
                      <option
                        key={col._id || col.collectionName}
                        value={col.collectionName}
                      >
                        {col.displayName || col.collectionName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Basic parser options */}
              <div>
                <label className="block font-medium mb-2">إعدادات أساسية</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={parsing.delimiter}
                    onChange={(e) =>
                      handleParserOptionChange("delimiter", e.target.value)
                    }
                    className={inputStyle}
                  >
                    <option value="comma">فاصلة (,)</option>
                    <option value="semicolon">فاصلة منقوطة (;)</option>
                    <option value="tab">مسافة جدولية (Tab)</option>
                    <option value="space">مسافة (Space)</option>
                    <option value="pipe">عمودي (|)</option>
                  </select>

                  <select
                    value={parsing.encoding}
                    onChange={(e) =>
                      handleParserOptionChange("encoding", e.target.value)
                    }
                    className={inputStyle}
                  >
                    <option value="utf-8">UTF-8 (يدعم العربية)</option>
                    <option value="ISO-8859-1">Latin-1 (ISO-8859-1)</option>
                    <option value="ISO-8859-6">Arabic (ISO-8859-6)</option>
                    <option value="windows-1256">Windows Arabic (1256)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* File upload zone */}
            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer ${
                ui.isDragging
                  ? darkMode
                    ? "border-blue-400 bg-blue-900/20"
                    : "border-blue-400 bg-blue-50"
                  : darkMode
                  ? "border-gray-600 hover:border-gray-500"
                  : "border-gray-300 hover:border-gray-400"
              } ${
                file.selected
                  ? darkMode
                    ? "border-green-500"
                    : "border-green-400"
                  : ""
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`mx-auto h-16 w-16 mb-4 ${
                    file.selected
                      ? darkMode
                        ? "text-green-400"
                        : "text-green-500"
                      : darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {file.selected ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  )}
                </svg>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file.selected ? (
                  <div>
                    <p className="font-medium text-lg">{file.name}</p>
                    <p
                      className={`mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      حجم الملف: {file.size}
                    </p>
                    <div className="flex justify-center mt-4 space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className={buttonSecondaryStyle}
                      >
                        تغيير الملف
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className={`${buttonSecondaryStyle} !bg-red-100 !text-red-700 dark:!bg-red-900/30 dark:!text-red-400`}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-lg">
                      اسحب وأفلت ملف CSV هنا
                    </p>
                    <p
                      className={`mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      أو انقر لاختيار ملف
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between">
              <button
                onClick={() =>
                  dispatch({
                    type: ACTION_TYPES.SET_ACTIVE_TAB,
                    payload: "settings",
                  })
                }
                className={buttonSecondaryStyle}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  إعدادات متقدمة
                </div>
              </button>

              <div className="space-x-2 rtl:space-x-reverse">
                <button
                  onClick={handleShowPreview}
                  disabled={
                    !file.selected || !collection.selected || ui.isAnalyzing
                  }
                  className={`${buttonPrimaryStyle} ${
                    !file.selected || !collection.selected || ui.isAnalyzing
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {ui.isAnalyzing ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 ml-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      جاري التحليل...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      معاينة البيانات
                    </div>
                  )}
                </button>

                <button
                  onClick={handleQuickUpload}
                  disabled={
                    !file.selected ||
                    !collection.selected ||
                    ui.isUploading ||
                    ui.isAnalyzing
                  }
                  className={`${buttonSuccessStyle} ${
                    !file.selected ||
                    !collection.selected ||
                    ui.isUploading ||
                    ui.isAnalyzing
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
                      />
                    </svg>
                    رفع سريع
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Preview Tab */}
        {ui.activeTab === "preview" && (
          <div className="space-y-6">
            {data.previewError ? (
              <div
                className={`p-4 rounded-lg text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300`}
              >
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-2 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">تنبيه</p>
                    <p className="mt-1">{data.previewError}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* File info bar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 ml-1 ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">{file.name}</span>
                <span
                  className={`ml-2 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {file.size}
                </span>
              </div>

              <div className="flex items-center">
                <span
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  المجموعة:
                </span>
                <span className="font-medium ml-1">
                  {(collection.list && collection.list.length > 0
                    ? collection.list.find(
                        (c) => c.collectionName === collection.selected
                      )?.displayName
                    : null) || collection.selected}
                </span>
              </div>
            </div>

            {/* Data stats */}
            {data.dataStats && (
              <div
                className={`p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <h3 className="text-lg font-medium mb-4">إحصائيات البيانات</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      عدد الصفوف
                    </div>
                    <div className="text-xl font-bold">
                      {data.dataStats.totalRows}
                    </div>
                    {data.dataStats.note && (
                      <div
                        className={`text-xs mt-1 ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                      >
                        {data.dataStats.sampledRows &&
                        data.dataStats.sampledRows < data.dataStats.totalRows
                          ? `تقدير من ${data.dataStats.sampledRows} عينة`
                          : data.dataStats.note}
                      </div>
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      عدد الأعمدة
                    </div>
                    <div className="text-xl font-bold">
                      {data.dataStats.totalColumns}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      القيم الفارغة
                    </div>
                    <div className="text-xl font-bold">
                      {data.dataStats.emptyValues}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg ${
                      darkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      الترميز / الفاصل
                    </div>
                    <div className="text-lg font-bold">
                      {parsing.encoding} / {getDelimiterChar()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data preview table */}
            <div className="overflow-x-auto shadow rounded-lg">
              <table className="min-w-full divide-y" ref={previewTableRef}>
                <thead className={darkMode ? "bg-gray-800" : "bg-gray-50"}>
                  <tr>
                    {data.fields.map((field, colIndex) => (
                      <th
                        key={colIndex}
                        className="px-4 py-3 text-right text-sm font-medium tracking-wider"
                      >
                        <div className="flex items-center justify-between">
                          <span>{field.name}</span>
                          {getColumnTypeIndicator(colIndex)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody
                  className={`divide-y ${
                    darkMode ? "divide-gray-700" : "divide-gray-200"
                  }`}
                >
                  {/* Show data rows based on header presence */}
                  {(parsing.hasHeader
                    ? data.csvData.slice(1, 1 + parsing.previewRows)
                    : data.csvData.slice(0, parsing.previewRows)
                  ).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`${
                        rowIndex % 2 === 0
                          ? darkMode
                            ? "bg-gray-700"
                            : "bg-white"
                          : darkMode
                          ? "bg-gray-750"
                          : "bg-gray-50"
                      } hover:bg-opacity-80`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-sm whitespace-nowrap"
                        >
                          {cell || <span className="text-gray-400">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Message for more rows */}
              {data.csvData.length >
                (parsing.hasHeader
                  ? 1 + parsing.previewRows
                  : parsing.previewRows) && (
                <div
                  className={`p-2 text-center text-sm ${
                    darkMode
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  +{" "}
                  {data.csvData.length -
                    (parsing.hasHeader
                      ? 1 + parsing.previewRows
                      : parsing.previewRows)}{" "}
                  صفوف أخرى غير معروضة
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() =>
                  dispatch({
                    type: ACTION_TYPES.SET_ACTIVE_TAB,
                    payload: "settings",
                  })
                }
                className={buttonSecondaryStyle}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
                    />
                  </svg>
                  رفع البيانات
                </div>
              </button>
            </div>
          </div>
        )}
        {/* Settings Tab */}
        {ui.activeTab === "settings" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">إعدادات تحليل الملف</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">
                    الفاصل بين الحقول
                  </label>
                  <select
                    value={parsing.delimiter}
                    onChange={(e) =>
                      handleParserOptionChange("delimiter", e.target.value)
                    }
                    className={inputStyle}
                  >
                    <option value="comma">فاصلة (,)</option>
                    <option value="semicolon">فاصلة منقوطة (;)</option>
                    <option value="tab">مسافة جدولية (Tab)</option>
                    <option value="space">مسافة (Space)</option>
                    <option value="pipe">عمودي (|)</option>
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    الحرف المستخدم لفصل البيانات في كل صف
                  </p>
                </div>

                <div>
                  <label className="block font-medium mb-2">ترميز الملف</label>
                  <select
                    value={parsing.encoding}
                    onChange={(e) =>
                      handleParserOptionChange("encoding", e.target.value)
                    }
                    className={inputStyle}
                  >
                    <option value="utf-8">UTF-8 (يدعم العربية)</option>
                    <option value="ISO-8859-1">Latin-1 (ISO-8859-1)</option>
                    <option value="ISO-8859-6">Arabic (ISO-8859-6)</option>
                    <option value="windows-1256">Windows Arabic (1256)</option>
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    نظام ترميز الملف، استخدم UTF-8 للعربية والرموز المختلفة
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">
                    عدد الصفوف في المعاينة
                  </label>
                  <select
                    value={parsing.previewRows}
                    onChange={(e) =>
                      handleParserOptionChange(
                        "previewRows",
                        parseInt(e.target.value)
                      )
                    }
                    className={inputStyle}
                  >
                    <option value="5">5 صفوف</option>
                    <option value="10">10 صفوف</option>
                    <option value="15">15 صفوف</option>
                    <option value="20">20 صفوف</option>
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    عدد الصفوف التي سيتم عرضها في المعاينة
                  </p>
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    حجم الدفعة (Batch)
                  </label>
                  <select
                    value={parsing.batchSize}
                    onChange={(e) =>
                      handleParserOptionChange(
                        "batchSize",
                        parseInt(e.target.value)
                      )
                    }
                    className={inputStyle}
                  >
                    <option value="100">100 (للملفات الصغيرة)</option>
                    <option value="500">500 (متوسط)</option>
                    <option value="1000">1000 (افتراضي)</option>
                    <option value="2000">2000 (للملفات الكبيرة)</option>
                    <option value="5000">5000 (للملفات الكبيرة جداً)</option>
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    عدد الصفوف التي سيتم معالجتها في كل دفعة لتحسين الأداء
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={parsing.hasHeader}
                  onChange={(e) =>
                    handleParserOptionChange("hasHeader", e.target.checked)
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="mr-2">الصف الأول يحتوي على أسماء الحقول</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={parsing.skipEmptyLines}
                  onChange={(e) =>
                    handleParserOptionChange("skipEmptyLines", e.target.checked)
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="mr-2">تخطي الصفوف الفارغة</span>
              </label>
            </div>

            {/* Field mapping */}
            {data.fields.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">ربط الحقول (مخصص)</h4>
                  <button
                    onClick={toggleFieldMapping}
                    className={`text-sm ${
                      darkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {ui.showFieldMapping ? "إخفاء الربط" : "تخصيص الربط"}
                  </button>
                </div>

                {ui.showFieldMapping && (
                  <div
                    className={`p-4 rounded-lg ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <p
                      className={`mb-3 text-sm ${
                        darkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      يمكنك تغيير أسماء الحقول المستهدفة في قاعدة البيانات
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                      {data.fields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className={`text-sm font-medium ${
                              darkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {field.name} {getColumnTypeIndicator(index)}
                          </div>
                          <span className="mx-2">→</span>
                          <input
                            type="text"
                            value={
                              data.fieldMappings[index]?.targetField ||
                              field.name
                            }
                            onChange={(e) =>
                              updateFieldMapping(index, e.target.value)
                            }
                            className={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() =>
                  dispatch({
                    type: ACTION_TYPES.SET_ACTIVE_TAB,
                    payload: "upload",
                  })
                }
                className={buttonSecondaryStyle}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  العودة
                </div>
              </button>

              <button
                onClick={handleShowPreview}
                disabled={
                  !file.selected || !collection.selected || ui.isAnalyzing
                }
                className={buttonPrimaryStyle}
              >
                {ui.isAnalyzing ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin h-5 w-5 ml-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    جاري التحليل...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    معاينة البيانات
                  </div>
                )}
              </button>
              <button
                onClick={handleSubmitImport}
                disabled={ui.isUploading}
                className={buttonSuccessStyle}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"
                    />
                  </svg>
                  رفع البيانات
                </div>
              </button>
            </div>
          </div>
        )}
        {/* Upload Progress Tab */}
        {ui.activeTab === "progress" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">
              تقدم رفع ومعالجة البيانات
            </h3>

            <div className="flex items-center mb-6">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-10 w-10 mr-4 ${
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    المجموعة:{" "}
                    {(collection.list && collection.list.length > 0
                      ? collection.list.find(
                          (c) => c.collectionName === collection.selected
                        )?.displayName
                      : null) || collection.selected}
                  </div>
                </div>
              </div>
            </div>

            {/* File upload progress */}
            <div className="mb-6">
              <div className="flex justify-between mb-1">
                <span
                  className={`font-medium ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  رفع الملف
                </span>
                <span
                  className={`font-medium ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {progress.uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.uploadProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Network status indicator */}
            {network.status !== "online" && (
              <div
                className={`p-4 mb-6 rounded-lg ${
                  network.status === "reconnecting"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                <div className="flex items-center">
                  {network.status === "reconnecting" ? (
                    <svg
                      className="animate-spin h-5 w-5 ml-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                  <span>
                    {network.status === "reconnecting"
                      ? `جاري محاولة إعادة الاتصال... (محاولة ${
                          network.retryCount + 1
                        })`
                      : "انقطع الاتصال بالخادم. حاول مرة أخرى لاحقًا."}
                  </span>
                </div>
              </div>
            )}

            {/* Cancel button */}
            {ui.isUploading && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleCancelUpload}
                  className={buttonDangerStyle}
                >
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-1"
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
                    إلغاء الرفع
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
        {/* Results Tab */}
        {ui.activeTab === "results" &&
          progress.uploadStats &&
          progress.uploadStats.successCount > 0 && (
            <div className="space-y-6">
              <div className="flex items-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-8 w-8 mr-2 ${
                    darkMode ? "text-green-400" : "text-green-600"
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-xl font-medium">اكتملت عملية الرفع</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-lg ${
                    darkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <div
                    className={`text-sm mb-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    السجلات الناجحة
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      darkMode ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {progress.uploadStats.successCount}
                  </div>
                  <div
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    من أصل {progress.uploadStats.totalRows}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    darkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <div
                    className={`text-sm mb-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    السجلات الفاشلة
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      progress.uploadStats.failedCount > 0
                        ? darkMode
                          ? "text-red-400"
                          : "text-red-600"
                        : darkMode
                        ? "text-gray-400"
                        : "text-gray-600"
                    }`}
                  >
                    {progress.uploadStats.failedCount || 0}
                  </div>
                  <div
                    className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {!progress.uploadStats.failedCount ||
                    progress.uploadStats.failedCount === 0
                      ? "لا توجد أخطاء"
                      : "فشل في الإدخال"}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    darkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <div
                    className={`text-sm mb-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    وقت المعالجة
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {progress.uploadStats.processingTime
                      ? formatProcessingTime(
                          progress.uploadStats.processingTime
                        )
                      : calculateElapsedTime(progress.uploadStartTime)}
                  </div>
                  {progress.uploadStats.successCount > 0 &&
                    progress.uploadStats.processingTime && (
                      <div
                        className={`text-sm mt-1 ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {progress.uploadStats.processingTime > 0
                          ? `${(
                              progress.uploadStats.processingTime /
                              progress.uploadStats.successCount
                            ).toFixed(2)} مللي ثانية / سجل`
                          : "0 مللي ثانية / سجل"}
                      </div>
                    )}
                </div>
              </div>

              {/* Show errors if any */}
              {progress.uploadStats.failedCount > 0 &&
                progress.uploadStats.failedSamples &&
                progress.uploadStats.failedSamples.length > 0 && (
                  <div
                    className={`mt-6 p-4 rounded-lg ${
                      darkMode
                        ? "bg-red-900/20 border border-red-800"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <h4
                      className={`font-medium mb-3 ${
                        darkMode ? "text-red-400" : "text-red-600"
                      }`}
                    >
                      نماذج من الأخطاء (
                      {Math.min(
                        progress.uploadStats.failedSamples.length,
                        progress.uploadStats.failedCount
                      )}{" "}
                      من {progress.uploadStats.failedCount})
                    </h4>
                    <ul className="list-disc list-inside space-y-2">
                      {progress.uploadStats.failedSamples.map((sample, idx) => (
                        <li
                          key={idx}
                          className={darkMode ? "text-red-300" : "text-red-600"}
                        >
                          {sample.error || "خطأ غير معروف"}{" "}
                          {sample.row && `(صف ${sample.row})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Action buttons */}
              <div className="flex justify-between mt-6">
                <button onClick={handleReset} className={buttonPrimaryStyle}>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    بدء عملية جديدة
                  </div>
                </button>
              </div>
            </div>
          )}

        {ui.activeTab === "results" &&
          (!progress.uploadStats || progress.uploadStats.successCount <= 0) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg
                    className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <h3 className="text-xl font-medium mb-2">
                    جاري معالجة البيانات...
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    يرجى الانتظار حتى اكتمال المعالجة لعرض النتائج النهائية
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default CsvUpload;
