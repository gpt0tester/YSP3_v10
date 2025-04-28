// components/PaginationComponent.js

import React, { useState } from "react";

const PaginationComponent = ({
  currentPage,
  totalPages,
  goToPage,
  darkMode,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleGoToPage = () => {
    const pageNumber = parseInt(inputValue, 10);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setInputValue("");
    } else {
      // Optionally show an error message or toast
    }
  };

  return (
    <div
      className="flex items-center justify-center mt-4 space-x-reverse-4"
      dir="rtl"
    >
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white ${
          currentPage === 1 ? "cursor-not-allowed opacity-50" : ""
        }`}
        aria-label="الصفحة السابقة"
      >
        &lt; السابق
      </button>
      <div className="mr-2 ml-2 flex items-center space-x-reverse-3">
        <span>
          الصفحة {currentPage} من {totalPages}
        </span>
        <div className="flex items-center">
          <button
            onClick={handleGoToPage}
            className="mr-2 px-3 h-8 py-1 bg-blue-600 text-white rounded-r-lg "
          >
            اذهب
          </button>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={handleInputChange}
            placeholder="اذهب إلى"
            className="w-24 px-2 h-8 rounded-l-lg text-gray-900 bg-gray-100 dark:bg-gray-600 dark:text-gray-100"
            aria-label="اذهب إلى صفحة"
          />
        </div>
      </div>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white ${
          currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""
        }`}
        aria-label="الصفحة التالية"
      >
        التالي &gt;
      </button>
    </div>
  );
};

export default PaginationComponent;
