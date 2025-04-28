// import React, { useState } from "react";
// import { useTranslation } from "react-i18next";

// const Sidebar = ({
//   activeSection,
//   setActiveSection,
//   darkMode,
//   isMobileOpen,
//   closeMobileMenu,
// }) => {
//   const { t } = useTranslation();
//   const [hoveredItem, setHoveredItem] = useState(null);

//   // Menu items with icons and translations
//   const menuItems = [
//     {
//       section: "search",
//       label: t("search", "بحث"),
//       ariaLabel: t("searchAria", "بحث"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path
//             fillRule="evenodd"
//             d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
//             clipRule="evenodd"
//           />
//         </svg>
//       ),
//     },
//     {
//       section: "add-data",
//       label: t("addData", "إضافة بيانات"),
//       ariaLabel: t("addDataAria", "إضافة بيانات"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
//           <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
//           <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
//         </svg>
//       ),
//     },
//     {
//       section: "create-collection",
//       label: t("createCollection", "إنشاء مجموعة جديدة"),
//       ariaLabel: t("createCollectionAria", "إنشاء مجموعة جديدة"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path
//             fillRule="evenodd"
//             d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
//             clipRule="evenodd"
//           />
//         </svg>
//       ),
//     },
//     {
//       section: "indexing",
//       label: t("indexing", "فهرسة"),
//       ariaLabel: t("indexingAria", "فهرسة"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
//         </svg>
//       ),
//     },
//     {
//       section: "import",
//       label: t("import", "استيراد"),
//       ariaLabel: t("importAria", "استيراد"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path
//             fillRule="evenodd"
//             d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
//             clipRule="evenodd"
//           />
//         </svg>
//       ),
//     },
//     {
//       section: "translate",
//       label: t("translate", "ترجمة"),
//       ariaLabel: t("translateAria", "ترجمة"),
//       icon: (
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-5 w-5"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path
//             fillRule="evenodd"
//             d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
//             clipRule="evenodd"
//           />
//         </svg>
//       ),
//     },
//   ];

//   return (
//     <div
//       className={`h-full flex flex-col flex-shrink-0 py-6 overflow-hidden transition-all duration-300
//         ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
//       `}
//     >
//       {/* Logo and Title */}
//       <div className="px-6 mb-8">
//         <div className="flex items-center space-x-3 rtl:space-x-reverse">
//           <div
//             className={`w-8 h-8 rounded-md flex items-center justify-center ${
//               darkMode ? "bg-blue-600" : "bg-blue-500"
//             }`}
//           >
// <svg
//   xmlns="http://www.w3.org/2000/svg"
//   className="h-5 w-5 text-white"
//   viewBox="0 0 20 20"
//   fill="currentColor"
// >
//   <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
// </svg>
//           </div>
//           <h2 className="text-lg font-bold rtl:mr-1">
//             {t("appTitle", "إدارة البيانات")}
//           </h2>
//         </div>
//       </div>

//       {/* Close button - only on mobile */}
//       <div className="md:hidden px-6 mb-6">
//         <button
//           onClick={closeMobileMenu}
//           className={`w-full flex items-center justify-center py-2 rounded-md border ${
//             darkMode
//               ? "border-gray-700 hover:bg-gray-700"
//               : "border-gray-200 hover:bg-gray-100"
//           }`}
//         >
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             className="h-5 w-5"
//             viewBox="0 0 20 20"
//             fill="currentColor"
//           >
//             <path
//               fillRule="evenodd"
//               d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
//               clipRule="evenodd"
//             />
//           </svg>
//           <span className="mr-2">{t("close", "إغلاق")}</span>
//         </button>
//       </div>

//       {/* Menu Section */}
//       <div className="mb-6 px-4">
//         <h3
//           className={`text-xs uppercase font-semibold tracking-wider mb-2 px-2 ${
//             darkMode ? "text-gray-400" : "text-gray-500"
//           }`}
//         >
//           {t("mainMenu", "القائمة الرئيسية")}
//         </h3>
//       </div>

//       {/* Navigation Menu */}
//       <nav className="flex-1 px-3 overflow-y-auto">
//         <ul className="space-y-1.5">
//           {menuItems.map((item) => {
//             const isActive = activeSection === item.section;
//             const isHovered = hoveredItem === item.section;

