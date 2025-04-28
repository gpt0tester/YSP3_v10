import React, { useEffect, useRef, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { toPng, toJpeg } from "html-to-image";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";

const Modal = ({ isOpen, onClose, children, collectionName, darkMode }) => {
  const { t } = useTranslation();
  const modalRef = useRef();
  const contentRef = useRef();
  const [exportFormat, setExportFormat] = useState("png");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Focus trap references
  const closeButtonRef = useRef();
  const exportButtonRef = useRef();

  // Handle export in different formats
  const handleExport = useCallback(
    async (format = "png") => {
      if (!contentRef.current) return;

      try {
        setIsExporting(true);
        const exportFunction = format === "png" ? toPng : toJpeg;
        const quality = format === "jpeg" ? 0.95 : 1;

        const dataUrl = await exportFunction(contentRef.current, {
          cacheBust: true,
          quality,
          backgroundColor: darkMode ? "#1a202c" : "#ffffff",
          pixelRatio: 2,
          skipFonts: false, // Ensure fonts are included
          style: {
            borderRadius: "0", // Remove border radius for export
            boxShadow: "none", // Remove shadows for export
          },
        });

        const filename = `${collectionName.replace(/\s+/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        saveAs(dataUrl, filename);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2000);
      } catch (error) {
        console.error("خطأ أثناء التصدير:", error);
      } finally {
        setIsExporting(false);
      }
    },
    [darkMode, collectionName]
  );

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = ""; // Restore scrolling when modal is closed
    };
  }, [isOpen, onClose]);

  // Trap focus inside the modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== "Tab") return;

      // Shift + Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      }
      // Tab
      else if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    };

    modalRef.current.addEventListener("keydown", handleTabKey);

    // Auto-focus the close button when modal opens
    closeButtonRef.current?.focus();

    return () => {
      modalRef.current?.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen]);

  // Close modal when clicking outside
  const handleBackdropClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      dir="rtl"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`rounded-lg w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] overflow-hidden shadow-2xl transition-all transform duration-300 ease-out ${
          darkMode
            ? "bg-gray-800 text-gray-200 border border-gray-700"
            : "bg-white text-gray-800 border border-gray-300"
        }`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Modal Header */}
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${
            darkMode
              ? "bg-gray-900 border-gray-700"
              : "bg-gray-100 border-gray-200"
          }`}
        >
          <h2 id="modal-title" className="text-xl font-bold">
            {collectionName}
          </h2>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`flex items-center justify-center rounded-full w-8 h-8 transition-colors ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900"
            }`}
            aria-label={t("close", "إغلاق")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div
          ref={contentRef}
          className={`p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-12rem)] ${
            darkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          {children}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t ${
            darkMode
              ? "bg-gray-900 border-gray-700"
              : "bg-gray-100 border-gray-200"
          }`}
        >
          <div className="flex items-center">
            <label
              htmlFor="export-format"
              className={`text-sm mr-2 ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {t("exportFormat", "صيغة التصدير")}:
            </label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className={`rounded px-2 py-1 text-sm border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-md transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {t("close", "إغلاق")}
            </button>

            <button
              ref={exportButtonRef}
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting}
              className={`px-4 py-2 rounded-md flex items-center justify-center min-w-24 transition-colors ${
                isExporting
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-blue-700"
              } ${
                exportSuccess
                  ? darkMode
                    ? "bg-green-700 text-white"
                    : "bg-green-600 text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isExporting ? (
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
                  {t("exporting", "جارٍ التصدير...")}
                </>
              ) : exportSuccess ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
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
                  {t("exported", "تم التصدير")}
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
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
                  {t("export", "تصدير")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  collectionName: PropTypes.string.isRequired,
  darkMode: PropTypes.bool,
};

Modal.defaultProps = {
  darkMode: false,
};

export default Modal;
