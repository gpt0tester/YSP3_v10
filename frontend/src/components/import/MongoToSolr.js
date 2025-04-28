import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ApibaseUrl from "../../ApibaseUrl";

const MongoToSolr = ({ darkMode }) => {
  const baseUrl = ApibaseUrl;

  const [loading, setLoading] = useState(false);
  const [pgHierarchy, setPgHierarchy] = useState([]); // Original hierarchical PG data
  const [selectedPGId, setSelectedPGId] = useState(null); // Currently selected PG ID
  const [selectedProcessors, setSelectedProcessors] = useState([]); // Selected processor IDs
  const [message, setMessage] = useState("");
  const [logsModal, setLogsModal] = useState({ isOpen: false, logs: null }); // Logs modal state
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    action: null,
    pgId: null,
  }); // Confirmation modal state
  const [filterPGs, setFilterPGs] = useState(""); // Filter for PGs
  const [showOnlyCollectionPGs, setShowOnlyCollectionPGs] = useState(true); // Show only PG_ prefixed groups by default
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // Show advanced options toggle

  // Custom success and error toast
  const showToast = (type, text, duration = 3000) => {
    setMessage(text);

    // Auto-clear message after duration
    setTimeout(() => {
      setMessage("");
    }, duration);
  };

  // 11) Check if a process group has any running processors
  const hasRunningProcessors = (pg) => {
    return pg.processors?.some((p) => p.state === "RUNNING") || false;
  };

  // 1) Fetch all PGs and processors
  const handleGetHierarchy = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }
      const response = await axios.get(`${baseUrl}/nifi/pg/hierarchy`);
      setPgHierarchy(response.data); // Full hierarchy
      showToast("success", "تم جلب تسلسل مجموعات العمليات بنجاح.");
      setSelectedProcessors([]);
    } catch (error) {
      console.error(error);
      showToast("error", "حدث خطأ أثناء جلب التسلسل.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // 2) On mount: fetch PG hierarchy
  useEffect(() => {
    handleGetHierarchy();
  }, []);

  // 3) Flatten the hierarchy of PGs to get a single list
  const flattenPGHierarchy = (pgs) => {
    // Recursively collect all PGs (root + children) in one array
    let result = [];
    for (const pg of pgs) {
      result.push(pg);
      if (pg.childGroups && pg.childGroups.length > 0) {
        result = result.concat(flattenPGHierarchy(pg.childGroups));
      }
    }
    return result;
  };

  // 4) Create a flattened array of all PGs for the cards with filtering
  const allPGs = flattenPGHierarchy(pgHierarchy)
    .filter((pg) => {
      // Apply filter if entered
      if (filterPGs) {
        // Check for special filters
        if (filterPGs === "RUNNING") {
          return hasRunningProcessors(pg);
        }
        if (filterPGs === "STOPPED") {
          return !hasRunningProcessors(pg);
        }

        // Check for processor type filters
        if (filterPGs === "GetMongo") {
          return pg.processors?.some((p) => p.type.includes("GetMongo"));
        }
        if (filterPGs === "Jolt") {
          return pg.processors?.some((p) => p.type.includes("JoltTransform"));
        }
        if (filterPGs === "Solr") {
          return pg.processors?.some((p) => p.type.includes("PutSolr"));
        }

        // Regular text search
        return pg.name.toLowerCase().includes(filterPGs.toLowerCase());
      }

      // Filter to only show collection-specific PGs if enabled
      if (showOnlyCollectionPGs && !pg.name.startsWith("PG_")) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort to show collection PGs at the top
      const aIsCollectionPG = a.name.startsWith("PG_");
      const bIsCollectionPG = b.name.startsWith("PG_");

      if (aIsCollectionPG && !bIsCollectionPG) return -1;
      if (!aIsCollectionPG && bIsCollectionPG) return 1;

      // Sort alphabetically within each group
      return a.name.localeCompare(b.name);
    });

  // 5) Find the selected PG from the flattened array
  const selectedPG = allPGs.find((pg) => pg.id === selectedPGId);

  // 6) Processor logs or metrics
  const fetchProcessorLogs = async (processorId) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${baseUrl}/nifi/pg/${processorId}/logs`
      );
      setLogsModal({ isOpen: true, logs: response.data.logs });
    } catch (error) {
      console.error(error);
      setMessage("حدث خطأ أثناء جلب السجلات.");
    } finally {
      setLoading(false);
    }
  };

  // 7) Smart operation - the core function that implements the custom logic
  const handleSmartOperation = async (pgId, action) => {
    if (!pgId) {
      setMessage("لم يتم تحديد مجموعة عمليات!");
      return;
    }

    setLoading(true);

    // If this is the confirm modal case, close it
    setConfirmationModal({ isOpen: false, action: null, pgId: null });

    try {
      // Get the process group
      const pg = allPGs.find((p) => p.id === pgId);
      if (!pg) {
        throw new Error("مجموعة العمليات غير موجودة!");
      }

      if (action === "SMART_START") {
        // Find processors by their types
        const getMongo = pg.processors.filter((p) =>
          p.type.includes("GetMongo")
        );
        const joltTransform = pg.processors.filter((p) =>
          p.type.includes("JoltTransformJSON")
        );
        const putSolr = pg.processors.filter((p) =>
          p.type.includes("PutSolrContentStream")
        );

        // First, set JoltTransform and PutSolr to RUNNING
        if (joltTransform.length > 0 || putSolr.length > 0) {
          const runningProcessorIds = [
            ...joltTransform.map((p) => p.id),
            ...putSolr.map((p) => p.id),
          ];

          if (runningProcessorIds.length > 0) {
            await axios.post(`${baseUrl}/nifi/pg/operate`, {
              processorIds: runningProcessorIds,
              action: "RUNNING",
            });
          }
        }

        // Then set GetMongo to RUN_ONCE
        if (getMongo.length > 0) {
          await axios.post(`${baseUrl}/nifi/pg/operate`, {
            processorIds: getMongo.map((p) => p.id),
            action: "RUN_ONCE",
          });
        }

        setMessage(`تم تشغيل تدفق البيانات بنجاح لمجموعة ${pg.name}`);
      } else if (action === "STOP_ALL") {
        // Stop all processors in the group
        await axios.post(`${baseUrl}/nifi/pg/operate`, {
          pgIds: [pgId],
          action: "STOPPED",
        });

        setMessage(`تم إيقاف جميع معالجات مجموعة ${pg.name} بنجاح`);
      } else {
        // Regular operation, just pass the action along
        await axios.post(`${baseUrl}/nifi/pg/operate`, {
          pgIds: [pgId],
          action: action,
        });

        setMessage(`تم تنفيذ العملية ${action} على مجموعة ${pg.name} بنجاح`);
      }

      // Refresh the hierarchy after a short delay
      setTimeout(() => {
        handleGetHierarchy();
      }, 1500);
    } catch (error) {
      console.error("Error during operation:", error);
      setMessage(`حدث خطأ أثناء تنفيذ العملية: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePG = async (pgId) => {
    if (!pgId) {
      setMessage("لم يتم تحديد مجموعة عمليات!");
      return;
    }

    setLoading(true);
    setConfirmationModal({ isOpen: false, action: null, pgId: null });

    try {
      // Get the process group info
      const pg = allPGs.find((p) => p.id === pgId);
      if (!pg) {
        throw new Error("مجموعة العمليات غير موجودة!");
      }

      // Call the DELETE endpoint
      const response = await axios.delete(`${baseUrl}/nifi/pg/${pgId}`);

      // Success message and cleanup
      setMessage(`تم حذف مجموعة العمليات "${pg.name}" بنجاح`);

      // If the deleted PG was selected, clear the selection
      if (selectedPGId === pgId) {
        setSelectedPGId(null);
      }

      // Refresh after deletion
      setTimeout(() => handleGetHierarchy(), 1500);
    } catch (error) {
      console.error("Error deleting process group:", error);
      setMessage(`حدث خطأ أثناء حذف مجموعة العمليات: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 8) Toggle selection of an individual processor
  const toggleProcessor = (processorId) => {
    setSelectedProcessors((prev) =>
      prev.includes(processorId)
        ? prev.filter((id) => id !== processorId)
        : [...prev, processorId]
    );
  };

  // 9) Toggle all processors for the selected PG
  const toggleAllProcessors = (pgId) => {
    const thisPG = allPGs.find((pg) => pg.id === pgId);
    if (!thisPG) return;

    const processorIds = thisPG.processors?.map((proc) => proc.id) || [];
    const allSelected = processorIds.every((id) =>
      selectedProcessors.includes(id)
    );

    setSelectedProcessors(
      allSelected
        ? selectedProcessors.filter((id) => !processorIds.includes(id))
        : [
            ...selectedProcessors,
            ...processorIds.filter((id) => !selectedProcessors.includes(id)),
          ]
    );
  };

  // 10) Confirm operation for a specific PG
  const confirmPGOperation = (pgId, action) => {
    setConfirmationModal({
      isOpen: true,
      action,
      pgId,
    });
  };

  // 12) Group processors by type for better organization
  const groupProcessorsByType = (pg) => {
    if (!pg?.processors) return {};

    const groups = {};
    pg.processors.forEach((processor) => {
      const shortType = processor.type.split(".").pop(); // Get just the final part of the type
      if (!groups[shortType]) {
        groups[shortType] = [];
      }
      groups[shortType].push(processor);
    });

    return groups;
  };

  return (
    <div style={{ direction: "rtl" }}>
      <h2 className="text-2xl font-bold mb-4">
        التحكم في تدفقات NiFi (من MongoDB إلى Solr)
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleGetHierarchy}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {loading ? "جاري التحميل..." : "تحديث الحالة"}
        </button>

        <button
          onClick={() => setShowOnlyCollectionPGs(!showOnlyCollectionPGs)}
          className={`px-4 py-2 rounded-lg ${
            showOnlyCollectionPGs
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-300 text-gray-800 hover:bg-gray-400"
          }`}
        >
          {showOnlyCollectionPGs
            ? "عرض جميع المجموعات"
            : "عرض مجموعات البيانات فقط"}
        </button>
      </div>

      <div className="p-4 mb-4 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200">
        <h3 className="font-bold mb-1">إرشادات التشغيل السري:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            استخدم "تشغيل ذكي" لتشغيل GetMongo مرة واحدة وتشغيل JoltTransform و
            PutSolr بشكل مستمر
          </li>
          <li>استخدم "إيقاف الكل" لإيقاف جميع المعالجات في المجموعة</li>
          <li>يمكنك البحث عن المجموعات باستخدام حقل البحث</li>
        </ol>
      </div>

      {message && (
        <div
          className={`p-3 mb-4 rounded-lg flex items-center justify-between transition-all duration-300 ${
            message.includes("خطأ")
              ? darkMode
                ? "bg-red-900 text-red-100"
                : "bg-red-100 text-red-800"
              : darkMode
              ? "bg-green-900 text-green-100"
              : "bg-green-100 text-green-800"
          }`}
        >
          <div className="flex items-center">
            {message.includes("خطأ") ? (
              <svg
                className="w-5 h-5 mr-2 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5 mr-2 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
            )}
            {message}
          </div>
          <button
            onClick={() => setMessage("")}
            className="text-gray-600 hover:text-gray-800"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      )}

      {/* Process Group Cards */}
      {/* Dashboard Statistics Overview - System-wide statistics */}
      <div className="mb-6">
        <h3
          className={`text-lg font-bold mb-3 ${
            darkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          لوحة المعلومات العامة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-1 text-gray-500">
              إجمالي المجموعات
            </h4>
            <div className="flex items-end">
              <span
                className={`text-2xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                {flattenPGHierarchy(pgHierarchy).length}
              </span>
              <span className="text-sm ml-2 text-gray-500">مجموعة</span>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-1 text-gray-500">
              مجموعات البيانات
            </h4>
            <div className="flex items-end">
              <span
                className={`text-2xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                {
                  flattenPGHierarchy(pgHierarchy).filter((pg) =>
                    pg.name.startsWith("PG_")
                  ).length
                }
              </span>
              <span className="text-sm ml-2 text-gray-500">مجموعة</span>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-1 text-gray-500">
              المجموعات قيد التشغيل
            </h4>
            <div className="flex items-end">
              <span
                className={`text-2xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                {
                  flattenPGHierarchy(pgHierarchy).filter((pg) =>
                    hasRunningProcessors(pg)
                  ).length
                }
              </span>
              <span className="text-sm ml-2 text-gray-500">مجموعة</span>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-1 text-gray-500">
              إجمالي المعالجات
            </h4>
            <div className="flex items-end">
              <span
                className={`text-2xl font-bold ${
                  darkMode ? "text-gray-100" : "text-gray-800"
                }`}
              >
                {flattenPGHierarchy(pgHierarchy).reduce(
                  (total, pg) => total + (pg.processors?.length || 0),
                  0
                )}
              </span>
              <span className="text-sm ml-2 text-gray-500">معالج</span>
            </div>
          </div>
        </div>

        {/* Processor Type Distribution Chart */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-3 text-gray-500">
              توزيع أنواع المعالجات
            </h4>

            {(() => {
              // Calculate total counts of each processor type
              const getAllProcessors = () =>
                flattenPGHierarchy(pgHierarchy).flatMap(
                  (pg) => pg.processors || []
                );
              const allProcessors = getAllProcessors();

              const getMongoCount = allProcessors.filter((p) =>
                p.type.includes("GetMongo")
              ).length;
              const joltCount = allProcessors.filter((p) =>
                p.type.includes("JoltTransform")
              ).length;
              const solrCount = allProcessors.filter((p) =>
                p.type.includes("PutSolr")
              ).length;
              const otherCount =
                allProcessors.length - getMongoCount - joltCount - solrCount;

              // Get running counts
              const runningGetMongo = allProcessors.filter(
                (p) => p.type.includes("GetMongo") && p.state === "RUNNING"
              ).length;
              const runningJolt = allProcessors.filter(
                (p) => p.type.includes("JoltTransform") && p.state === "RUNNING"
              ).length;
              const runningSolr = allProcessors.filter(
                (p) => p.type.includes("PutSolr") && p.state === "RUNNING"
              ).length;
              const runningOther = allProcessors.filter(
                (p) =>
                  !p.type.includes("GetMongo") &&
                  !p.type.includes("JoltTransform") &&
                  !p.type.includes("PutSolr") &&
                  p.state === "RUNNING"
              ).length;

              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-blue-600">
                        GetMongo (قراءة من MongoDB)
                      </span>
                      <span>
                        {runningGetMongo} / {getMongoCount} قيد التشغيل
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            (getMongoCount / allProcessors.length) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-purple-600">
                        JoltTransform (تحويل البيانات)
                      </span>
                      <span>
                        {runningJolt} / {joltCount} قيد التشغيل
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${(joltCount / allProcessors.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-yellow-600">
                        PutSolr (كتابة إلى Solr)
                      </span>
                      <span>
                        {runningSolr} / {solrCount} قيد التشغيل
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${(solrCount / allProcessors.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {otherCount > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-600">
                          أنواع أخرى
                        </span>
                        <span>
                          {runningOther} / {otherCount} قيد التشغيل
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-500 rounded-full"
                          style={{
                            width: `${
                              (otherCount / allProcessors.length) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div
            className={`rounded-lg shadow-md border p-4 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h4 className="text-sm uppercase font-semibold mb-3 text-gray-500">
              حالة المعالجات
            </h4>

            {(() => {
              // Calculate processor states
              const getAllProcessors = () =>
                flattenPGHierarchy(pgHierarchy).flatMap(
                  (pg) => pg.processors || []
                );
              const allProcessors = getAllProcessors();

              const runningCount = allProcessors.filter(
                (p) => p.state === "RUNNING"
              ).length;
              const stoppedCount = allProcessors.filter(
                (p) => p.state === "STOPPED"
              ).length;
              const otherStateCount =
                allProcessors.length - runningCount - stoppedCount;

              const runningPercentage = Math.round(
                (runningCount / (allProcessors.length || 1)) * 100
              );
              const stoppedPercentage = Math.round(
                (stoppedCount / (allProcessors.length || 1)) * 100
              );
              const otherPercentage =
                100 - runningPercentage - stoppedPercentage;

              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 36 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Background circle */}
                        <circle cx="18" cy="18" r="16" fill="#E5E7EB" />

                        {/* Running segment */}
                        {runningPercentage > 0 && (
                          <path
                            d={`M18 2 
                         A 16 16 0 ${runningPercentage > 50 ? 1 : 0} 1 ${
                              18 +
                              16 *
                                Math.sin(
                                  (2 * Math.PI * runningPercentage) / 100
                                )
                            } ${
                              18 -
                              16 *
                                Math.cos(
                                  (2 * Math.PI * runningPercentage) / 100
                                )
                            }
                         L 18 18 Z`}
                            fill="#10B981"
                          />
                        )}

                        {/* Stopped segment */}
                        {stoppedPercentage > 0 && (
                          <path
                            d={`M${
                              18 +
                              16 *
                                Math.sin(
                                  (2 * Math.PI * runningPercentage) / 100
                                )
                            } ${
                              18 -
                              16 *
                                Math.cos(
                                  (2 * Math.PI * runningPercentage) / 100
                                )
                            }
                         A 16 16 0 ${
                           runningPercentage + stoppedPercentage > 50 ? 1 : 0
                         } 1 ${
                              18 +
                              16 *
                                Math.sin(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage + stoppedPercentage)) /
                                    100
                                )
                            } ${
                              18 -
                              16 *
                                Math.cos(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage + stoppedPercentage)) /
                                    100
                                )
                            }
                         L 18 18 Z`}
                            fill="#EF4444"
                          />
                        )}

                        {/* Other states segment */}
                        {otherPercentage > 0 && (
                          <path
                            d={`M${
                              18 +
                              16 *
                                Math.sin(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage + stoppedPercentage)) /
                                    100
                                )
                            } ${
                              18 -
                              16 *
                                Math.cos(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage + stoppedPercentage)) /
                                    100
                                )
                            }
                         A 16 16 0 ${
                           runningPercentage +
                             stoppedPercentage +
                             otherPercentage >
                           50
                             ? 1
                             : 0
                         } 1 ${
                              18 +
                              16 *
                                Math.sin(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage +
                                      stoppedPercentage +
                                      otherPercentage)) /
                                    100
                                )
                            } ${
                              18 -
                              16 *
                                Math.cos(
                                  (2 *
                                    Math.PI *
                                    (runningPercentage +
                                      stoppedPercentage +
                                      otherPercentage)) /
                                    100
                                )
                            }
                         L 18 18 Z`}
                            fill="#F59E0B"
                          />
                        )}

                        {/* Center hole */}
                        <circle
                          cx="18"
                          cy="18"
                          r="12"
                          fill={darkMode ? "#1F2937" : "#FFFFFF"}
                        />

                        {/* Display percentage text */}
                        <text
                          x="18"
                          y="18"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="8"
                          fill={darkMode ? "#E5E7EB" : "#111827"}
                          fontWeight="bold"
                        >
                          {runningPercentage}%
                        </text>
                        <text
                          x="18"
                          y="24"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="4"
                          fill={darkMode ? "#E5E7EB" : "#6B7280"}
                        >
                          قيد التشغيل
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span
                          className={
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          قيد التشغيل
                        </span>
                      </div>
                      <span className="font-semibold">
                        {runningCount} ({runningPercentage}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span
                          className={
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }
                        >
                          متوقف
                        </span>
                      </div>
                      <span className="font-semibold">
                        {stoppedCount} ({stoppedPercentage}%)
                      </span>
                    </div>

                    {otherStateCount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                          <span
                            className={
                              darkMode ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            حالات أخرى
                          </span>
                        </div>
                        <span className="font-semibold">
                          {otherStateCount} ({otherPercentage}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Search filter for Process Groups - always visible */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <label htmlFor="pg-filter" className="block mb-1 font-medium">
              بحث في مجموعات العمليات:
            </label>
            <input
              id="pg-filter"
              type="text"
              value={filterPGs}
              onChange={(e) => setFilterPGs(e.target.value)}
              placeholder="اكتب للبحث..."
              className={`w-full px-4 py-2 border rounded-lg ${
                darkMode
                  ? "dark:text-gray-100 dark:bg-gray-700 dark:border-gray-600"
                  : "text-gray-800 bg-gray-100 border-gray-300"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPGs("")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === ""
                ? "bg-blue-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            الكل
          </button>

          <button
            onClick={() => setFilterPGs("GetMongo")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === "GetMongo"
                ? "bg-blue-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            GetMongo
          </button>

          <button
            onClick={() => setFilterPGs("Jolt")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === "Jolt"
                ? "bg-blue-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            JoltTransform
          </button>

          <button
            onClick={() => setFilterPGs("Solr")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === "Solr"
                ? "bg-blue-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            PutSolr
          </button>

          <button
            onClick={() => setFilterPGs("RUNNING")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === "RUNNING"
                ? "bg-green-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-green-400 mr-1.5"></span>
            قيد التشغيل
          </button>

          <button
            onClick={() => setFilterPGs("STOPPED")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterPGs === "STOPPED"
                ? "bg-red-600 text-white"
                : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1.5"></span>
            متوقف
          </button>
        </div>
      </div>

      {/* Process Group Cards with Enhanced UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
        {allPGs.length > 0 ? (
          allPGs.map((pg) => {
            // Calculate processor counts by type
            const getMongoCount =
              pg.processors?.filter((p) => p.type.includes("GetMongo"))
                .length || 0;
            const joltCount =
              pg.processors?.filter((p) => p.type.includes("JoltTransformJSON"))
                .length || 0;
            const solrCount =
              pg.processors?.filter((p) =>
                p.type.includes("PutSolrContentStream")
              ).length || 0;
            const otherCount =
              (pg.processors?.length || 0) -
              getMongoCount -
              joltCount -
              solrCount;

            // Calculate running processors percentage
            const runningCount =
              pg.processors?.filter((p) => p.state === "RUNNING").length || 0;
            const totalProcessors = pg.processors?.length || 0;
            const runningPercentage =
              totalProcessors > 0
                ? Math.round((runningCount / totalProcessors) * 100)
                : 0;

            return (
              <div
                key={pg.id}
                className={`rounded-lg shadow-md border overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  selectedPGId === pg.id
                    ? darkMode
                      ? "bg-blue-900 border-blue-700 transform scale-102"
                      : "bg-blue-50 border-blue-300 transform scale-102"
                    : darkMode
                    ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
                onClick={() =>
                  setSelectedPGId(pg.id === selectedPGId ? null : pg.id)
                }
              >
                <div className="p-4">
                  {/* Status bar at the top */}
                  <div className="w-full h-1 -mt-4 mb-3">
                    <div
                      className="h-full bg-green-500 rounded-b-sm transition-all duration-300 ease-in-out"
                      style={{ width: `${runningPercentage}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <h3
                      className={`font-bold text-lg truncate ${
                        darkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      {pg.name.startsWith("PG_")
                        ? pg.name.substring(3)
                        : pg.name}
                    </h3>
                    <div className="flex items-center">
                      <span
                        className={`flex items-center text-xs px-2 py-1 rounded-full ${
                          hasRunningProcessors(pg)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full mr-1 ${
                            hasRunningProcessors(pg)
                              ? "bg-green-500"
                              : "bg-gray-500"
                          }`}
                        ></span>
                        {hasRunningProcessors(pg)
                          ? `${runningCount}/${totalProcessors}`
                          : "متوقف"}
                      </span>
                    </div>
                  </div>

                  {/* Processor type bars */}
                  <div className="mb-4">
                    {getMongoCount > 0 && (
                      <div className="mb-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-600">GetMongo</span>
                          <span>{getMongoCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${
                                (getMongoCount / totalProcessors) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {joltCount > 0 && (
                      <div className="mb-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-purple-600">JoltTransform</span>
                          <span>{joltCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${(joltCount / totalProcessors) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {solrCount > 0 && (
                      <div className="mb-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-yellow-600">PutSolr</span>
                          <span>{solrCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{
                              width: `${(solrCount / totalProcessors) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {otherCount > 0 && (
                      <div className="mb-1.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">أخرى</span>
                          <span>{otherCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-500 rounded-full"
                            style={{
                              width: `${(otherCount / totalProcessors) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmPGOperation(pg.id, "SMART_START");
                      }}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-2 rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      تشغيل ذكي
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmPGOperation(pg.id, "STOP_ALL");
                      }}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-2 rounded-lg hover:from-red-600 hover:to-red-700 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      إيقاف الكل
                    </button>
                  </div>

                  {/* Add the delete button below the other buttons */}
                  <div className="mt-2">
                    {pg.name.startsWith("PG_") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmPGOperation(pg.id, "DELETE");
                        }}
                        className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-1.5 px-2 rounded-lg hover:from-gray-600 hover:to-gray-700 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        حذف المجموعة
                      </button>
                    ) : (
                      <span className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-1.5 px-2 rounded-lg hover:from-gray-600 hover:to-gray-700 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1">
                        المجموعة العامة
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-lg border border-gray-300 shadow-sm">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p
              className={`text-lg ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              لا توجد مجموعات عمليات تطابق معايير البحث
            </p>
            <button
              onClick={() => {
                setFilterPGs("");
                setShowOnlyCollectionPGs(false);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              عرض جميع المجموعات
            </button>
          </div>
        )}
      </div>

      {/* Selected PG Stats - Only show when a PG is selected */}
      {selectedPG && (
        <div
          className={`mb-6 rounded-lg border shadow-md overflow-hidden ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`px-6 py-4 border-b ${
              darkMode
                ? "border-gray-700 bg-gray-900"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <h3
                  className={`text-xl font-bold ${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  {selectedPG.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {selectedPG.processors?.length || 0} معالج |
                  <span
                    className={`mr-1 ${
                      selectedPG.processors?.some((p) => p.state === "RUNNING")
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {selectedPG.processors?.some((p) => p.state === "RUNNING")
                      ? "قيد التشغيل"
                      : "متوقف"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {Object.entries(groupProcessorsByType(selectedPG)).map(
                ([type, processors]) => {
                  const runningCount = processors.filter(
                    (p) => p.state === "RUNNING"
                  ).length;
                  const percentage = Math.round(
                    (runningCount / processors.length) * 100
                  );

                  let typeColor, bgColor, labelText, icon;
                  if (type.includes("GetMongo")) {
                    typeColor = "text-blue-500";
                    bgColor = "bg-blue-500";
                    labelText = "قراءة من MongoDB";
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-blue-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                        <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                        <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                      </svg>
                    );
                  } else if (type.includes("JoltTransform")) {
                    typeColor = "text-purple-500";
                    bgColor = "bg-purple-500";
                    labelText = "تحويل البيانات";
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-purple-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                          clipRule="evenodd"
                        />
                      </svg>
                    );
                  } else if (type.includes("PutSolr")) {
                    typeColor = "text-yellow-500";
                    bgColor = "bg-yellow-500";
                    labelText = "كتابة إلى Solr";
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-yellow-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                        <path
                          fillRule="evenodd"
                          d="M8 10a4 4 0 00-3.446 6.032l-1.261 1.26a1 1 0 101.414 1.415l1.261-1.261A4 4 0 108 10zm-2 4a2 2 0 114 0 2 2 0 01-4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    );
                  } else {
                    typeColor = "text-gray-500";
                    bgColor = "bg-gray-500";
                    labelText = type;
                    icon = (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    );
                  }

                  return (
                    <div
                      key={type}
                      className={`p-4 rounded-lg shadow border ${
                        darkMode
                          ? "bg-gray-800 border-gray-700"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start">
                          {icon}
                          <div>
                            <h4 className={`font-bold ${typeColor}`}>{type}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {labelText}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            percentage > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {percentage}% تعمل
                        </span>
                      </div>

                      <div
                        className={`text-sm mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>العدد:</span>
                          <span className="font-medium">
                            {processors.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>قيد التشغيل:</span>
                          <span className="font-medium">{runningCount}</span>
                        </div>
                      </div>

                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bgColor}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                        {type.includes("GetMongo") ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmationModal({
                                isOpen: true,
                                action: "RUN_ONCE",
                                pgId: null,
                                processorIds: processors.map((p) => p.id),
                              });
                            }}
                            className="flex items-center justify-center px-2 py-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs font-medium"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            تشغيل مرة واحدة
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmationModal({
                                isOpen: true,
                                action: "RUNNING",
                                pgId: null,
                                processorIds: processors.map((p) => p.id),
                              });
                            }}
                            className="flex items-center justify-center px-2 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 text-xs font-medium"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                clipRule="evenodd"
                              />
                            </svg>
                            تشغيل
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmationModal({
                              isOpen: true,
                              action: "STOPPED",
                              pgId: null,
                              processorIds: processors.map((p) => p.id),
                            });
                          }}
                          className="flex items-center justify-center px-2 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                              clipRule="evenodd"
                            />
                          </svg>
                          إيقاف
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Replace button with section divider line */}
            {selectedPG.processors?.length > 0 && (
              <div
                className="my-6"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <div className="flex items-center cursor-pointer">
                  <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
                  <div
                    className={`mx-4 text-sm font-medium rounded-lg px-4 py-2 ${
                      darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {showAdvancedOptions
                      ? "إخفاء الإعدادات المتقدمة"
                      : "إظهار الإعدادات المتقدمة"}
                    <span className="mr-2">
                      {showAdvancedOptions ? "▲" : "▼"}
                    </span>
                  </div>
                  <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADVANCED SECTION: Display processors of the selected PG grouped by type */}
      {showAdvancedOptions && selectedPG && (
        <div
          className={`mt-8 rounded-lg border shadow-md overflow-hidden transition-all duration-300 ease-in-out ${
            darkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`px-6 py-4 border-b ${
              darkMode
                ? "border-gray-700 bg-gray-900"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <h3
                  className={`text-xl font-bold ${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  إدارة متقدمة - {selectedPG.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  يمكنك من هنا إدارة المعالجات بشكل فردي والتحكم في كل معالج على
                  حدة
                </p>
              </div>

              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <button
                  onClick={() => toggleAllProcessors(selectedPG.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    selectedPG.processors?.every((proc) =>
                      selectedProcessors.includes(proc.id)
                    )
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : darkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {selectedPG.processors?.every((proc) =>
                    selectedProcessors.includes(proc.id)
                  )
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Display processors grouped by type */}
            <div className="space-y-8">
              {Object.entries(groupProcessorsByType(selectedPG)).map(
                ([type, processors]) => (
                  <div
                    key={type}
                    className="border-t pt-6 first:border-t-0 first:pt-0"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4
                        className={`text-lg font-bold flex items-center ${
                          type.includes("GetMongo")
                            ? "text-blue-500"
                            : type.includes("JoltTransform")
                            ? "text-purple-500"
                            : type.includes("PutSolr")
                            ? "text-yellow-500"
                            : "text-gray-500"
                        }`}
                      >
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            type.includes("GetMongo")
                              ? "bg-blue-500"
                              : type.includes("JoltTransform")
                              ? "bg-purple-500"
                              : type.includes("PutSolr")
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }`}
                        ></span>
                        {type}{" "}
                        <span className="text-sm font-normal ml-2 text-gray-500">
                          ({processors.length})
                        </span>
                      </h4>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const ids = processors.map((p) => p.id);
                            setSelectedProcessors((prev) => {
                              const allSelected = ids.every((id) =>
                                prev.includes(id)
                              );
                              return allSelected
                                ? prev.filter((id) => !ids.includes(id))
                                : [
                                    ...prev,
                                    ...ids.filter((id) => !prev.includes(id)),
                                  ];
                            });
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            processors.every((p) =>
                              selectedProcessors.includes(p.id)
                            )
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : darkMode
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {processors.every((p) =>
                            selectedProcessors.includes(p.id)
                          )
                            ? "إلغاء تحديد الكل"
                            : "تحديد الكل"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {processors.map((processor) => (
                        <div
                          key={processor.id}
                          className={`p-4 rounded-lg shadow-md border transition-all ${
                            selectedProcessors.includes(processor.id)
                              ? darkMode
                                ? "bg-blue-900 border-blue-700 transform scale-102"
                                : "bg-blue-50 border-blue-300 transform scale-102"
                              : darkMode
                              ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                              : "bg-white border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex justify-between mb-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`processor-${processor.id}`}
                                checked={selectedProcessors.includes(
                                  processor.id
                                )}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleProcessor(processor.id);
                                }}
                                className={`w-4 h-4 mr-3 rounded transition-colors
                          ${
                            darkMode
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-100 border-gray-300"
                          }
                          ${
                            selectedProcessors.includes(processor.id)
                              ? "accent-blue-600"
                              : ""
                          }`}
                              />
                              <label
                                htmlFor={`processor-${processor.id}`}
                                className={`cursor-pointer font-medium truncate max-w-[180px] ${
                                  darkMode ? "text-gray-100" : "text-gray-800"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProcessor(processor.id);
                                }}
                              >
                                {processor.name}
                              </label>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                processor.state === "RUNNING"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                  processor.state === "RUNNING"
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-red-500"
                                }`}
                              ></span>
                              {processor.state}
                            </span>
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <div className="flex space-x-2 space-x-reverse">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop event from reaching the card's onClick
                                  setConfirmationModal({
                                    isOpen: true,
                                    action: "RUNNING",
                                    pgId: null,
                                    processorIds: [processor.id],
                                  });
                                }}
                                className="px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 flex items-center"
                                title="تشغيل"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs font-medium">
                                  تشغيل مستمر
                                </span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmationModal({
                                    isOpen: true,
                                    action: "STOPPED",
                                    pgId: null,
                                    processorIds: [processor.id],
                                  });
                                }}
                                className="px-2 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 flex items-center"
                                title="إيقاف"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs font-medium">
                                  إيقاف
                                </span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmationModal({
                                    isOpen: true,
                                    action: "RUN_ONCE",
                                    pgId: null,
                                    processorIds: [processor.id],
                                  });
                                }}
                                className="px-2 py-1.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center"
                                title="تشغيل مرة واحدة"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs font-medium">
                                  مرة واحدة
                                </span>
                              </button>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchProcessorLogs(processor.id);
                              }}
                              className={`text-xs font-medium px-2.5 py-1.5 rounded-md bg-gray-100 ${
                                darkMode
                                  ? "text-blue-400 hover:text-blue-300 bg-gray-700"
                                  : "text-blue-600 hover:text-blue-800"
                              } hover:underline flex items-center gap-1`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              الإحصائيات
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Advanced Control Buttons - only show if processors are selected */}
            {selectedProcessors.length > 0 && (
              <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-300 dark:border-gray-600 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg font-medium ${
                        darkMode
                          ? "bg-blue-900 text-blue-100"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {selectedProcessors.length} معالج محدد
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          action: "RUN_ONCE",
                          pgId: null,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 flex items-center transition-all shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      تشغيل مرة واحدة
                    </button>

                    <button
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          action: "RUNNING",
                          pgId: null,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 flex items-center transition-all shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      تشغيل
                    </button>

                    <button
                      onClick={() =>
                        setConfirmationModal({
                          isOpen: true,
                          action: "STOPPED",
                          pgId: null,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 flex items-center transition-all shadow-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      إيقاف
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div
            className={`p-6 rounded-lg max-w-lg w-full ${
              darkMode
                ? "bg-gray-800 text-gray-100 border border-gray-700"
                : "bg-white text-gray-900 border border-gray-300"
            }`}
          >
            <h2 className="text-xl font-bold mb-4">إحصائيات المعالج</h2>
            {logsModal.logs ? (
              <div className="space-y-2">
                <p>
                  <span className="font-bold">الاسم:</span>{" "}
                  {logsModal.logs.name}
                </p>
                <p>
                  <span className="font-bold">النوع:</span>{" "}
                  {logsModal.logs.type}
                </p>
                <p>
                  <span className="font-bold">الحالة:</span>{" "}
                  <span
                    className={`font-bold ${
                      logsModal.logs.state === "RUNNING"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {logsModal.logs.state}
                  </span>
                </p>
                <p>
                  <span className="font-bold">الحالة التشغيلية:</span>{" "}
                  {logsModal.logs.runStatus}
                </p>
                <p>
                  <span className="font-bold">عدد الملفات الواردة:</span>{" "}
                  {logsModal.logs.flowFilesIn}
                </p>
                <p>
                  <span className="font-bold">عدد الملفات الصادرة:</span>{" "}
                  {logsModal.logs.flowFilesOut}
                </p>
                <p>
                  <span className="font-bold">عدد الملفات المعلقة:</span>{" "}
                  {logsModal.logs.flowFilesQueued}
                </p>
                <p>
                  <span className="font-bold">عدد البايتات المقروءة:</span>{" "}
                  {logsModal.logs.bytesRead}
                </p>
                <p>
                  <span className="font-bold">عدد البايتات المكتوبة:</span>{" "}
                  {logsModal.logs.bytesWritten}
                </p>
              </div>
            ) : (
              <p>جاري التحميل...</p>
            )}
            <button
              onClick={() => setLogsModal({ isOpen: false, logs: null })}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div
            className={`p-6 rounded-lg max-w-sm w-full ${
              darkMode
                ? "bg-gray-800 text-gray-100 border border-gray-700"
                : "bg-white text-gray-900 border border-gray-300"
            }`}
          >
            <h2 className="text-lg font-bold mb-4">تأكيد العملية</h2>
            {confirmationModal.action === "SMART_START" && (
              <p>
                هل تريد تنفيذ عملية "التشغيل الذكي" على المجموعة المحددة؟ سيتم
                تشغيل GetMongo مرة واحدة وتشغيل JoltTransform و PutSolr بشكل
                مستمر.
              </p>
            )}
            {confirmationModal.action === "STOP_ALL" && (
              <p>هل تريد إيقاف جميع المعالجات في المجموعة المحددة؟</p>
            )}
            {!confirmationModal.pgId &&
              confirmationModal.action === "RUN_ONCE" && (
                <p>هل تريد تشغيل المعالجات المحددة مرة واحدة؟</p>
              )}
            {!confirmationModal.pgId &&
              confirmationModal.action === "RUNNING" && (
                <p>هل تريد تشغيل المعالجات المحددة بشكل مستمر؟</p>
              )}
            {!confirmationModal.pgId &&
              confirmationModal.action === "STOPPED" && (
                <p>هل تريد إيقاف المعالجات المحددة؟</p>
              )}
            {confirmationModal.action === "DELETE" && (
              <div className="space-y-3">
                <p className="text-red-500 font-bold">
                  تحذير: هذا الإجراء لا يمكن التراجع عنه!
                </p>
                <p>
                  هل أنت متأكد من رغبتك في حذف مجموعة العمليات المحددة وجميع
                  معالجاتها؟
                </p>
              </div>
            )}
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  if (confirmationModal.pgId) {
                    if (confirmationModal.action === "DELETE") {
                      // Call delete function
                      handleDeletePG(confirmationModal.pgId);
                    } else {
                      // Handle other PG operations as before
                      handleSmartOperation(
                        confirmationModal.pgId,
                        confirmationModal.action
                      );
                    }
                  } else {
                    // Handle regular operation for selected processors
                    setLoading(true);
                    axios
                      .post(`${baseUrl}/nifi/pg/operate`, {
                        processorIds:
                          confirmationModal.processorIds || selectedProcessors,
                        action: confirmationModal.action,
                      })
                      .then((response) => {
                        setMessage(response.data.message);
                        setTimeout(() => handleGetHierarchy(), 1000);
                      })
                      .catch((error) => {
                        console.error(error);
                        setMessage(`حدث خطأ: ${error.message}`);
                      })
                      .finally(() => {
                        setLoading(false);
                        setConfirmationModal({
                          isOpen: false,
                          action: null,
                          pgId: null,
                        });
                      });
                  }
                }}
                className={`${
                  confirmationModal.action === "DELETE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-500 hover:bg-green-600"
                } text-white px-4 py-2 rounded`}
              >
                {confirmationModal.action === "DELETE"
                  ? "نعم، حذف المجموعة"
                  : "نعم"}
              </button>
              <button
                onClick={() =>
                  setConfirmationModal({
                    isOpen: false,
                    action: null,
                    pgId: null,
                  })
                }
                className={`${
                  confirmationModal.action === "DELETE"
                    ? "bg-green-600 hover:bg-red-700"
                    : "bg-red-500 hover:bg-green-600"
                } text-white px-4 py-2 rounded`}
              >
                لا
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MongoToSolr;
