// DeleteConfirmationModal.js
import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

// Fixed Modal component with better dark mode support
const Modal = ({ isOpen, onClose, darkMode, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className={`p-6 rounded-lg shadow-xl max-w-md w-full transform transition-all duration-200 scale-100 ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default function DeleteConfirmationModal(props) {
  const {
    isOpen,
    onClose,
    onConfirm,
    collectionName,
    darkMode = false,
    isMongoManager = false,
    title = "تأكيد الحذف",
    mainMessage = "هل أنت متأكد أنك تريد حذف",
    detailMessage = "هذا الإجراء لا يمكن التراجع عنه. يرجى التأكد من أنك تريد المتابعة.",
    optionalActionLabel = "حذف البيانات بالكامل",
    optionalActionMessage = "هل تريد أيضاً حذف البيانات المرتبطة؟",
    optionalActionWarning = "تحذير: هذا سيحذف البيانات المرتبطة بشكل دائم.",
  } = props;

  const [dropData, setDropData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDropData(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(dropData);
    onClose();
  };

  const shouldRender = isOpen && collectionName;

  return (
    <Modal isOpen={isOpen} onClose={onClose} darkMode={darkMode}>
      {shouldRender && (
        <div className={darkMode ? "text-gray-100" : "text-gray-800"}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center text-red-500">
              <AlertTriangle className="mr-2" size={24} />
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className={`hover:bg-opacity-20 p-1 rounded-full transition-colors ${
                darkMode
                  ? "text-gray-400 hover:text-gray-200 hover:bg-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-black"
              }`}
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <h3
              className={`font-semibold mb-2 text-lg ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              {mainMessage}:{" "}
              <span className="text-red-500 font-bold">{collectionName}</span>
            </h3>
            {detailMessage}:{" "}
            {isMongoManager && (
              <div
                className={`p-4 rounded-md border-l-4 border-yellow-400 mb-4 ${
                  darkMode ? "bg-yellow-900/30" : "bg-yellow-50"
                }`}
              >
                <p
                  className={`font-medium mb-2 ${
                    darkMode ? "text-yellow-200" : "text-yellow-800"
                  }`}
                >
                  {optionalActionMessage}
                </p>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dropData}
                    onChange={(e) => setDropData(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span
                    className={`ml-2 ${
                      darkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    {optionalActionLabel}
                  </span>
                </label>
                {dropData && (
                  <p
                    className={`text-sm mt-2 ${
                      darkMode ? "text-yellow-200" : "text-yellow-800"
                    }`}
                  >
                    {optionalActionWarning}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            <button
              className={`px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-gray-400"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500"
              }`}
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              className="flex items-center px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              onClick={handleConfirm}
            >
              <Trash2 size={16} className="mr-2" />
              تأكيد الحذف
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}