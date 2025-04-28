import React, { useReducer, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ApibaseUrl from "../../ApibaseUrl";

// Initial state for the reducer
const initialState = {
  ui: {
    activeTab: "upload",
    isDragging: false,
    showAdvancedOptions: false,
    isAnalyzing: false,
    isUploading: false,
    uploadComplete: false,
    expandedNodes: {}, // For JSON tree view
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
    encoding: "utf-8",
    previewDepth: 3, // How many levels of JSON to show by default
    previewItems: 5, // How many array items to show
    batchSize: 1000,
    rootPath: "", // Root path to start import from (optional)
  },
  data: {
    jsonData: null,
    jsonStats: null,
    jsonSchema: null,
    showPreview: false,
    previewError: "",
    pathMappings: {}, // For custom path mappings
  },
  progress: {
    uploadProgress: 0,
    totalItems: 0,
    processedItems: 0,
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
  SET_IS_ANALYZING: "SET_IS_ANALYZING",
  SET_IS_UPLOADING: "SET_IS_UPLOADING",
  SET_UPLOAD_COMPLETE: "SET_UPLOAD_COMPLETE",
  TOGGLE_EXPAND_NODE: "TOGGLE_EXPAND_NODE",

  SET_FILE: "SET_FILE",
  RESET_FILE: "RESET_FILE",

  SET_COLLECTIONS: "SET_COLLECTIONS",
  SET_COLLECTION_LOADING: "SET_COLLECTION_LOADING",
  SET_SELECTED_COLLECTION: "SET_SELECTED_COLLECTION",

  SET_PARSER_OPTION: "SET_PARSER_OPTION",

  SET_JSON_DATA: "SET_JSON_DATA",
  SET_JSON_STATS: "SET_JSON_STATS",
  SET_JSON_SCHEMA: "SET_JSON_SCHEMA",
  UPDATE_PATH_MAPPING: "UPDATE_PATH_MAPPING",
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
function jsonReducer(state, action) {
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
    case ACTION_TYPES.SET_IS_ANALYZING:
      return { ...state, ui: { ...state.ui, isAnalyzing: action.payload } };
    case ACTION_TYPES.SET_IS_UPLOADING:
      return { ...state, ui: { ...state.ui, isUploading: action.payload } };
    case ACTION_TYPES.SET_UPLOAD_COMPLETE:
      return { ...state, ui: { ...state.ui, uploadComplete: action.payload } };
    case ACTION_TYPES.TOGGLE_EXPAND_NODE:
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedNodes: {
            ...state.ui.expandedNodes,
            [action.payload]: !state.ui.expandedNodes[action.payload],
          },
        },
      };

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
          jsonData: null,
          jsonStats: null,
          jsonSchema: null,
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
          jsonData: null,
          jsonStats: null,
          jsonSchema: null,
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
    case ACTION_TYPES.SET_JSON_DATA:
      return { ...state, data: { ...state.data, jsonData: action.payload } };
    case ACTION_TYPES.SET_JSON_STATS:
      return { ...state, data: { ...state.data, jsonStats: action.payload } };
    case ACTION_TYPES.SET_JSON_SCHEMA:
      return { ...state, data: { ...state.data, jsonSchema: action.payload } };
    case ACTION_TYPES.UPDATE_PATH_MAPPING:
      return {
        ...state,
        data: {
          ...state.data,
          pathMappings: {
            ...state.data.pathMappings,
            [action.payload.sourcePath]: action.payload.targetPath,
          },
        },
      };
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
          lastUpdateTime: action.payload.lastUpdateTime || Date.now(),
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
          totalItems: 0,
          processedItems: 0,
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

// Main component
const JsonUpload = ({ darkMode, onSuccess }) => {
  const baseUrl = ApibaseUrl;

  // Use reducer for managing state
  const [state, dispatch] = useReducer(jsonReducer, initialState);

  // Destructure state for easier access
  const { ui, file, collection, parsing, data, progress, network } = state;

  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const abortControllerRef = useRef(null);
  const sseRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Clean up connections
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

  // Fetch collections
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

  // Function to analyze JSON structure with sampling for large objects/arrays
  const analyzeJSON = (
    json,
    maxDepth = 5,
    maxItems = 100,
    currentPath = ""
  ) => {
    try {
      if (!json) return { error: "No JSON data provided" };

      const stats = {
        totalObjects: 0,
        totalArrays: 0,
        totalValues: 0,
        arrayItems: 0,
        maxDepth: 0,
        nullValues: 0,
        objectPaths: new Set(),
        arrayPaths: new Set(),
        keyStats: {},
        rootType: null,
      };

      // For inferring schema
      const inferredSchema = {};

      // Process single value or object
      const processValue = (value, depth = 0, path = currentPath) => {
        stats.maxDepth = Math.max(stats.maxDepth, depth);

        if (value === null) {
          stats.nullValues++;
          return "null";
        }

        const type = Array.isArray(value) ? "array" : typeof value;

        if (depth === 0) {
          stats.rootType = type;
        }

        if (type === "object" && value !== null) {
          stats.totalObjects++;
          stats.objectPaths.add(path);

          const objectSchema = {};

          // Process each key in the object
          Object.keys(value).forEach((key) => {
            const keyPath = path ? `${path}.${key}` : key;

            // Update key stats
            if (!stats.keyStats[key]) {
              stats.keyStats[key] = { count: 0, types: {} };
            }
            stats.keyStats[key].count++;

            const valueType = processValue(value[key], depth + 1, keyPath);

            // Update types seen for this key
            if (!stats.keyStats[key].types[valueType]) {
              stats.keyStats[key].types[valueType] = 0;
            }
            stats.keyStats[key].types[valueType]++;

            // Update schema
            objectSchema[key] = valueType;
          });

          if (depth < maxDepth) {
            return { type: "object", properties: objectSchema };
          }
          return "object";
        } else if (type === "array") {
          stats.totalArrays++;
          stats.arrayPaths.add(path);

          const arrayLength = value.length;
          stats.arrayItems += arrayLength;

          // Sample array items for analysis
          const sampleSize = Math.min(arrayLength, maxItems);
          const step =
            arrayLength > sampleSize ? Math.floor(arrayLength / sampleSize) : 1;

          // For schema, analyze items to determine array item type
          const itemTypes = new Set();
          const arrayItemSchemas = [];

          for (let i = 0; i < arrayLength; i += step) {
            if (arrayItemSchemas.length >= sampleSize) break;

            const itemPath = `${path}[${i}]`;
            const itemSchema = processValue(value[i], depth + 1, itemPath);

            if (typeof itemSchema === "object") {
              arrayItemSchemas.push(itemSchema);
            } else {
              itemTypes.add(itemSchema);
            }
          }

          if (depth < maxDepth) {
            // If we have object schemas in the array, we attempt to merge them
            if (arrayItemSchemas.length > 0) {
              return {
                type: "array",
                items:
                  arrayItemSchemas.length === 1
                    ? arrayItemSchemas[0]
                    : { oneOf: arrayItemSchemas },
              };
            }
            // Otherwise just list the primitive types
            return {
              type: "array",
              items:
                itemTypes.size === 1
                  ? Array.from(itemTypes)[0]
                  : Array.from(itemTypes),
            };
          }

          return "array";
        } else {
          stats.totalValues++;
          return type;
        }
      };

      // Start processing from root
      const schema = processValue(json);

      // Convert sets to arrays for JSON serialization
      stats.objectPaths = Array.from(stats.objectPaths);
      stats.arrayPaths = Array.from(stats.arrayPaths);

      return {
        stats,
        schema,
      };
    } catch (error) {
      console.error("Error analyzing JSON:", error);
      return {
        error: error.message,
        stats: {
          totalObjects: 0,
          totalArrays: 0,
          totalValues: 0,
          nullValues: 0,
        },
      };
    }
  };

  // Handle file validation and selection
  const handleFileSelection = (file) => {
    // Reset states
    dispatch({ type: ACTION_TYPES.SET_PREVIEW_ERROR, payload: "" });
    dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: false });
    dispatch({ type: ACTION_TYPES.SET_JSON_STATS, payload: null });
    dispatch({ type: ACTION_TYPES.SET_JSON_SCHEMA, payload: null });
    dispatch({ type: ACTION_TYPES.SET_JSON_DATA, payload: null });

    // Check if it's a JSON file
    if (file && !file.type.includes("json") && !file.name.endsWith(".json")) {
      toast.error("يرجى اختيار ملف بصيغة JSON فقط.");
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

  // Reset function
  const handleReset = () => {
    // Clean up any connections first
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

  // JSON preview generator
  const generatePreview = useCallback(() => {
    if (!file.selected || !collection.selected) return;

    dispatch({ type: ACTION_TYPES.SET_PREVIEW_ERROR, payload: "" });
    dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: false });
    dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: true });
    dispatch({ type: ACTION_TYPES.SET_JSON_STATS, payload: null });
    dispatch({ type: ACTION_TYPES.SET_JSON_SCHEMA, payload: null });
    dispatch({ type: ACTION_TYPES.SET_JSON_DATA, payload: null });

    // Helper to safely parse JSON with fallback
    const safeJSONParse = (text) => {
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
    };

    // Process file for preview
    const processPreview = async () => {
      try {
        // For large files, only read the first chunk
        const isLargeFile = file.selected.size > 5 * 1024 * 1024; // 10MB
        let fileContent;

        if (isLargeFile) {
          // For large files, read just enough to get a sample
          const chunkSize = 500 * 1024; // 500KB
          const fileChunk = file.selected.slice(0, chunkSize);

          const reader = new FileReader();
          fileContent = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error("Error reading file"));
            reader.readAsText(fileChunk, parsing.encoding);
          });

          try {
            // Try to read as much valid JSON as possible
            const partialContent = fileContent.trim();

            // Look for array or object closing
            let endPos = -1;

            if (partialContent.startsWith("[")) {
              // Handle truncated array
              let depth = 0;
              for (let i = 0; i < partialContent.length; i++) {
                if (partialContent[i] === "[") depth++;
                else if (partialContent[i] === "]") {
                  depth--;
                  if (depth === 0) {
                    endPos = i + 1; // Include the closing bracket
                    break;
                  }
                }
              }
            } else if (partialContent.startsWith("{")) {
              // Handle truncated object
              let depth = 0;
              for (let i = 0; i < partialContent.length; i++) {
                if (partialContent[i] === "{") depth++;
                else if (partialContent[i] === "}") {
                  depth--;
                  if (depth === 0) {
                    endPos = i + 1; // Include the closing bracket
                    break;
                  }
                }
              }
            }

            // If we found a complete JSON structure, use it
            if (endPos > 0) {
              const validPart = partialContent.substring(0, endPos);
              const previewData = safeJSONParse(validPart);

              dispatch({
                type: ACTION_TYPES.SET_JSON_DATA,
                payload: previewData,
              });
              dispatch({
                type: ACTION_TYPES.SET_PREVIEW_ERROR,
                payload: "تنبيه: هذا ملف كبير، يتم عرض جزء منه فقط للمعاينة.",
              });

              // Analyze the JSON structure
              const analysis = analyzeJSON(
                previewData,
                parsing.previewDepth,
                parsing.previewItems
              );
              if (analysis.stats) {
                dispatch({
                  type: ACTION_TYPES.SET_JSON_STATS,
                  payload: analysis.stats,
                });
              }
              if (analysis.schema) {
                dispatch({
                  type: ACTION_TYPES.SET_JSON_SCHEMA,
                  payload: analysis.schema,
                });
              }

              // Update total items as an estimate
              const totalItemEstimate = isLargeFile
                ? Math.round(
                    (analysis.stats.totalObjects + analysis.stats.arrayItems) *
                      (file.selected.size / chunkSize)
                  )
                : analysis.stats.totalObjects + analysis.stats.arrayItems;

              dispatch({
                type: ACTION_TYPES.UPDATE_PROGRESS,
                payload: {
                  totalItems: totalItemEstimate,
                },
              });

              dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: true });
            } else {
              throw new Error(
                "Couldn't find a complete JSON structure in the sample"
              );
            }
          } catch (error) {
            // Fall back to showing it as text with a warning
            dispatch({
              type: ACTION_TYPES.SET_PREVIEW_ERROR,
              payload: `تنبيه: هذا ملف كبير جداً (${file.size}). لم يتم تحليله بالكامل. ${error.message}`,
            });

            // Show the raw text as a sample
            const previewText = fileContent.substring(0, 5000) + "...";
            dispatch({
              type: ACTION_TYPES.SET_JSON_DATA,
              payload: previewText,
            });
            dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: true });
          }
        } else {
          // For normal-sized files, read the whole file
          const reader = new FileReader();
          fileContent = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error("Error reading file"));
            reader.readAsText(file.selected, parsing.encoding);
          });

          // Parse JSON data
          const jsonData = safeJSONParse(fileContent);

          // Analyze the JSON structure
          const analysis = analyzeJSON(
            jsonData,
            parsing.previewDepth,
            parsing.previewItems
          );

          dispatch({ type: ACTION_TYPES.SET_JSON_DATA, payload: jsonData });

          if (analysis.stats) {
            dispatch({
              type: ACTION_TYPES.SET_JSON_STATS,
              payload: analysis.stats,
            });

            // Update total items
            dispatch({
              type: ACTION_TYPES.UPDATE_PROGRESS,
              payload: {
                totalItems:
                  analysis.stats.totalObjects + analysis.stats.arrayItems,
              },
            });
          }

          if (analysis.schema) {
            dispatch({
              type: ACTION_TYPES.SET_JSON_SCHEMA,
              payload: analysis.schema,
            });
          }

          if (analysis.error) {
            dispatch({
              type: ACTION_TYPES.SET_PREVIEW_ERROR,
              payload: `تنبيه في تحليل JSON: ${analysis.error}`,
            });
          }

          dispatch({ type: ACTION_TYPES.SET_SHOW_PREVIEW, payload: true });
        }

        dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "preview" });
      } catch (error) {
        console.error("Error processing JSON:", error);
        dispatch({
          type: ACTION_TYPES.SET_PREVIEW_ERROR,
          payload: `فشل في تحليل ملف JSON: ${error.message}`,
        });
      } finally {
        dispatch({ type: ACTION_TYPES.SET_IS_ANALYZING, payload: false });
      }
    };

    processPreview();
  }, [
    file.selected,
    collection.selected,
    parsing.encoding,
    parsing.previewDepth,
    parsing.previewItems,
  ]);

  // Handle preview button click
  const handleShowPreview = (event) => {
    if (event) event.preventDefault();

    if (!file.selected) {
      toast.error("يرجى اختيار ملف JSON.");
      return;
    }
    if (!collection.selected) {
      toast.error("يرجى اختيار مجموعة.");
      return;
    }

    generatePreview();
  };

  // Enhanced cancel upload function
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
      toast.error("يرجى اختيار ملف JSON ومجموعة.");
      return;
    }

    // Automatically adjust batch size based on file size
    if (file.selected.size > 50 * 1024 * 1024) {
      // > 50MB
      handleParserOptionChange("batchSize", 500);
    } else if (file.selected.size > 10 * 1024 * 1024) {
      // > 10MB
      handleParserOptionChange("batchSize", 1000);
    } else if (file.selected.size > 1 * 1024 * 1024) {
      // > 1MB
      handleParserOptionChange("batchSize", 2000);
    }

    // Proceed directly to upload
    handleSubmitImport();
  };

  // Improved submit import function
  const handleSubmitImport = async () => {
    if (!file.selected || !collection.selected) {
      toast.error("يرجى اختيار ملف JSON ومجموعة.");
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
        lastUpdateTime: Date.now(), // Track last update time for heartbeat
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

      // Open SSE channel for real-time progress BEFORE making the POST request
      // Store the cleanup function if returned
      const sseCleanup = openSSEChannel(collection.selected);

      // Prepare form data
      const formData = new FormData();
      formData.append("jsonFile", file.selected);
      formData.append("encoding", parsing.encoding);
      formData.append("batchSize", parsing.batchSize.toString());

      // Add root path if specified
      if (parsing.rootPath) {
        formData.append("rootPath", parsing.rootPath);
      }

      // Add path mappings if we have them
      if (Object.keys(data.pathMappings).length > 0) {
        formData.append("pathMappings", JSON.stringify(data.pathMappings));
      }

      console.log("Starting upload with formData", {
        collection: collection.selected,
        encoding: parsing.encoding,
        rootPath: parsing.rootPath || "Not specified",
      });

      // Perform the upload with the abort controller's signal
      const response = await axios.post(
        `${baseUrl}/upload-json/${collection.selected}`,
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
                payload: {
                  uploadProgress: percent,
                  lastUpdateTime: Date.now(),
                },
              });
            }
          },
          timeout: 0, // No timeout for large uploads
          signal: abortControllerRef.current.signal,
        }
      );

      // When the server accepts the file, don't switch to results tab yet
      if (response.status === 200 || response.status === 202) {
        console.log("Upload response:", response.data);
        toast.info("تم قبول الملف وبدأت المعالجة. يرجى الانتظار...");
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
        console.error("JSON upload error:", err);

        // Network error handling with retry
        if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "offline",
          });
          toast.error("انقطع الاتصال بالخادم. سنحاول إعادة الاتصال تلقائيًا.");
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
            toast.error(`فشل في استيراد ملف JSON: ${errorMessage}`);
          }

          dispatch({
            type: ACTION_TYPES.SET_PREVIEW_ERROR,
            payload: `خطأ: ${errorMessage}`,
          });
        } else {
          toast.error(`حدث خطأ أثناء استيراد ملف JSON: ${err.message}`);
        }

        dispatch({
          type: ACTION_TYPES.SET_NETWORK_ERROR,
          payload: err.message,
        });
      }
    } finally {
      // We don't set isUploading false here if we still have an active SSE connection
      if (!sseRef.current) {
        dispatch({ type: ACTION_TYPES.SET_IS_UPLOADING, payload: false });
      }
    }
  };

  // Improved SSE handling in the openSSEChannel function
  const openSSEChannel = (collectionName) => {
    try {
      const sseUrl = `${baseUrl}/upload-json/progress/${collectionName}`;
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
        dispatch({ type: ACTION_TYPES.INCREMENT_RETRY, payload: 0 }); // Reset retry count
      };

      // Handle incoming messages
      sseRef.current.onmessage = (event) => {
        try {
          console.log("SSE message received:", event.data);
          const data = JSON.parse(event.data);

          // Extract values with fallbacks
          const processedItems =
            typeof data.processedItems === "number" ? data.processedItems : 0;
          const totalItems =
            typeof data.totalItems === "number"
              ? data.totalItems
              : progress.totalItems || 0;
          const done = Boolean(data.done);

          // Update processed items and total items
          dispatch({
            type: ACTION_TYPES.UPDATE_PROGRESS,
            payload: {
              processedItems: processedItems,
              totalItems: totalItems,
            },
          });

          // Reset reconnection state if we're getting messages
          if (network.status === "reconnecting") {
            dispatch({
              type: ACTION_TYPES.SET_NETWORK_STATUS,
              payload: "online",
            });
            dispatch({ type: ACTION_TYPES.INCREMENT_RETRY, payload: 0 });
          }

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
            const successCount = data.totalInserted || processedItems || 0;
            const failedCount = data.totalFailed || 0;

            if (
              data.totalInserted !== undefined ||
              data.totalFailed !== undefined
            ) {
              dispatch({
                type: ACTION_TYPES.SET_UPLOAD_STATS,
                payload: {
                  successCount: successCount,
                  failedCount: failedCount,
                  totalItems: totalItems || successCount + failedCount,
                  timestamp: new Date().toISOString(),
                  processingTime:
                    data.processingTime ||
                    Date.now() - progress.uploadStartTime,
                  failedSamples: data.failedSamples || [],
                },
              });
            }

            // Switch to results tab when processing is complete
            dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: "results" });

            // Call the onSuccess callback if provided
            if (onSuccess) {
              onSuccess({
                fileName: file.selected?.name ?? "",
                collectionName: collection.selected,
                recordCount: successCount,
              });
            }
          }
        } catch (parseErr) {
          console.error("Failed to parse SSE event:", parseErr, event.data);
        }
      };

      // Handle errors with improved reconnection logic
      sseRef.current.onerror = (err) => {
        console.error("SSE error:", err);

        // If we're currently uploading, show reconnecting status
        if (ui.isUploading) {
          // Instead of incrementing retry counter immediately, set reconnecting state
          dispatch({
            type: ACTION_TYPES.SET_NETWORK_STATUS,
            payload: "reconnecting",
          });

          // Clear any existing retry timeout
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }

          // Set a retry timer with exponential backoff
          const retryDelay = Math.min(
            1000 * Math.pow(1.5, network.retryCount),
            10000
          );
          console.log(`Scheduling reconnection attempt in ${retryDelay}ms`);

          retryTimerRef.current = setTimeout(() => {
            // Increment retry counter just before attempting reconnection
            dispatch({ type: ACTION_TYPES.INCREMENT_RETRY });

            // Check max retry count
            if (network.retryCount < 5) {
              console.log(`Manual reconnect attempt ${network.retryCount + 1}`);

              // Close existing connection before reopening
              if (sseRef.current) {
                sseRef.current.close();
                sseRef.current = null;
              }

              // Attempt reconnection
              openSSEChannel(collectionName);
            } else {
              // Too many retries, give up but don't automatically close
              // Let user decide to retry or cancel
              dispatch({
                type: ACTION_TYPES.SET_NETWORK_STATUS,
                payload: "offline",
              });

              toast.error(
                "فشل الاتصال بالخادم بعد عدة محاولات. يمكنك المحاولة مرة أخرى أو إلغاء العملية."
              );

              // Add a manual retry button instead of auto-closing
              // This is handled in the UI render
            }
          }, retryDelay);
        } else {
          // If we're not uploading anymore, clean up silently
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
        }
      };

      // Set a heartbeat check for connection health
      const heartbeatInterval = setInterval(() => {
        // If SSE is open but we're not getting updates for a while
        if (sseRef.current && ui.isUploading) {
          const lastUpdateTime =
            progress.lastUpdateTime || progress.uploadStartTime;
          const timeSinceUpdate = Date.now() - lastUpdateTime;

          // If no update for 30 seconds while uploading, trigger reconnect
          if (timeSinceUpdate > 30000) {
            console.log("No SSE updates received for 30 seconds, reconnecting");

            // Close current connection
            if (sseRef.current) {
              sseRef.current.close();
              sseRef.current = null;
            }

            // Reset retry count to give full retry attempts
            if (network.retryCount >= 5) {
              dispatch({ type: ACTION_TYPES.INCREMENT_RETRY, payload: 0 });
            }

            // Open new connection
            openSSEChannel(collectionName);
          }
        }
      }, 10000); // Check every 10 seconds

      // Return cleanup function
      return () => {
        clearInterval(heartbeatInterval);
      };
    } catch (err) {
      console.error("Error setting up SSE:", err);
      toast.error("حدث خطأ في إعداد اتصال المراقبة: " + err.message);
    }
  };

  // Toggle node expansion in the JSON tree view
  const toggleNodeExpansion = (nodePath) => {
    dispatch({
      type: ACTION_TYPES.TOGGLE_EXPAND_NODE,
      payload: nodePath,
    });
  };

  // Render JSON value based on type
  const renderJsonValue = (value, path = "", depth = 0) => {
    if (value === null) return <span className="text-gray-400">null</span>;

    const type = Array.isArray(value) ? "array" : typeof value;

    // Don't go too deep
    if (depth > parsing.previewDepth) {
      if (type === "object") {
        return (
          <span className="text-gray-400">
            {Array.isArray(value) ? "[...]" : "{...}"}
          </span>
        );
      }
    }

    switch (type) {
      case "string":
        return (
          <span className="text-green-600 dark:text-green-400">"{value}"</span>
        );
      case "number":
        return (
          <span className="text-blue-600 dark:text-blue-400">{value}</span>
        );
      case "boolean":
        return (
          <span className="text-purple-600 dark:text-purple-400">
            {value.toString()}
          </span>
        );
      case "object":
        if (Array.isArray(value)) {
          const isExpanded = ui.expandedNodes[path];
          const arrayLength = value.length;

          if (arrayLength === 0) {
            return <span className="text-gray-600 dark:text-gray-400">[]</span>;
          }

          return (
            <div>
              <div
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(path);
                }}
              >
                {isExpanded ? "▼" : "▶"}{" "}
                <span className="text-gray-600 dark:text-gray-400">
                  Array ({arrayLength} {arrayLength === 1 ? "item" : "items"})
                </span>
              </div>

              {isExpanded && (
                <div className="mr-4 border-r border-gray-300 dark:border-gray-600 pr-2">
                  {value.slice(0, parsing.previewItems).map((item, index) => (
                    <div key={index} className="mt-1">
                      <span className="text-gray-500 dark:text-gray-400">
                        {index}:{" "}
                      </span>
                      {renderJsonValue(item, `${path}[${index}]`, depth + 1)}
                    </div>
                  ))}
                  {arrayLength > parsing.previewItems && (
                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                      ...{arrayLength - parsing.previewItems} more items
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        } else {
          const isExpanded = ui.expandedNodes[path];
          const keys = Object.keys(value);

          if (keys.length === 0) {
            return (
              <span className="text-gray-600 dark:text-gray-400">{"{}"}</span>
            );
          }

          return (
            <div>
              <div
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(path);
                }}
              >
                {isExpanded ? "▼" : "▶"}{" "}
                <span className="text-gray-600 dark:text-gray-400">
                  Object ({keys.length}{" "}
                  {keys.length === 1 ? "property" : "properties"})
                </span>
              </div>

              {isExpanded && (
                <div className="mr-4 border-r border-gray-300 dark:border-gray-600 pr-2">
                  {keys.map((key) => (
                    <div key={key} className="mt-1">
                      <span className="text-gray-800 dark:text-gray-200 font-medium">
                        {key}:{" "}
                      </span>
                      {renderJsonValue(
                        value[key],
                        path ? `${path}.${key}` : key,
                        depth + 1
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
      default:
        return (
          <span className="text-gray-600 dark:text-gray-400">
            {String(value)}
          </span>
        );
    }
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
            <h2 className="text-xl font-bold">رفع ملف JSON</h2>
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
              إعدادات الاستيراد
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

                  <select
                    value={parsing.previewItems}
                    onChange={(e) =>
                      handleParserOptionChange(
                        "previewItems",
                        parseInt(e.target.value)
                      )
                    }
                    className={inputStyle}
                  >
                    <option value="5">5 عناصر للمعاينة</option>
                    <option value="10">10 عناصر للمعاينة</option>
                    <option value="20">20 عنصر للمعاينة</option>
                    <option value="50">50 عنصر للمعاينة</option>
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
                  accept=".json,application/json"
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
                      اسحب وأفلت ملف JSON هنا
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

        {/* Settings Tab */}
        {ui.activeTab === "settings" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">إعدادات استيراد JSON</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
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

                <div>
                  <label className="block font-medium mb-2">
                    المسار الجذر (اختياري)
                  </label>
                  <input
                    type="text"
                    value={parsing.rootPath}
                    onChange={(e) =>
                      handleParserOptionChange("rootPath", e.target.value)
                    }
                    placeholder="مثال: data.items"
                    className={inputStyle}
                  />
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    إذا كنت تريد استيراد جزء معين من ملف JSON، حدد المسار إليه
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">حجم الدفعة</label>
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
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    عدد العناصر التي سيتم معالجتها في كل دفعة لتحسين الأداء
                  </p>
                </div>

                <div>
                  <label className="block font-medium mb-2">عمق المعاينة</label>
                  <select
                    value={parsing.previewDepth}
                    onChange={(e) =>
                      handleParserOptionChange(
                        "previewDepth",
                        parseInt(e.target.value)
                      )
                    }
                    className={inputStyle}
                  >
                    <option value="1">1 (سطحي)</option>
                    <option value="2">2 (قليل)</option>
                    <option value="3">3 (متوسط)</option>
                    <option value="5">5 (عميق)</option>
                    <option value="10">10 (عميق جداً)</option>
                  </select>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    عدد المستويات التي سيتم عرضها في شجرة JSON
                  </p>
                </div>
              </div>
            </div>

            {/* Path Mapping Section - More advanced feature */}
            {data.jsonSchema && data.jsonStats && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">
                    تخطيط المسارات (للمستخدمين المتقدمين)
                  </h4>
                  <button
                    onClick={() =>
                      dispatch({ type: ACTION_TYPES.TOGGLE_ADVANCED_OPTIONS })
                    }
                    className={`text-sm ${
                      darkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    {ui.showAdvancedOptions
                      ? "إخفاء الخيارات المتقدمة"
                      : "إظهار الخيارات المتقدمة"}
                  </button>
                </div>

                {ui.showAdvancedOptions && (
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
                      يمكنك تحديد كيف سيتم تخزين مسارات JSON في قاعدة البيانات
                    </p>

                    <div className="max-h-64 overflow-y-auto">
                      {/* Show object paths from data.jsonStats.objectPaths */}
                      {data.jsonStats.objectPaths &&
                        data.jsonStats.objectPaths.length > 0 && (
                          <div className="space-y-2">
                            {data.jsonStats.objectPaths
                              .slice(0, 10)
                              .map((path, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className={`text-sm font-medium ${
                                      darkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {path || "root"}
                                  </div>
                                  <span className="mx-2">→</span>
                                  <input
                                    type="text"
                                    value={data.pathMappings[path] || path}
                                    onChange={(e) =>
                                      dispatch({
                                        type: ACTION_TYPES.UPDATE_PATH_MAPPING,
                                        payload: {
                                          sourcePath: path,
                                          targetPath: e.target.value,
                                        },
                                      })
                                    }
                                    className={inputStyle}
                                    placeholder="مسار الحقل الهدف"
                                  />
                                </div>
                              ))}

                            {data.jsonStats.objectPaths.length > 10 && (
                              <p
                                className={`text-sm ${
                                  darkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                ... وأكثر من ذلك (
                                {data.jsonStats.objectPaths.length - 10} مسارات
                                أخرى)
                              </p>
                            )}
                          </div>
                        )}
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

              <div className="space-x-2 rtl:space-x-reverse">
                <button
                  onClick={handleShowPreview}
                  disabled={
                    !file.selected || !collection.selected || ui.isAnalyzing
                  }
                  className={buttonPrimaryStyle}
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
                  onClick={handleSubmitImport}
                  disabled={
                    !file.selected || !collection.selected || ui.isUploading
                  }
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
          </div>
        )}

        {/* JSON Preview Tab */}
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

            {/* JSON Stats */}
            {data.jsonStats && (
              <div
                className={`p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <h3 className="text-lg font-medium mb-4">معلومات البيانات</h3>
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
                      النوع الأساسي
                    </div>
                    <div className="text-xl font-bold capitalize">
                      {data.jsonStats.rootType || "غير معروف"}
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
                      عدد الكائنات
                    </div>
                    <div className="text-xl font-bold">
                      {data.jsonStats.totalObjects}
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
                      عدد المصفوفات
                    </div>
                    <div className="text-xl font-bold">
                      {data.jsonStats.totalArrays}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      عدد العناصر: {data.jsonStats.arrayItems}
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
                      أقصى عمق للهيكل
                    </div>
                    <div className="text-xl font-bold">
                      {data.jsonStats.maxDepth}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* JSON Data Preview */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">معاينة البيانات</h3>
                <div className="space-x-2 rtl:space-x-reverse">
                  <select
                    value={parsing.previewDepth}
                    onChange={(e) =>
                      handleParserOptionChange(
                        "previewDepth",
                        parseInt(e.target.value)
                      )
                    }
                    className={`text-sm px-2 py-1 rounded ${
                      darkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <option value="1">عمق 1</option>
                    <option value="2">عمق 2</option>
                    <option value="3">عمق 3</option>
                    <option value="5">عمق 5</option>
                    <option value="10">عمق 10</option>
                  </select>
                </div>
              </div>

              {/* JSON Tree View */}
              <div
                className={`p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm ${
                  darkMode
                    ? "bg-gray-900 text-gray-200"
                    : "bg-gray-50 text-gray-800"
                }`}
              >
                {typeof data.jsonData === "string" ? (
                  // Show as text if we couldn't parse properly
                  <pre>{data.jsonData}</pre>
                ) : (
                  // Show as interactive tree
                  renderJsonValue(data.jsonData)
                )}
              </div>

              {/* JSON Schema Preview (simplified) */}
              {data.jsonSchema && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">هيكل البيانات</h3>
                  </div>
                  <div
                    className={`p-4 rounded-lg overflow-auto max-h-72 font-mono text-sm ${
                      darkMode
                        ? "bg-gray-800 text-gray-200"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <pre
                      className={`${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {JSON.stringify(data.jsonSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

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
                onClick={handleSubmitImport}
                disabled={
                  !file.selected || !collection.selected || ui.isUploading
                }
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

            {/* Processing progress */}
            {progress.processedItems > 0 && (
              <div className="mb-6">
                <div className="flex justify-between mb-1">
                  <span
                    className={`font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    معالجة البيانات
                  </span>
                  <span
                    className={`font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {progress.totalItems > 0
                      ? `${Math.round(
                          (progress.processedItems / progress.totalItems) * 100
                        )}%`
                      : "جارٍ التحميل..."}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: progress.totalItems
                        ? `${Math.min(
                            100,
                            (progress.processedItems / progress.totalItems) *
                              100
                          )}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <div
                  className={`mt-1 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {progress.processedItems} من {progress.totalItems} عنصر
                </div>
              </div>
            )}

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

            {/* Time information */}
            {progress.uploadStartTime && (
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    وقت البدء:
                  </span>{" "}
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    {new Date(progress.uploadStartTime).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    الوقت المنقضي:
                  </span>{" "}
                  <span
                    className={darkMode ? "text-gray-400" : "text-gray-600"}
                  >
                    {calculateElapsedTime(progress.uploadStartTime)}
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
                    الكائنات الناجحة
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
                    من أصل {progress.uploadStats.totalItems}
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
                    العناصر الفاشلة
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
                          {sample.path && `(مسار: ${sample.path})`}
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

export default JsonUpload;

// // ====================================================================================================

// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import "./JsonUpload.css";

// const JsonUpload = () => {
//   // Form state
//   const [file, setFile] = useState(null);
//   const [collectionName, setCollectionName] = useState("");
//   const [rootPath, setRootPath] = useState("");
//   const [encoding, setEncoding] = useState("utf-8");
//   const [batchSize, setBatchSize] = useState(1000);
//   const [pathMappings, setPathMappings] = useState("");

//   // Upload state
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadError, setUploadError] = useState("");
//   const [uploadSuccess, setUploadSuccess] = useState(false);

//   // Progress state
//   const [progress, setProgress] = useState(null);
//   const [showDetails, setShowDetails] = useState(false);

//   // Track SSE connection
//   const eventSourceRef = useRef(null);

//   // Clean up the EventSource on unmount
//   useEffect(() => {
//     return () => {
//       if (eventSourceRef.current) {
//         eventSourceRef.current.close();
//       }
//     };
//   }, []);

//   // Format time in a human-readable format
//   const formatTime = (milliseconds) => {
//     if (!milliseconds) return "0s";

//     const seconds = Math.floor(milliseconds / 1000);
//     if (seconds < 60) return `${seconds}s`;

//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes}m ${remainingSeconds}s`;
//   };

//   // Handle file selection
//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     if (
//       selectedFile &&
//       (selectedFile.type === "application/json" ||
//         selectedFile.name.toLowerCase().endsWith(".json"))
//     ) {
//       setFile(selectedFile);
//       setUploadError("");
//     } else {
//       setFile(null);
//       setUploadError("Please select a valid JSON file");
//     }
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!file) {
//       setUploadError("Please select a file to upload");
//       return;
//     }

//     if (!collectionName || !/^[a-zA-Z0-9_]+$/.test(collectionName)) {
//       setUploadError(
//         "Please provide a valid collection name (letters, numbers, and underscores only)"
//       );
//       return;
//     }

//     // Validate path mappings if provided
//     if (pathMappings) {
//       try {
//         JSON.parse(pathMappings);
//       } catch (err) {
//         setUploadError("Path mappings must be valid JSON");
//         return;
//       }
//     }

//     setIsUploading(true);
//     setUploadError("");
//     setUploadSuccess(false);
//     setProgress(null);

//     // Create form data
//     const formData = new FormData();
//     formData.append("jsonFile", file);
//     formData.append("encoding", encoding);
//     formData.append("rootPath", rootPath);
//     formData.append("batchSize", batchSize);

//     if (pathMappings) {
//       formData.append("pathMappings", pathMappings);
//     }

//     try {
//       // Start the upload
//       const response = await axios.post(
//         `http://localhost:5000/api/upload-json/${collectionName}`,
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         }
//       );

//       // If successful, start monitoring progress
//       if (response.data.statusEndpoint) {
//         startProgressMonitoring(collectionName);
//       }
//     } catch (error) {
//       setIsUploading(false);
//       setUploadError(error.response?.data?.message || "Failed to upload file");
//     }
//   };

//   // Monitor upload progress using Server-Sent Events
//   const startProgressMonitoring = (collection) => {
//     // Close any existing connection
//     if (eventSourceRef.current) {
//       eventSourceRef.current.close();
//     }

//     // Create new EventSource connection
//     const eventSource = new EventSource(
//       `/api/upload-json/progress/${collection}`
//     );
//     eventSourceRef.current = eventSource;

//     eventSource.onmessage = (event) => {
//       const progressData = JSON.parse(event.data);
//       setProgress(progressData);

//       // When processing is complete
//       if (progressData.done) {
//         setIsUploading(false);
//         eventSource.close();

//         if (progressData.error) {
//           setUploadError(progressData.error);
//         } else {
//           setUploadSuccess(true);
//         }
//       }
//     };

//     eventSource.onerror = () => {
//       setIsUploading(false);
//       setUploadError("Lost connection to server");
//       eventSource.close();
//     };
//   };

//   // Cancel the upload process
//   const handleCancel = () => {
//     if (eventSourceRef.current) {
//       eventSourceRef.current.close();
//     }
//     setIsUploading(false);
//   };

//   // Reset the form
//   const handleReset = () => {
//     setFile(null);
//     setCollectionName("");
//     setRootPath("");
//     setEncoding("utf-8");
//     setBatchSize(1000);
//     setPathMappings("");
//     setUploadError("");
//     setUploadSuccess(false);
//     setProgress(null);
//     setIsUploading(false);

//     // Reset file input
//     const fileInput = document.querySelector('input[type="file"]');
//     if (fileInput) fileInput.value = "";
//   };

//   return (
//     <div className="json-upload-container">
//       <h2>Upload JSON to MongoDB Collection</h2>

//       {/* Form */}
//       <form onSubmit={handleSubmit} className="upload-form">
//         <div className="form-group">
//           <label htmlFor="collection">Collection Name *</label>
//           <input
//             type="text"
//             id="collection"
//             value={collectionName}
//             onChange={(e) => setCollectionName(e.target.value)}
//             disabled={isUploading}
//             placeholder="e.g. users, products, etc."
//             required
//           />
//           <small>Letters, numbers, and underscores only</small>
//         </div>

//         <div className="form-group">
//           <label htmlFor="file">JSON File *</label>
//           <input
//             type="file"
//             id="file"
//             onChange={handleFileChange}
//             disabled={isUploading}
//             accept=".json,application/json"
//             required
//           />
//           {file && (
//             <div className="file-info">
//               Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}{" "}
//               MB)
//             </div>
//           )}
//         </div>

//         <div className="form-section">
//           <h3>Advanced Options</h3>
//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="rootPath">Root Path</label>
//               <input
//                 type="text"
//                 id="rootPath"
//                 value={rootPath}
//                 onChange={(e) => setRootPath(e.target.value)}
//                 disabled={isUploading}
//                 placeholder="e.g. data.items"
//               />
//               <small>Dot notation to target nested data</small>
//             </div>

//             <div className="form-group">
//               <label htmlFor="encoding">Encoding</label>
//               <select
//                 id="encoding"
//                 value={encoding}
//                 onChange={(e) => setEncoding(e.target.value)}
//                 disabled={isUploading}
//               >
//                 <option value="utf-8">UTF-8</option>
//                 <option value="ascii">ASCII</option>
//                 <option value="utf16le">UTF-16</option>
//               </select>
//             </div>
//           </div>

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="batchSize">Batch Size</label>
//               <input
//                 type="number"
//                 id="batchSize"
//                 value={batchSize}
//                 onChange={(e) => setBatchSize(parseInt(e.target.value) || 1000)}
//                 min="1"
//                 max="10000"
//                 disabled={isUploading}
//               />
//               <small>Documents per batch (1-10000)</small>
//             </div>
//           </div>

//           <div className="form-group">
//             <label htmlFor="pathMappings">Path Mappings (JSON)</label>
//             <textarea
//               id="pathMappings"
//               value={pathMappings}
//               onChange={(e) => setPathMappings(e.target.value)}
//               disabled={isUploading}
//               placeholder='{"sourceField": "targetField", "nested.field": "new.path"}'
//               rows="3"
//             ></textarea>
//             <small>JSON object mapping source paths to target paths</small>
//           </div>
//         </div>

//         <div className="form-actions">
//           <button
//             type="submit"
//             className="btn-primary"
//             disabled={isUploading || !file}
//           >
//             {isUploading ? "Uploading..." : "Upload JSON"}
//           </button>

//           {isUploading && (
//             <button
//               type="button"
//               className="btn-secondary"
//               onClick={handleCancel}
//             >
//               Cancel
//             </button>
//           )}

//           <button
//             type="button"
//             className="btn-secondary"
//             onClick={handleReset}
//             disabled={isUploading}
//           >
//             Reset Form
//           </button>
//         </div>
//       </form>

//       {/* Error Message */}
//       {uploadError && (
//         <div className="error-message">
//           <p>
//             <strong>Error:</strong> {uploadError}
//           </p>
//         </div>
//       )}

//       {/* Success Message */}
//       {uploadSuccess && (
//         <div className="success-message">
//           <p>
//             <strong>Success!</strong> JSON data has been uploaded to collection
//             "{collectionName}".
//           </p>
//           <p>
//             Processed {progress?.totalItems.toLocaleString()} items (
//             {progress?.totalInserted?.toLocaleString() || 0} inserted,
//             {progress?.totalFailed?.toLocaleString() || 0} failed) in{" "}
//             {formatTime(progress?.processingTime)}.
//           </p>
//         </div>
//       )}

//       {/* Progress Indicator */}
//       {progress && (
//         <div className="progress-section">
//           <div className="progress-header">
//             <h3>Upload Progress</h3>
//             <button
//               className="btn-link"
//               onClick={() => setShowDetails(!showDetails)}
//             >
//               {showDetails ? "Hide Details" : "Show Details"}
//             </button>
//           </div>

//           <div className="progress-bar-container">
//             <div
//               className="progress-bar"
//               style={{ width: `${progress.progressPercent}%` }}
//             ></div>
//             <div className="progress-text">
//               {progress.progressPercent}% Complete
//             </div>
//           </div>

//           <div className="progress-stats">
//             <div>Time: {formatTime(progress.processingTime)}</div>
//             <div>
//               {progress.processedItems.toLocaleString()} /{" "}
//               {progress.totalItems.toLocaleString()} items
//             </div>
//           </div>

//           {showDetails && (
//             <div className="progress-details">
//               <p>
//                 <strong>Processing Details:</strong>
//               </p>
//               <ul>
//                 <li>
//                   Inserted:{" "}
//                   {progress.totalInserted?.toLocaleString() || "Calculating..."}
//                 </li>
//                 <li>Failed: {progress.totalFailed?.toLocaleString() || "0"}</li>
//                 <li>
//                   Processing rate:{" "}
//                   {progress.processingTime > 0
//                     ? Math.round(
//                         progress.processedItems /
//                           (progress.processingTime / 1000)
//                       ).toLocaleString()
//                     : "0"}{" "}
//                   items/second
//                 </li>
//               </ul>

//               {progress.failedSamples && progress.failedSamples.length > 0 && (
//                 <div className="failed-samples">
//                   <p>
//                     <strong>Sample Error Details:</strong>
//                   </p>
//                   <ul>
//                     {progress.failedSamples.map((sample, index) => (
//                       <li key={index}>
//                         Path: {sample.path} - Error: {sample.error}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default JsonUpload;
