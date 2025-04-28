import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import { useTranslation } from "react-i18next";

const ItemList = ({
  title,
  items,
  searchQuery,
  collectionName,
  displayName,
  darkMode,
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const { t } = useTranslation();

  const escapeRegExp = (str) =>
    str?.replace(/[.*~+?^${}()|[\]\\]/g, "\\$&") || "";

  // Highlight function with improved contrast for accessibility
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const safeQuery = escapeRegExp(query);
    const parts = String(text).split(new RegExp(`(${safeQuery})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className={`px-1 py-0.5 rounded ${
            darkMode
              ? "bg-yellow-500 text-gray-900"
              : "bg-yellow-400 text-gray-900"
          }`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getFieldsToShow = useMemo(() => {
    return (item) => {
      const ignoredFields = new Set([
        "_id",
        "id",
        "_collection",
        "__v",
        "_matchingFields",
        "_id._oid",
        "_version_",
        "_root_",
      ]);

      let selectedFields = [];

      // Step 1: Always show the first meaningful field (excluding ignored fields)
      const firstField = Object.keys(item).find(
        (field) => !ignoredFields.has(field)
      );
      if (firstField) selectedFields.push(firstField);

      // Step 2: Check _matchingFields and pick up to 2 that contain the searchQuery
      let matchingFields = [];
      if (item._matchingFields?.length > 0 && searchQuery) {
        matchingFields = item._matchingFields.filter(
          (field) =>
            !ignoredFields.has(field) &&
            item[field] &&
            String(item[field])
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
        );
      }

      // Add up to 2 `_matchingFields` that contain the query
      selectedFields.push(...matchingFields.slice(0, 2));

      // Step 3: If fewer than 3 fields exist, add more meaningful fields
      if (selectedFields.length < 3) {
        Object.keys(item).forEach((field) => {
          if (!ignoredFields.has(field) && !selectedFields.includes(field)) {
            selectedFields.push(field);
          }
          if (selectedFields.length === 3) return; // Stop once we reach 3 fields
        });
      }

      // Here we decided to limit to 2 fields in the main list,
      // but you could change it to 3 if you like.
      return selectedFields.slice(0, 2);
    };
  }, [searchQuery]);

  if (!items || items.length === 0) {
    return (
      <div dir="rtl" className="p-4 rounded-lg shadow-md text-center">
        <h3
          className={`text-xl font-semibold mb-4 ${
            darkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div
          className={`p-8 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          <p
            className={`text-center text-lg ${
              darkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {t("noResults", "لا توجد نتائج للعرض.")}
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => window.history.back()}
          >
            {t("goBack", "العودة")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-2">
      <h3
        className={`text-xl font-semibold mb-4 ${
          darkMode ? "text-gray-100" : "text-gray-800"
        }`}
      >
        {title}{" "}
        <span className="text-sm text-gray-500">
          ({items.length} {t("items", "عناصر")})
        </span>
      </h3>

      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item, index) => {
          const itemId = item.id || item._id || index;
          const isHovered = hoveredItemId === itemId;
          const fieldsToShow = getFieldsToShow(item);

          return (
            <li
              key={itemId}
              //
              // Tailwind classes for max height + overflow (to limit card size):
              // "max-h-40" can be changed to e.g. "max-h-36" or "max-h-48"
              // "overflow-hidden" or "overflow-auto" as needed
              //
              className={`p-4 rounded-lg shadow-md cursor-pointer transition-all duration-300
                ${
                  darkMode
                    ? "bg-gray-800 hover:bg-gray-700"
                    : "bg-white hover:bg-blue-50"
                }
                ${isHovered ? "transform scale-[1.02] shadow-lg" : ""}
                max-h-40 overflow-hidden relative
              `}
              onClick={() => setSelectedItem(item)}
              onMouseEnter={() => setHoveredItemId(itemId)}
              onMouseLeave={() => setHoveredItemId(null)}
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedItem(item);
                }
              }}
              role="button"
              aria-label={`${t("viewDetails", "عرض التفاصيل للعنصر")} ${
                index + 1
              }`}
            >
              <div
                className={`border-r-4 ${
                  isHovered ? "border-blue-500" : "border-transparent"
                } pr-3 relative h-full`}
              >
                {/* Content with gradient fade at bottom for large content */}
                <div className={`${isHovered ? "pb-10" : ""}`}>
                  <dl className="space-y-2">
                    {fieldsToShow.map((field) => (
                      <div
                        key={field}
                        className="grid grid-cols-3 gap-2 items-top"
                      >
                        <dt
                          className={`col-span-1 text-sm font-bold truncate ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {t(field, { defaultValue: field })}:
                        </dt>
                        <dd
                          className={`col-span-2 text-sm font-medium break-words ${
                            darkMode ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                          {highlightMatch(
                            String(item[field] || ""),
                            searchQuery
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Gradient fade effect starting precisely from the bottom edge */}
                <div
                  className={`absolute py-4 bottom-0 left-0 right-0 h-16 pointer-events-none ${
                    darkMode
                      ? "bg-gradient-to-t from-gray-700 via-gray-700/95 to-transparent"
                      : "bg-gradient-to-t from-white via-white/95 to-transparent"
                  } ${
                    isHovered ? "opacity-100" : "opacity-0"
                  } px-4 py-4 mx-[-1rem] w-[calc(100%+2rem)] my-[-1rem] h-[calc(30%+2rem)]`}
                ></div>

                {/* "View more" button positioned absolutely at bottom and centered */}
                {isHovered && (
                  <div
                    className={`absolute bottom-2 left-0 right-0 text-center z-10`}
                  >
                    <span
                      className={`text-xs rounded-full px-3 py-1 inline-block shadow-sm ${
                        darkMode
                          ? "bg-blue-900 text-blue-100"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {t("viewMore", "عرض المزيد")}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modal for displaying the full document content */}
      <Modal
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        collectionName={displayName || collectionName}
        darkMode={darkMode}
      >
        {selectedItem && (
          <div className="max-h-[70vh] p-2">
            <h3
              className={`text-lg font-bold mb-4 pb-2 border-b ${
                darkMode
                  ? "border-gray-700 text-gray-100"
                  : "border-gray-300 text-gray-800"
              }`}
            >
              {t("detailsFor", "تفاصيل")} {displayName || collectionName}
            </h3>

            <dl className="space-y-3">
              {Object.keys(selectedItem)
                .filter(
                  (field) =>
                    ![
                      "_id",
                      "id",
                      "_collection",
                      "__v",
                      "_matchingFields",
                      "_id._oid",
                      "_version_",
                      "_root_",
                    ].includes(field)
                )
                .map((field) => {
                  const value = selectedItem[field];
                  const isSearchMatch =
                    searchQuery &&
                    String(value)
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase());

                  return (
                    <div
                      key={field}
                      className={`py-2 grid grid-cols-3 gap-4 rounded-md ${
                        isSearchMatch
                          ? darkMode
                            ? "bg-blue-900/30"
                            : "bg-blue-50"
                          : ""
                      }`}
                    >
                      <dt
                        className={`text-sm font-bold col-span-1 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {t(field, { defaultValue: field })}:
                      </dt>
                      <dd
                        className={`mt-0 text-sm col-span-2 break-words ${
                          darkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {highlightMatch(String(value || ""), searchQuery)}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
};

ItemList.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  searchQuery: PropTypes.string,
  collectionName: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  darkMode: PropTypes.bool,
};

ItemList.defaultProps = {
  searchQuery: "",
  darkMode: false,
};

export default ItemList;