//             return (
//               <li key={item.section}>
//                 <button
//                   className={`
//                     relative w-full flex items-center rounded-lg py-3 px-4 rtl:text-right
//                     transition-all duration-200 group
//                     ${
//                       isActive
//                         ? darkMode
//                           ? "bg-gradient-to-l from-blue-800 to-blue-900 text-white font-medium shadow-lg shadow-blue-900/30"
//                           : "bg-gradient-to-l from-blue-500 to-blue-600 text-white font-medium shadow-md shadow-blue-500/30"
//                         : darkMode
//                         ? "text-gray-300 hover:bg-gray-700 hover:text-white"
//                         : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
//                     }
//                   `}
//                   onClick={() => {
//                     setActiveSection(item.section);
//                     if (window.innerWidth < 768) {
//                       closeMobileMenu();
//                     }
//                   }}
//                   onMouseEnter={() => setHoveredItem(item.section)}
//                   onMouseLeave={() => setHoveredItem(null)}
//                   onFocus={() => setHoveredItem(item.section)}
//                   onBlur={() => setHoveredItem(null)}
//                   aria-label={item.ariaLabel}
//                   aria-current={isActive ? "page" : undefined}
//                 >
//                   {/* Active indication bar */}
//                   {isActive && (
//                     <span className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-l-md" />
//                   )}

//                   <div className="flex items-center w-full">
//                     <span className="ml-3 text-sm truncate">{item.label}</span>
//                     <span
//                       className={`mr-auto ${
//                         isActive || isHovered ? "text-white" : ""
//                       }`}
//                     >
//                       {item.icon}
//                     </span>
//                   </div>

//                   {/* Hover/Active animation */}
//                   {(isActive || isHovered) && (
//                     <span className="absolute inset-0 rounded-lg bg-opacity-10 bg-white pointer-events-none" />
//                   )}
//                 </button>
//               </li>
//             );
//           })}
//         </ul>
//       </nav>

//       {/* Settings Section */}
//       <div className="mt-6 px-3">
//         <div
//           className={`p-4 rounded-lg ${
//             darkMode ? "bg-gray-700/50" : "bg-gray-100"
//           } transition-all duration-200`}
//         >
//           <div className="flex items-center">
//             <div
//               className={`w-10 h-10 rounded-full flex items-center justify-center ${
//                 darkMode ? "bg-gray-600" : "bg-gray-200"
//               }`}
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 className={`h-6 w-6 ${
//                   darkMode ? "text-blue-400" : "text-blue-600"
//                 }`}
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                 />
//               </svg>
//             </div>
//             <div className="mr-3 rtl:ml-0">
//               <h4 className="text-sm font-medium">
//                 {t("needHelp", "تحتاج مساعدة؟")}
//               </h4>
//               <p
//                 className={`text-xs mt-1 ${
//                   darkMode ? "text-gray-400" : "text-gray-500"
//                 }`}
//               >
//                 {t("viewDocumentation", "راجع الوثائق")}
//               </p>
//             </div>
//           </div>
//           <button
//             className={`mt-3 w-full py-2 text-sm rounded-md transition-colors duration-200
//               ${
//                 darkMode
//                   ? "bg-blue-600 hover:bg-blue-700 text-white"
//                   : "bg-blue-500 hover:bg-blue-600 text-white"
//               }`}
//           >
//             {t("viewDocs", "عرض الوثائق")}
//           </button>
//         </div>
//       </div>

//       {/* App Version */}
//       <div className="mt-4 mb-2 px-6">
//         <div
//           className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
//         >
//           {t("version", "الإصدار")} 1.2.0
//         </div>
//       </div>
//     </div>
//   );
// };

// export default React.memo(Sidebar);

// ============================================================================================================

import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppIcon from "./AppIcon"; // Make sure this import path is correct

