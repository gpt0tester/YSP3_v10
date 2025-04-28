// new look

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const availableFilterFields = [
  { key: "Supplier", label: "المورد", type: "text" },
  { key: "Series", label: "السلسلة", type: "text" },
  { key: "Mfr", label: "الشركة المصنعة", type: "text" },
  { key: "Team", label: "الفريق", type: "text" },
  { key: "Price", label: "السعر", type: "number" },
];

// Create lookup maps for labels and types
const fieldLabelMap = availableFilterFields.reduce((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {});

const fieldTypeMap = availableFilterFields.reduce((acc, field) => {
  acc[field.key] = field.type;
  return acc;
}, {});

const Filters = ({ filters, handleFilterChange }) => {
  const [selectedFields, setSelectedFields] = useState([]);

  // Initialize selected fields based on filters prop
  useEffect(() => {
    if (filters) {
      const initialSelectedFields = Object.keys(filters).filter((key) =>
        availableFilterFields.some((field) => field.key === key)
      );
      setSelectedFields(initialSelectedFields);
    }
  }, [filters]);

  // Handle the addition/removal of filter fields
  const handleFieldSelectionChange = (fieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((key) => key !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  return (
    <div className="mb-4" dir="rtl">
      {/* Field Selection */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold mb-2">اختر الحقول للتصفية:</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {availableFilterFields.map((field) => (
            <div key={field.key} className="flex items-center">
              <input
                type="checkbox"
                id={`select-${field.key}`}
                checked={selectedFields.includes(field.key)}
                onChange={() => handleFieldSelectionChange(field.key)}
                className="mr-2"
              />
              <label
                htmlFor={`select-${field.key}`}
                className="text-gray-700 dark:text-gray-300"
              >
                {field.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Filter Inputs */}
      {selectedFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {selectedFields.map((key) => (
            <div key={key}>
              <label
                htmlFor={`filter-${key}`}
                className="block text-gray-700 dark:text-gray-300"
              >
                {fieldLabelMap[key]}
              </label>
              <input
                type={fieldTypeMap[key] || "text"}
                id={`filter-${key}`}
                name={key}
                value={filters[key] || ""}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                dir="rtl"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

Filters.propTypes = {
  filters: PropTypes.object.isRequired,
  handleFilterChange: PropTypes.func.isRequired,
};

export default Filters;