const Sidebar = ({ darkMode, isMobileOpen, closeMobileMenu }) => {
  const { t } = useTranslation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const location = useLocation();

  // Menu items with icons and translations - updated with path instead of section
  const menuItems = [
    {
      path: "/search",
      label: t("search", "بحث"),
      ariaLabel: t("searchAria", "بحث"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      path: "/add-data",
      label: t("addData", "إضافة بيانات"),
      ariaLabel: t("addDataAria", "إضافة بيانات"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
        </svg>
      ),
    },
    {
      path: "/create-collection",
      label: t("createCollection", "إنشاء مجموعة جديدة"),
      ariaLabel: t("createCollectionAria", "إنشاء مجموعة جديدة"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      path: "/indexing",
      label: t("indexing", "فهرسة"),
      ariaLabel: t("indexingAria", "فهرسة"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      path: "/import",
      label: t("import", "استيراد"),
      ariaLabel: t("importAria", "استيراد"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      path: "/translate",
      label: t("translate", "ترجمة"),
      ariaLabel: t("translateAria", "ترجمة"),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={`h-full flex flex-col flex-shrink-0 py-4 overflow-hidden transition-all duration-300
        ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
      `}
    >
      {/* Logo and Title */}
      {/* Only show the logo on mobile - removed from desktop view */}
      <div className="md:hidden px-6 mb-8">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center ${
              darkMode ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold rtl:mr-1">
            {t("appTitle", "إدارة البيانات")}
          </h2>
        </div>
      </div>

      {/* Close button - only on mobile */}
      <div className="md:hidden px-6 mb-6">
        <button
          onClick={closeMobileMenu}
          className={`w-full flex items-center justify-center py-2 rounded-md border ${
            darkMode
              ? "border-gray-700 hover:bg-gray-700"
              : "border-gray-200 hover:bg-gray-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span className="mr-2">{t("close", "إغلاق")}</span>
        </button>
      </div>

      {/* Menu Section */}
      <div className="px-6 mb-8">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center ${
              darkMode ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
            </svg> */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <h2 className="text-lg font-bold rtl:mr-1">
            {t("mainMenu", "القائمة الرئيسية")}
          </h2>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive: active }) => `
                    relative w-full flex items-center rounded-lg py-3 px-4 rtl:text-right
                    transition-all duration-200 group
                    ${
                      active
                        ? darkMode
                          ? "bg-gradient-to-l from-blue-800 to-blue-900 text-white font-medium shadow-lg shadow-blue-900/30"
                          : "bg-gradient-to-l from-blue-500 to-blue-600 text-white font-medium shadow-md shadow-blue-500/30"
                        : darkMode
                        ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      closeMobileMenu();
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onFocus={() => setHoveredItem(item.path)}
                  onBlur={() => setHoveredItem(null)}
                  aria-label={item.ariaLabel}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indication bar */}
                      {isActive && (
                        <span className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-l-md" />
                      )}

                      <div className="flex items-center w-full">
                        <span className="ml-3 text-sm truncate">
                          {item.label}
                        </span>
                        <span
                          className={`mr-auto ${
                            isActive || hoveredItem === item.path
                              ? "text-white"
                              : ""
                          }`}
                        >
                          {item.icon}
                        </span>
                      </div>

                      {/* Hover/Active animation */}
                      {(isActive || hoveredItem === item.path) && (
                        <span className="absolute inset-0 rounded-lg bg-opacity-10 bg-white pointer-events-none" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings Section - Fixed at bottom */}
      <div className="mt-auto px-3 pt-3 flex-shrink-0">
        <div
          className={`p-3 rounded-lg ${
            darkMode ? "bg-gray-700/50" : "bg-gray-100"
          } transition-all duration-200`}
        >
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                darkMode ? "bg-gray-600" : "bg-gray-200"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="mr-2 rtl:ml-0">
              <h4 className="text-sm font-medium">
                {t("needHelp", "تحتاج مساعدة؟")}
              </h4>
              <p
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {t("viewDocumentation", "راجع الوثائق")}
              </p>
            </div>
          </div>
          <NavLink
            to="/documentation"
            className={`mt-2 block w-full py-2 text-sm rounded-md text-center transition-colors duration-200
              ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            onClick={() => {
              if (window.innerWidth < 768) {
                closeMobileMenu();
              }
            }}
          >
            {t("viewDocs", "عرض الوثائق")}
          </NavLink>
        </div>

        {/* App Version */}
        <div className="mt-2 mb-1 px-2 text-center">
          <div
            className={`text-xs ${
              darkMode ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {t("version", "الإصدار")} 1.2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Sidebar);
