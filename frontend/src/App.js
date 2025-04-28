// // // import React, {
// // //   useEffect,
// // //   useReducer,
// // //   useState,
// // //   Suspense,
// // //   lazy,
// // //   useMemo,
// // //   useCallback,
// // // } from "react";
// // // import axios from "axios";
// // // import { ToastContainer, toast } from "react-toastify";
// // // import "react-toastify/dist/ReactToastify.css";
// // // import ApibaseUrl from "./ApibaseUrl";
// // // import Sidebar from "./components/Sidebar";
// // // import { useTranslation } from "react-i18next";

// // // // Import the new SearchContainer component
// // // import SearchContainer from "./components/Search/SearchContainer";

// // // // Lazy load components with named chunks for better code splitting
// // // const AddDataToCollection = lazy(() =>
// // //   import(/* webpackChunkName: "add-data" */ "./components/AddDataToCollection")
// // // );
// // // const ImportProcess = lazy(() =>
// // //   import(/* webpackChunkName: "import" */ "./components/import/ImportProcess")
// // // );
// // // const IndexProcess = lazy(() =>
// // //   import(/* webpackChunkName: "indexing" */ "./components/index/IndexProcess")
// // // );
// // // const FlowProcess = lazy(() =>
// // //   import(/* webpackChunkName: "flow" */ "./components/Flow/FlowProcess")
// // // );
// // // const TranslationManager = lazy(() =>
// // //   import(/* webpackChunkName: "translation" */ "./i18n/TranslationManager")
// // // );
// // // // Removed MultiCollectionResults import as it's now handled in SearchContainer

// // // // Initial state for app reducer - removed searchHistory
// // // const initialAppState = {
// // //   darkMode: false,
// // //   activeSection: "search",
// // //   isMenuOpen: false,
// // //   notifications: [],
// // // };

// // // // Simplified reducer - search history actions removed
// // // function appReducer(state, action) {
// // //   switch (action.type) {
// // //     case "SET_DARK_MODE":
// // //       return { ...state, darkMode: action.payload };
// // //     case "SET_ACTIVE_SECTION":
// // //       return { ...state, activeSection: action.payload, isMenuOpen: false };
// // //     case "TOGGLE_MENU":
// // //       return { ...state, isMenuOpen: !state.isMenuOpen };
// // //     case "CLOSE_MENU":
// // //       return { ...state, isMenuOpen: false };
// // //     case "ADD_NOTIFICATION":
// // //       return {
// // //         ...state,
// // //         notifications: [
// // //           ...state.notifications,
// // //           {
// // //             id: Date.now(),
// // //             ...action.payload,
// // //             read: false,
// // //           },
// // //         ],
// // //       };
// // //     case "MARK_NOTIFICATION_READ":
// // //       return {
// // //         ...state,
// // //         notifications: state.notifications.map((n) =>
// // //           n.id === action.payload ? { ...n, read: true } : n
// // //         ),
// // //       };
// // //     case "CLEAR_ALL_NOTIFICATIONS":
// // //       return { ...state, notifications: [] };
// // //     default:
// // //       return state;
// // //   }
// // // }

// // // // Create theme context for easier theming
// // // const ThemeContext = React.createContext({ darkMode: false });

// // // export default function App() {
// // //   const [appState, dispatch] = useReducer(appReducer, initialAppState);
// // //   const { darkMode, activeSection, isMenuOpen, notifications } = appState;
// // //   const { t, i18n } = useTranslation();

// // //   const [isFirstLoad, setIsFirstLoad] = useState(true);
// // //   const baseUrl = ApibaseUrl;

// // //   // Optimized fetch translations with error boundaries
// // //   useEffect(() => {
// // //     const controller = new AbortController();

// // //     const doTranslations = async () => {
// // //       try {
// // //         if (!baseUrl) return;

// // //         const res = await axios.get(`${baseUrl}/translations`, {
// // //           signal: controller.signal,
// // //         });
// // //         // Process translations data here
// // //       } catch (err) {
// // //         if (!axios.isCancel(err)) {
// // //           console.error("Translation fetch error:", err);
// // //         }
// // //       }
// // //     };

// // //     doTranslations();

// // //     return () => controller.abort();
// // //   }, [baseUrl, i18n]);

// // //   // Initialize dark mode from localStorage with proper error handling
// // //   useEffect(() => {
// // //     try {
// // //       const savedTheme = localStorage.getItem("darkMode");
// // //       const prefersDark = window.matchMedia(
// // //         "(prefers-color-scheme: dark)"
// // //       ).matches;
// // //       const initialDarkMode =
// // //         savedTheme !== null ? savedTheme === "true" : prefersDark;

// // //       dispatch({ type: "SET_DARK_MODE", payload: initialDarkMode });

// // //       if (initialDarkMode) {
// // //         document.documentElement.classList.add("dark");
// // //       } else {
// // //         document.documentElement.classList.remove("dark");
// // //       }

// // //       setIsFirstLoad(false);
// // //     } catch (error) {
// // //       console.error("Error initializing theme:", error);
// // //       // Fallback to light mode
// // //       dispatch({ type: "SET_DARK_MODE", payload: false });
// // //       document.documentElement.classList.remove("dark");
// // //       setIsFirstLoad(false);
// // //     }
// // //   }, []);

// // //   // Keyboard event handler defined with useCallback at the top level
// // //   const handleEscKey = useCallback(
// // //     (event) => {
// // //       if (event.key === "Escape") {
// // //         dispatch({ type: "CLOSE_MENU" });
// // //       }
// // //     },
// // //     [dispatch]
// // //   );

// // //   // Effect to add/remove the event listener
// // //   useEffect(() => {
// // //     document.addEventListener("keydown", handleEscKey);
// // //     return () => document.removeEventListener("keydown", handleEscKey);
// // //   }, [handleEscKey]);

// // //   // Memoized toggle dark mode function
// // //   const toggleDarkMode = useCallback(() => {
// // //     const newValue = !darkMode;
// // //     dispatch({ type: "SET_DARK_MODE", payload: newValue });

// // //     if (newValue) {
// // //       document.documentElement.classList.add("dark");
// // //     } else {
// // //       document.documentElement.classList.remove("dark");
// // //     }

// // //     try {
// // //       localStorage.setItem("darkMode", newValue);
// // //     } catch (e) {
// // //       console.error("Failed to save dark mode setting:", e);
// // //     }
// // //   }, [darkMode]);

// // //   // Memoized loading spinner to prevent re-renders
// // //   const LoadingSpinner = useMemo(
// // //     () => (
// // //       <div className="flex items-center justify-center min-h-[400px]">
// // //         <div className="flex flex-col items-center">
// // //           <div
// // //             className={`w-12 h-12 border-4 border-t-4 rounded-full animate-spin ${
// // //               darkMode
// // //                 ? "border-gray-600 border-t-blue-500"
// // //                 : "border-gray-200 border-t-blue-600"
// // //             }`}
// // //           ></div>
// // //           <span
// // //             className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
// // //           >
// // //             {t("loading", "جارٍ التحميل...")}
// // //           </span>
// // //         </div>
// // //       </div>
// // //     ),
// // //     [darkMode, t]
// // //   );

// // //   // Memoized notifications panel to prevent re-renders
// // //   const NotificationsPanel = useMemo(
// // //     () => (
// // //       <div
// // //         className={`
// // //       fixed top-16 left-4 w-80 rounded-lg shadow-lg z-50 overflow-hidden
// // //       ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
// // //       transform transition-transform duration-300
// // //     `}
// // //       >
// // //         <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
// // //           <h3 className="font-medium">{t("notifications", "الإشعارات")}</h3>
// // //           <button
// // //             onClick={() => dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" })}
// // //             className="text-sm text-blue-600 dark:text-blue-400"
// // //           >
// // //             {t("clearAll", "مسح الكل")}
// // //           </button>
// // //         </div>

// // //         <div className="max-h-80 overflow-y-auto">
// // //           {notifications.length === 0 ? (
// // //             <div className="p-4 text-center text-gray-500 dark:text-gray-400">
// // //               {t("noNotifications", "لا توجد إشعارات")}
// // //             </div>
// // //           ) : (
// // //             notifications.map((notification) => (
// // //               <div
// // //                 key={notification.id}
// // //                 className={`
// // //                 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0
// // //                 ${notification.read ? "" : "bg-blue-50 dark:bg-blue-900/10"}
// // //               `}
// // //               >
// // //                 <div className="flex justify-between">
// // //                   <span className="font-medium text-sm">
// // //                     {notification.title}
// // //                   </span>
// // //                   <span className="text-xs text-gray-500 dark:text-gray-400">
// // //                     {new Date(notification.time).toLocaleTimeString()}
// // //                   </span>
// // //                 </div>
// // //                 <p className="text-sm mt-1">{notification.message}</p>
// // //               </div>
// // //             ))
// // //           )}
// // //         </div>
// // //       </div>
// // //     ),
// // //     [darkMode, notifications, t]
// // //   );

// // //   // Create theme context value
// // //   const themeContextValue = useMemo(
// // //     () => ({
// // //       darkMode,
// // //       toggleDarkMode,
// // //     }),
// // //     [darkMode, toggleDarkMode]
// // //   );

// // //   // Conditional class strings
// // //   const mainContainerClasses = `min-h-screen flex flex-col transition-colors duration-300 ${
// // //     darkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
// // //   }`;

// // //   const headerClasses = `sticky top-0 z-30 py-3 px-4 shadow-md border-b ${
// // //     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
// // //   }`;

// // //   const sidebarClasses = `
// // //     fixed md:sticky top-0 md:top-16 right-0 h-full md:h-[calc(100vh-4rem)]
// // //     w-64 z-50 md:z-0 transform transition-transform duration-300
// // //     ${isMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
// // //   `;

// // //   // Footer classes with more explicit width and overflow control
// // //   const footerClasses = `py-4 px-6 mt-auto border-t w-full overflow-hidden flex-shrink-0 ${
// // //     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
// // //   }`;

// // //   return (
// // //     <ThemeContext.Provider value={themeContextValue}>
// // //       <div className={mainContainerClasses} dir="rtl">
// // //         <ToastContainer
// // //           position="top-center"
// // //           autoClose={5000}
// // //           hideProgressBar={false}
// // //           newestOnTop
// // //           closeOnClick
// // //           rtl
// // //           pauseOnFocusLoss
// // //           draggable
// // //           pauseOnHover
// // //           theme={darkMode ? "dark" : "light"}
// // //         />

// // //         {/* Mobile menu overlay - only render when needed */}
// // //         {isMenuOpen && (
// // //           <div
// // //             className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
// // //             onClick={() => dispatch({ type: "CLOSE_MENU" })}
// // //           ></div>
// // //         )}

// // //         {/* Header */}
// // //         <header className={headerClasses}>
// // //           <div className="container mx-auto flex justify-between items-center">
// // //             {/* Left side (right in RTL) - Menu and Logo */}
// // //             <div className="flex items-center">
// // //               <button
// // //                 onClick={() => dispatch({ type: "TOGGLE_MENU" })}
// // //                 className={`md:hidden p-2 rounded-md ${
// // //                   darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
// // //                 }`}
// // //                 aria-label={t("toggleMenu", "قائمة التبديل")}
// // //               >
// // //                 <svg
// // //                   xmlns="http://www.w3.org/2000/svg"
// // //                   className="h-6 w-6"
// // //                   fill="none"
// // //                   viewBox="0 0 24 24"
// // //                   stroke="currentColor"
// // //                 >
// // //                   <path
// // //                     strokeLinecap="round"
// // //                     strokeLinejoin="round"
// // //                     strokeWidth={2}
// // //                     d="M4 6h16M4 12h16M4 18h16"
// // //                   />
// // //                 </svg>
// // //               </button>

// // //               <div className="flex items-center mr-4">
// // //                 <div
// // //                   className={`w-8 h-8 rounded-md flex items-center justify-center ${
// // //                     darkMode ? "bg-blue-600" : "bg-blue-500"
// // //                   }`}
// // //                 >
// // //                   <svg
// // //                     xmlns="http://www.w3.org/2000/svg"
// // //                     className="h-5 w-5 text-white"
// // //                     viewBox="0 0 20 20"
// // //                     fill="currentColor"
// // //                   >
// // //                     <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
// // //                   </svg>
// // //                 </div>
// // //                 <h1 className="text-xl font-bold mr-2">
// // //                   {t("appTitle", "إدارة المجموعات والبحث")}
// // //                 </h1>
// // //               </div>
// // //             </div>

// // //             {/* Right side (Left in RTL) - Actions */}
// // //             <div className="flex items-center">
// // //               {/* Dark mode toggle */}
// // //               <button
// // //                 onClick={toggleDarkMode}
// // //                 className={`p-2 rounded-full ${
// // //                   darkMode
// // //                     ? "bg-gray-700 text-yellow-300"
// // //                     : "bg-gray-200 text-gray-700"
// // //                 } transition-colors`}
// // //                 aria-label={
// // //                   darkMode
// // //                     ? t("lightMode", "الوضع الفاتح")
// // //                     : t("darkMode", "الوضع الداكن")
// // //                 }
// // //                 title={
// // //                   darkMode
// // //                     ? t("lightMode", "الوضع الفاتح")
// // //                     : t("darkMode", "الوضع الداكن")
// // //                 }
// // //               >
// // //                 {darkMode ? (
// // //                   <svg
// // //                     xmlns="http://www.w3.org/2000/svg"
// // //                     className="h-5 w-5"
// // //                     viewBox="0 0 20 20"
// // //                     fill="currentColor"
// // //                   >
// // //                     <path
// // //                       fillRule="evenodd"
// // //                       d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
// // //                       clipRule="evenodd"
// // //                     />
// // //                   </svg>
// // //                 ) : (
// // //                   <svg
// // //                     xmlns="http://www.w3.org/2000/svg"
// // //                     className="h-5 w-5"
// // //                     viewBox="0 0 20 20"
// // //                     fill="currentColor"
// // //                   >
// // //                     <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
// // //                   </svg>
// // //                 )}
// // //               </button>

// // //               {/* Notifications */}
// // //               <div className="relative mr-2">
// // //                 <button
// // //                   className={`p-2 rounded-full ${
// // //                     darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
// // //                   }`}
// // //                   aria-label={t("notifications", "الإشعارات")}
// // //                   title={t("notifications", "الإشعارات")}
// // //                 >
// // //                   <svg
// // //                     xmlns="http://www.w3.org/2000/svg"
// // //                     className="h-5 w-5"
// // //                     viewBox="0 0 20 20"
// // //                     fill="currentColor"
// // //                   >
// // //                     <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
// // //                   </svg>
// // //                 </button>
// // //                 {notifications.filter((n) => !n.read).length > 0 && (
// // //                   <span className="absolute top-1 left-1 h-2 w-2 bg-red-500 rounded-full"></span>
// // //                 )}
// // //               </div>

// // //               {/* User profile */}
// // //               <div className="mr-2">
// // //                 <button
// // //                   className={`p-1 rounded-full border-2 ${
// // //                     darkMode
// // //                       ? "border-gray-600 hover:border-gray-500"
// // //                       : "border-gray-300 hover:border-gray-400"
// // //                   }`}
// // //                   aria-label={t("userProfile", "الملف الشخصي")}
// // //                   title={t("userProfile", "الملف الشخصي")}
// // //                 >
// // //                   <span className="sr-only">
// // //                     {t("profile", "الملف الشخصي")}
// // //                   </span>
// // //                   <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
// // //                 </button>
// // //               </div>
// // //             </div>
// // //           </div>
// // //         </header>

// // //         {/* Main content */}
// // //         <div className="flex flex-1 relative">
// // //           {/* Sidebar */}
// // //           <div className={sidebarClasses}>
// // //             <Sidebar
// // //               activeSection={activeSection}
// // //               setActiveSection={(section) =>
// // //                 dispatch({ type: "SET_ACTIVE_SECTION", payload: section })
// // //               }
// // //               darkMode={darkMode}
// // //               isMobileOpen={isMenuOpen}
// // //               closeMobileMenu={() => dispatch({ type: "CLOSE_MENU" })}
// // //             />
// // //           </div>

// // //           {/* Main content area */}
// // //           <main className="flex-1 p-4 md:p-6">
// // //             {/* Active section content with conditional rendering */}
// // //             {activeSection === "search" && (
// // //               <SearchContainer baseUrl={baseUrl} darkMode={darkMode} />
// // //             )}

// // //             {activeSection === "create-collection" && (
// // //               <Suspense fallback={LoadingSpinner}>
// // //                 <FlowProcess darkMode={darkMode} />
// // //               </Suspense>
// // //             )}

// // //             {activeSection === "add-data" && (
// // //               <Suspense fallback={LoadingSpinner}>
// // //                 <AddDataToCollection darkMode={darkMode} />
// // //               </Suspense>
// // //             )}

// // //             {activeSection === "indexing" && (
// // //               <Suspense fallback={LoadingSpinner}>
// // //                 <IndexProcess darkMode={darkMode} />
// // //               </Suspense>
// // //             )}

// // //             {activeSection === "import" && (
// // //               <Suspense fallback={LoadingSpinner}>
// // //                 <ImportProcess darkMode={darkMode} />
// // //               </Suspense>
// // //             )}

// // //             {activeSection === "translate" && (
// // //               <Suspense fallback={LoadingSpinner}>
// // //                 <TranslationManager darkMode={darkMode} />
// // //               </Suspense>
// // //             )}
// // //           </main>
// // //         </div>

// // //         {/* Footer */}
// // //         <footer className={footerClasses}>
// // //           <div className="container mx-auto flex flex-wrap justify-between items-center text-sm">
// // //             <div className={darkMode ? "text-gray-400" : "text-gray-600"}>
// // //               {t("copyright", "© 2025 جميع الحقوق محفوظة")}
// // //             </div>

// // //             <div
// // //               className={`flex space-x-4 rtl:space-x-reverse ${
// // //                 darkMode ? "text-gray-400" : "text-gray-600"
// // //               }`}
// // //             >
// // //               <a href="#" className="hover:underline">
// // //                 {t("terms", "شروط الاستخدام")}
// // //               </a>
// // //               <a href="#" className="hover:underline">
// // //                 {t("privacy", "سياسة الخصوصية")}
// // //               </a>
// // //               <a href="#" className="hover:underline">
// // //                 {t("help", "المساعدة")}
// // //               </a>
// // //             </div>
// // //           </div>
// // //         </footer>
// // //       </div>
// // //     </ThemeContext.Provider>
// // //   );
// // // }

// // // ===========================================================================================================================

// // import React, {
// //   useEffect,
// //   useReducer,
// //   useState,
// //   Suspense,
// //   lazy,
// //   useMemo,
// //   useCallback,
// // } from "react";
// // import axios from "axios";
// // import { ToastContainer, toast } from "react-toastify";
// // import "react-toastify/dist/ReactToastify.css";
// // import ApibaseUrl from "./ApibaseUrl";
// // import Sidebar from "./components/Sidebar";
// // import { useTranslation } from "react-i18next";

// // import SplashScreen from "./components/SplashScreen";
// // import AppIcon from "./components/AppIcon";

// // // Import the new SearchContainer component
// // import SearchContainer from "./components/Search/SearchContainer";

// // // Lazy load components with named chunks for better code splitting
// // const AddDataToCollection = lazy(() =>
// //   import(/* webpackChunkName: "add-data" */ "./components/AddDataToCollection")
// // );
// // const ImportProcess = lazy(() =>
// //   import(/* webpackChunkName: "import" */ "./components/import/ImportProcess")
// // );
// // const IndexProcess = lazy(() =>
// //   import(/* webpackChunkName: "indexing" */ "./components/index/IndexProcess")
// // );
// // const FlowProcess = lazy(() =>
// //   import(/* webpackChunkName: "flow" */ "./components/Flow/FlowProcess")
// // );
// // const TranslationManager = lazy(() =>
// //   import(/* webpackChunkName: "translation" */ "./i18n/TranslationManager")
// // );
// // // Removed MultiCollectionResults import as it's now handled in SearchContainer

// // // Initial state for app reducer - removed searchHistory
// // const initialAppState = {
// //   darkMode: false,
// //   activeSection: "search",
// //   isMenuOpen: false,
// //   notifications: [],
// // };

// // // Simplified reducer - search history actions removed
// // function appReducer(state, action) {
// //   switch (action.type) {
// //     case "SET_DARK_MODE":
// //       return { ...state, darkMode: action.payload };
// //     case "SET_ACTIVE_SECTION":
// //       return { ...state, activeSection: action.payload, isMenuOpen: false };
// //     case "TOGGLE_MENU":
// //       return { ...state, isMenuOpen: !state.isMenuOpen };
// //     case "CLOSE_MENU":
// //       return { ...state, isMenuOpen: false };
// //     case "ADD_NOTIFICATION":
// //       return {
// //         ...state,
// //         notifications: [
// //           ...state.notifications,
// //           {
// //             id: Date.now(),
// //             ...action.payload,
// //             read: false,
// //           },
// //         ],
// //       };
// //     case "MARK_NOTIFICATION_READ":
// //       return {
// //         ...state,
// //         notifications: state.notifications.map((n) =>
// //           n.id === action.payload ? { ...n, read: true } : n
// //         ),
// //       };
// //     case "CLEAR_ALL_NOTIFICATIONS":
// //       return { ...state, notifications: [] };
// //     default:
// //       return state;
// //   }
// // }

// // // Create theme context for easier theming
// // const ThemeContext = React.createContext({ darkMode: false });

// // export default function App() {
// //   const [appState, dispatch] = useReducer(appReducer, initialAppState);
// //   const { darkMode, activeSection, isMenuOpen, notifications } = appState;
// //   const { t, i18n } = useTranslation();

// //   const [isFirstLoad, setIsFirstLoad] = useState(true);
// //   const [showSplash, setShowSplash] = useState(true); // Add splash screen state
// //   const baseUrl = ApibaseUrl;

// //   // Handler for splash screen completion
// //   const handleSplashFinish = useCallback(() => {
// //     setShowSplash(false);
// //   }, []);

// //   // Optimized fetch translations with error boundaries
// //   useEffect(() => {
// //     const controller = new AbortController();

// //     const doTranslations = async () => {
// //       try {
// //         if (!baseUrl) return;

// //         const res = await axios.get(`${baseUrl}/translations`, {
// //           signal: controller.signal,
// //         });
// //         // Process translations data here
// //       } catch (err) {
// //         if (!axios.isCancel(err)) {
// //           console.error("Translation fetch error:", err);
// //         }
// //       }
// //     };

// //     doTranslations();

// //     return () => controller.abort();
// //   }, [baseUrl, i18n]);

// //   // Initialize dark mode from localStorage with proper error handling
// //   useEffect(() => {
// //     try {
// //       const savedTheme = localStorage.getItem("darkMode");
// //       const prefersDark = window.matchMedia(
// //         "(prefers-color-scheme: dark)"
// //       ).matches;
// //       const initialDarkMode =
// //         savedTheme !== null ? savedTheme === "true" : prefersDark;

// //       dispatch({ type: "SET_DARK_MODE", payload: initialDarkMode });

// //       if (initialDarkMode) {
// //         document.documentElement.classList.add("dark");
// //       } else {
// //         document.documentElement.classList.remove("dark");
// //       }

// //       setIsFirstLoad(false);
// //     } catch (error) {
// //       console.error("Error initializing theme:", error);
// //       // Fallback to light mode
// //       dispatch({ type: "SET_DARK_MODE", payload: false });
// //       document.documentElement.classList.remove("dark");
// //       setIsFirstLoad(false);
// //     }
// //   }, []);

// //   // Keyboard event handler defined with useCallback at the top level
// //   const handleEscKey = useCallback(
// //     (event) => {
// //       if (event.key === "Escape") {
// //         dispatch({ type: "CLOSE_MENU" });
// //       }
// //     },
// //     [dispatch]
// //   );

// //   // Effect to add/remove the event listener
// //   useEffect(() => {
// //     document.addEventListener("keydown", handleEscKey);
// //     return () => document.removeEventListener("keydown", handleEscKey);
// //   }, [handleEscKey]);

// //   // Memoized toggle dark mode function
// //   const toggleDarkMode = useCallback(() => {
// //     const newValue = !darkMode;
// //     dispatch({ type: "SET_DARK_MODE", payload: newValue });

// //     if (newValue) {
// //       document.documentElement.classList.add("dark");
// //     } else {
// //       document.documentElement.classList.remove("dark");
// //     }

// //     try {
// //       localStorage.setItem("darkMode", newValue);
// //     } catch (e) {
// //       console.error("Failed to save dark mode setting:", e);
// //     }
// //   }, [darkMode]);

// //   // Memoized loading spinner to prevent re-renders
// //   const LoadingSpinner = useMemo(
// //     () => (
// //       <div className="flex items-center justify-center min-h-[400px]">
// //         <div className="flex flex-col items-center">
// //           <div
// //             className={`w-12 h-12 border-4 border-t-4 rounded-full animate-spin ${
// //               darkMode
// //                 ? "border-gray-600 border-t-blue-500"
// //                 : "border-gray-200 border-t-blue-600"
// //             }`}
// //           ></div>
// //           <span
// //             className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
// //           >
// //             {t("loading", "جارٍ التحميل...")}
// //           </span>
// //         </div>
// //       </div>
// //     ),
// //     [darkMode, t]
// //   );

// //   // Memoized notifications panel to prevent re-renders
// //   const NotificationsPanel = useMemo(
// //     () => (
// //       <div
// //         className={`
// //       fixed top-16 left-4 w-80 rounded-lg shadow-lg z-50 overflow-hidden
// //       ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
// //       transform transition-transform duration-300
// //     `}
// //       >
// //         <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
// //           <h3 className="font-medium">{t("notifications", "الإشعارات")}</h3>
// //           <button
// //             onClick={() => dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" })}
// //             className="text-sm text-blue-600 dark:text-blue-400"
// //           >
// //             {t("clearAll", "مسح الكل")}
// //           </button>
// //         </div>

// //         <div className="max-h-80 overflow-y-auto">
// //           {notifications.length === 0 ? (
// //             <div className="p-4 text-center text-gray-500 dark:text-gray-400">
// //               {t("noNotifications", "لا توجد إشعارات")}
// //             </div>
// //           ) : (
// //             notifications.map((notification) => (
// //               <div
// //                 key={notification.id}
// //                 className={`
// //                 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0
// //                 ${notification.read ? "" : "bg-blue-50 dark:bg-blue-900/10"}
// //               `}
// //               >
// //                 <div className="flex justify-between">
// //                   <span className="font-medium text-sm">
// //                     {notification.title}
// //                   </span>
// //                   <span className="text-xs text-gray-500 dark:text-gray-400">
// //                     {new Date(notification.time).toLocaleTimeString()}
// //                   </span>
// //                 </div>
// //                 <p className="text-sm mt-1">{notification.message}</p>
// //               </div>
// //             ))
// //           )}
// //         </div>
// //       </div>
// //     ),
// //     [darkMode, notifications, t]
// //   );

// //   // Create theme context value
// //   const themeContextValue = useMemo(
// //     () => ({
// //       darkMode,
// //       toggleDarkMode,
// //     }),
// //     [darkMode, toggleDarkMode]
// //   );

// //   // Conditional class strings
// //   const mainContainerClasses = `min-h-screen flex flex-col transition-colors duration-300 ${
// //     darkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
// //   }`;

// //   const headerClasses = `sticky top-0 z-30 py-3 px-4 shadow-md border-b ${
// //     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
// //   }`;

// //   const sidebarClasses = `
// //     fixed md:sticky top-0 md:top-16 right-0 h-full md:h-[calc(100vh-4rem)]
// //     w-64 z-50 md:z-0 transform transition-transform duration-300
// //     ${isMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
// //   `;

// //   // Footer classes with more explicit width and overflow control
// //   const footerClasses = `py-4 px-6 mt-auto border-t w-full overflow-hidden flex-shrink-0 ${
// //     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
// //   }`;

// //   // If splash screen is showing, only render that
// //   if (showSplash) {
// //     return <SplashScreen onFinish={handleSplashFinish} />;
// //   }

// //   return (
// //     <ThemeContext.Provider value={themeContextValue}>
// //       <div className={mainContainerClasses} dir="rtl">
// //         <ToastContainer
// //           position="top-center"
// //           autoClose={5000}
// //           hideProgressBar={false}
// //           newestOnTop
// //           closeOnClick
// //           rtl
// //           pauseOnFocusLoss
// //           draggable
// //           pauseOnHover
// //           theme={darkMode ? "dark" : "light"}
// //         />

// //         {/* Mobile menu overlay - only render when needed */}
// //         {isMenuOpen && (
// //           <div
// //             className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
// //             onClick={() => dispatch({ type: "CLOSE_MENU" })}
// //           ></div>
// //         )}

// //         {/* Header */}
// //         <header className={headerClasses}>
// //           <div className="container mx-auto flex justify-between items-center">
// //             {/* Left side (right in RTL) - Menu and Logo */}
// //             <div className="flex items-center">
// //               <button
// //                 onClick={() => dispatch({ type: "TOGGLE_MENU" })}
// //                 className={`md:hidden p-2 rounded-md ${
// //                   darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
// //                 }`}
// //                 aria-label={t("toggleMenu", "قائمة التبديل")}
// //               >
// //                 <svg
// //                   xmlns="http://www.w3.org/2000/svg"
// //                   className="h-6 w-6"
// //                   fill="none"
// //                   viewBox="0 0 24 24"
// //                   stroke="currentColor"
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M4 6h16M4 12h16M4 18h16"
// //                   />
// //                 </svg>
// //               </button>

// //               <div className="flex items-center mr-4">
// //                 <div
// //                   className={`w-8 h-8 rounded-md flex items-center justify-center ${
// //                     darkMode ? "bg-blue-600" : "bg-blue-500"
// //                   }`}
// //                 >
// //                   <AppIcon />
// //                 </div>
// //                 <h1 className="text-xl font-bold mr-2">
// //                   {t("appTitle", "إدارة المجموعات والبحث")}
// //                 </h1>
// //               </div>
// //             </div>

// //             {/* Right side (Left in RTL) - Actions */}
// //             <div className="flex items-center">
// //               {/* Dark mode toggle */}
// //               <button
// //                 onClick={toggleDarkMode}
// //                 className={`p-2 rounded-full ${
// //                   darkMode
// //                     ? "bg-gray-700 text-yellow-300"
// //                     : "bg-gray-200 text-gray-700"
// //                 } transition-colors`}
// //                 aria-label={
// //                   darkMode
// //                     ? t("lightMode", "الوضع الفاتح")
// //                     : t("darkMode", "الوضع الداكن")
// //                 }
// //                 title={
// //                   darkMode
// //                     ? t("lightMode", "الوضع الفاتح")
// //                     : t("darkMode", "الوضع الداكن")
// //                 }
// //               >
// //                 {darkMode ? (
// //                   <svg
// //                     xmlns="http://www.w3.org/2000/svg"
// //                     className="h-5 w-5"
// //                     viewBox="0 0 20 20"
// //                     fill="currentColor"
// //                   >
// //                     <path
// //                       fillRule="evenodd"
// //                       d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
// //                       clipRule="evenodd"
// //                     />
// //                   </svg>
// //                 ) : (
// //                   <svg
// //                     xmlns="http://www.w3.org/2000/svg"
// //                     className="h-5 w-5"
// //                     viewBox="0 0 20 20"
// //                     fill="currentColor"
// //                   >
// //                     <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
// //                   </svg>
// //                 )}
// //               </button>

// //               {/* Notifications */}
// //               <div className="relative mr-2">
// //                 <button
// //                   className={`p-2 rounded-full ${
// //                     darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
// //                   }`}
// //                   aria-label={t("notifications", "الإشعارات")}
// //                   title={t("notifications", "الإشعارات")}
// //                 >
// //                   <svg
// //                     xmlns="http://www.w3.org/2000/svg"
// //                     className="h-5 w-5"
// //                     viewBox="0 0 20 20"
// //                     fill="currentColor"
// //                   >
// //                     <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
// //                   </svg>
// //                 </button>
// //                 {notifications.filter((n) => !n.read).length > 0 && (
// //                   <span className="absolute top-1 left-1 h-2 w-2 bg-red-500 rounded-full"></span>
// //                 )}
// //               </div>

// //               {/* User profile */}
// //               <div className="mr-2">
// //                 <button
// //                   className={`p-1 rounded-full border-2 ${
// //                     darkMode
// //                       ? "border-gray-600 hover:border-gray-500"
// //                       : "border-gray-300 hover:border-gray-400"
// //                   }`}
// //                   aria-label={t("userProfile", "الملف الشخصي")}
// //                   title={t("userProfile", "الملف الشخصي")}
// //                 >
// //                   <span className="sr-only">
// //                     {t("profile", "الملف الشخصي")}
// //                   </span>
// //                   <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
// //                 </button>
// //               </div>
// //             </div>
// //           </div>
// //         </header>

// //         {/* Main content */}
// //         <div className="flex flex-1 relative">
// //           {/* Sidebar */}
// //           <div className={sidebarClasses}>
// //             <Sidebar
// //               activeSection={activeSection}
// //               setActiveSection={(section) =>
// //                 dispatch({ type: "SET_ACTIVE_SECTION", payload: section })
// //               }
// //               darkMode={darkMode}
// //               isMobileOpen={isMenuOpen}
// //               closeMobileMenu={() => dispatch({ type: "CLOSE_MENU" })}
// //             />
// //           </div>

// //           {/* Main content area */}
// //           <main className="flex-1 p-4 md:p-6">
// //             {/* Active section content with conditional rendering */}
// //             {activeSection === "search" && (
// //               <SearchContainer baseUrl={baseUrl} darkMode={darkMode} />
// //             )}

// //             {activeSection === "create-collection" && (
// //               <Suspense fallback={LoadingSpinner}>
// //                 <FlowProcess darkMode={darkMode} />
// //               </Suspense>
// //             )}

// //             {activeSection === "add-data" && (
// //               <Suspense fallback={LoadingSpinner}>
// //                 <AddDataToCollection darkMode={darkMode} />
// //               </Suspense>
// //             )}

// //             {activeSection === "indexing" && (
// //               <Suspense fallback={LoadingSpinner}>
// //                 <IndexProcess darkMode={darkMode} />
// //               </Suspense>
// //             )}

// //             {activeSection === "import" && (
// //               <Suspense fallback={LoadingSpinner}>
// //                 <ImportProcess darkMode={darkMode} />
// //               </Suspense>
// //             )}

// //             {activeSection === "translate" && (
// //               <Suspense fallback={LoadingSpinner}>
// //                 <TranslationManager darkMode={darkMode} />
// //               </Suspense>
// //             )}
// //           </main>
// //         </div>

// //         {/* Footer */}
// //         <footer className={footerClasses}>
// //           <div className="container mx-auto flex flex-wrap justify-between items-center text-sm">
// //             <div className={darkMode ? "text-gray-400" : "text-gray-600"}>
// //               {t("copyright", "© 2025 جميع الحقوق محفوظة")}
// //             </div>

// //             <div
// //               className={`flex space-x-4 rtl:space-x-reverse ${
// //                 darkMode ? "text-gray-400" : "text-gray-600"
// //               }`}
// //             >
// //               <a href="#" className="hover:underline">
// //                 {t("terms", "شروط الاستخدام")}
// //               </a>
// //               <a href="#" className="hover:underline">
// //                 {t("privacy", "سياسة الخصوصية")}
// //               </a>
// //               <a href="#" className="hover:underline">
// //                 {t("help", "المساعدة")}
// //               </a>
// //             </div>
// //           </div>
// //         </footer>
// //       </div>
// //     </ThemeContext.Provider>
// //   );
// // }

// // ===================================================================================================================

// import React, {
//   useEffect,
//   useReducer,
//   useState,
//   Suspense,
//   lazy,
//   useMemo,
//   useCallback,
// } from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import axios from "axios";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import ApibaseUrl from "./ApibaseUrl";
// import Sidebar from "./components/Sidebar";
// import { useTranslation } from "react-i18next";

// import SplashScreen from "./components/SplashScreen";
// import AppIcon from "./components/AppIcon";

// // Import the new SearchContainer component
// import SearchContainer from "./components/Search/SearchContainer";

// // Lazy load components with named chunks for better code splitting
// const AddDataToCollection = lazy(() =>
//   import(/* webpackChunkName: "add-data" */ "./components/AddDataToCollection")
// );
// const ImportProcess = lazy(() =>
//   import(/* webpackChunkName: "import" */ "./components/import/ImportProcess")
// );
// const IndexProcess = lazy(() =>
//   import(/* webpackChunkName: "indexing" */ "./components/index/IndexProcess")
// );
// const FlowProcess = lazy(() =>
//   import(/* webpackChunkName: "flow" */ "./components/Flow/FlowProcess")
// );
// const TranslationManager = lazy(() =>
//   import(/* webpackChunkName: "translation" */ "./i18n/TranslationManager")
// );

// // Initial state for app reducer - removed activeSection as it's now handled by router
// const initialAppState = {
//   darkMode: false,
//   isMenuOpen: false,
//   notifications: [],
// };

// // Updated reducer - removed SET_ACTIVE_SECTION
// function appReducer(state, action) {
//   switch (action.type) {
//     case "SET_DARK_MODE":
//       return { ...state, darkMode: action.payload };
//     case "TOGGLE_MENU":
//       return { ...state, isMenuOpen: !state.isMenuOpen };
//     case "CLOSE_MENU":
//       return { ...state, isMenuOpen: false };
//     case "ADD_NOTIFICATION":
//       return {
//         ...state,
//         notifications: [
//           ...state.notifications,
//           {
//             id: Date.now(),
//             ...action.payload,
//             read: false,
//           },
//         ],
//       };
//     case "MARK_NOTIFICATION_READ":
//       return {
//         ...state,
//         notifications: state.notifications.map((n) =>
//           n.id === action.payload ? { ...n, read: true } : n
//         ),
//       };
//     case "CLEAR_ALL_NOTIFICATIONS":
//       return { ...state, notifications: [] };
//     default:
//       return state;
//   }
// }

// // Create theme context for easier theming
// const ThemeContext = React.createContext({ darkMode: false });

// export default function App() {
//   const [appState, dispatch] = useReducer(appReducer, initialAppState);
//   const { darkMode, isMenuOpen, notifications } = appState;
//   const { t, i18n } = useTranslation();

//   const [isFirstLoad, setIsFirstLoad] = useState(true);
//   const [showSplash, setShowSplash] = useState(true); // Add splash screen state
//   const baseUrl = ApibaseUrl;

//   // Handler for splash screen completion
//   const handleSplashFinish = useCallback(() => {
//     setShowSplash(false);
//   }, []);

//   // Optimized fetch translations with error boundaries
//   useEffect(() => {
//     const controller = new AbortController();

//     const doTranslations = async () => {
//       try {
//         if (!baseUrl) return;

//         const res = await axios.get(`${baseUrl}/translations`, {
//           signal: controller.signal,
//         });
//         // Process translations data here
//       } catch (err) {
//         if (!axios.isCancel(err)) {
//           console.error("Translation fetch error:", err);
//         }
//       }
//     };

//     doTranslations();

//     return () => controller.abort();
//   }, [baseUrl, i18n]);

//   // Initialize dark mode from localStorage with proper error handling
//   useEffect(() => {
//     try {
//       const savedTheme = localStorage.getItem("darkMode");
//       const prefersDark = window.matchMedia(
//         "(prefers-color-scheme: dark)"
//       ).matches;
//       const initialDarkMode =
//         savedTheme !== null ? savedTheme === "true" : prefersDark;

//       dispatch({ type: "SET_DARK_MODE", payload: initialDarkMode });

//       if (initialDarkMode) {
//         document.documentElement.classList.add("dark");
//       } else {
//         document.documentElement.classList.remove("dark");
//       }

//       setIsFirstLoad(false);
//     } catch (error) {
//       console.error("Error initializing theme:", error);
//       // Fallback to light mode
//       dispatch({ type: "SET_DARK_MODE", payload: false });
//       document.documentElement.classList.remove("dark");
//       setIsFirstLoad(false);
//     }
//   }, []);

//   // Keyboard event handler defined with useCallback at the top level
//   const handleEscKey = useCallback(
//     (event) => {
//       if (event.key === "Escape") {
//         dispatch({ type: "CLOSE_MENU" });
//       }
//     },
//     [dispatch]
//   );

//   // Effect to add/remove the event listener
//   useEffect(() => {
//     document.addEventListener("keydown", handleEscKey);
//     return () => document.removeEventListener("keydown", handleEscKey);
//   }, [handleEscKey]);

//   // Memoized toggle dark mode function
//   const toggleDarkMode = useCallback(() => {
//     const newValue = !darkMode;
//     dispatch({ type: "SET_DARK_MODE", payload: newValue });

//     if (newValue) {
//       document.documentElement.classList.add("dark");
//     } else {
//       document.documentElement.classList.remove("dark");
//     }

//     try {
//       localStorage.setItem("darkMode", newValue);
//     } catch (e) {
//       console.error("Failed to save dark mode setting:", e);
//     }
//   }, [darkMode]);

//   // Memoized loading spinner to prevent re-renders
//   const LoadingSpinner = useMemo(
//     () => (
//       <div className="flex items-center justify-center min-h-[400px]">
//         <div className="flex flex-col items-center">
//           <div
//             className={`w-12 h-12 border-4 border-t-4 rounded-full animate-spin ${
//               darkMode
//                 ? "border-gray-600 border-t-blue-500"
//                 : "border-gray-200 border-t-blue-600"
//             }`}
//           ></div>
//           <span
//             className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
//           >
//             {t("loading", "جارٍ التحميل...")}
//           </span>
//         </div>
//       </div>
//     ),
//     [darkMode, t]
//   );

//   // Memoized notifications panel to prevent re-renders
//   const NotificationsPanel = useMemo(
//     () => (
//       <div
//         className={`
//       fixed top-16 left-4 w-80 rounded-lg shadow-lg z-50 overflow-hidden
//       ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
//       transform transition-transform duration-300
//     `}
//       >
//         <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
//           <h3 className="font-medium">{t("notifications", "الإشعارات")}</h3>
//           <button
//             onClick={() => dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" })}
//             className="text-sm text-blue-600 dark:text-blue-400"
//           >
//             {t("clearAll", "مسح الكل")}
//           </button>
//         </div>

//         <div className="max-h-80 overflow-y-auto">
//           {notifications.length === 0 ? (
//             <div className="p-4 text-center text-gray-500 dark:text-gray-400">
//               {t("noNotifications", "لا توجد إشعارات")}
//             </div>
//           ) : (
//             notifications.map((notification) => (
//               <div
//                 key={notification.id}
//                 className={`
//                 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0
//                 ${notification.read ? "" : "bg-blue-50 dark:bg-blue-900/10"}
//               `}
//               >
//                 <div className="flex justify-between">
//                   <span className="font-medium text-sm">
//                     {notification.title}
//                   </span>
//                   <span className="text-xs text-gray-500 dark:text-gray-400">
//                     {new Date(notification.time).toLocaleTimeString()}
//                   </span>
//                 </div>
//                 <p className="text-sm mt-1">{notification.message}</p>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     ),
//     [darkMode, notifications, t]
//   );

//   // Create theme context value
//   const themeContextValue = useMemo(
//     () => ({
//       darkMode,
//       toggleDarkMode,
//     }),
//     [darkMode, toggleDarkMode]
//   );

//   // Conditional class strings
//   const mainContainerClasses = `min-h-screen flex flex-col transition-colors duration-300 ${
//     darkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
//   }`;

//   const headerClasses = `sticky top-0 z-30 py-3 px-4 shadow-md border-b ${
//     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
//   }`;

//   const sidebarClasses = `
//     fixed md:sticky top-0 md:top-16 right-0 h-full md:h-[calc(100vh-4rem)]
//     w-64 z-50 md:z-0 transform transition-transform duration-300
//     ${isMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
//   `;

//   // Footer classes with more explicit width and overflow control
//   const footerClasses = `py-4 px-6 mt-auto border-t w-full overflow-hidden flex-shrink-0 ${
//     darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
//   }`;

//   // If splash screen is showing, only render that
//   if (showSplash) {
//     return <SplashScreen onFinish={handleSplashFinish} />;
//   }

//   return (
//     <ThemeContext.Provider value={themeContextValue}>
//       <BrowserRouter>
//         <div className={mainContainerClasses} dir="rtl">
//           <ToastContainer
//             position="top-center"
//             autoClose={5000}
//             hideProgressBar={false}
//             newestOnTop
//             closeOnClick
//             rtl
//             pauseOnFocusLoss
//             draggable
//             pauseOnHover
//             theme={darkMode ? "dark" : "light"}
//           />

//           {/* Mobile menu overlay - only render when needed */}
//           {isMenuOpen && (
//             <div
//               className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
//               onClick={() => dispatch({ type: "CLOSE_MENU" })}
//             ></div>
//           )}

//           {/* Header */}
//           <header className={headerClasses}>
//             <div className="container mx-auto flex justify-between items-center">
//               {/* Left side (right in RTL) - Menu and Logo */}
//               <div className="flex items-center">
//                 <button
//                   onClick={() => dispatch({ type: "TOGGLE_MENU" })}
//                   className={`md:hidden p-2 rounded-md ${
//                     darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
//                   }`}
//                   aria-label={t("toggleMenu", "قائمة التبديل")}
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M4 6h16M4 12h16M4 18h16"
//                     />
//                   </svg>
//                 </button>

//                 <div className="flex items-center mr-4">
//                   <div
//                     className={`w-8 h-8 rounded-md flex items-center justify-center ${
//                       darkMode ? "bg-blue-600" : "bg-blue-500"
//                     }`}
//                   >
//                     <AppIcon />
//                   </div>
//                   <h1 className="text-xl font-bold mr-2">
//                     {t("appTitle", "إدارة المجموعات والبحث")}
//                   </h1>
//                 </div>
//               </div>

//               {/* Right side (Left in RTL) - Actions */}
//               <div className="flex items-center">
//                 {/* Dark mode toggle */}
//                 <button
//                   onClick={toggleDarkMode}
//                   className={`p-2 rounded-full ${
//                     darkMode
//                       ? "bg-gray-700 text-yellow-300"
//                       : "bg-gray-200 text-gray-700"
//                   } transition-colors`}
//                   aria-label={
//                     darkMode
//                       ? t("lightMode", "الوضع الفاتح")
//                       : t("darkMode", "الوضع الداكن")
//                   }
//                   title={
//                     darkMode
//                       ? t("lightMode", "الوضع الفاتح")
//                       : t("darkMode", "الوضع الداكن")
//                   }
//                 >
//                   {darkMode ? (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   ) : (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
//                     </svg>
//                   )}
//                 </button>

//                 {/* Notifications */}
//                 <div className="relative mr-2">
//                   <button
//                     className={`p-2 rounded-full ${
//                       darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
//                     }`}
//                     aria-label={t("notifications", "الإشعارات")}
//                     title={t("notifications", "الإشعارات")}
//                   >
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
//                     </svg>
//                   </button>
//                   {notifications.filter((n) => !n.read).length > 0 && (
//                     <span className="absolute top-1 left-1 h-2 w-2 bg-red-500 rounded-full"></span>
//                   )}
//                 </div>

//                 {/* User profile */}
//                 <div className="mr-2">
//                   <button
//                     className={`p-1 rounded-full border-2 ${
//                       darkMode
//                         ? "border-gray-600 hover:border-gray-500"
//                         : "border-gray-300 hover:border-gray-400"
//                     }`}
//                     aria-label={t("userProfile", "الملف الشخصي")}
//                     title={t("userProfile", "الملف الشخصي")}
//                   >
//                     <span className="sr-only">
//                       {t("profile", "الملف الشخصي")}
//                     </span>
//                     <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </header>

//           {/* Main content */}
//           <div className="flex flex-1 relative">
//             {/* Sidebar */}
//             <div className={sidebarClasses}>
//               <Sidebar
//                 darkMode={darkMode}
//                 isMobileOpen={isMenuOpen}
//                 closeMobileMenu={() => dispatch({ type: "CLOSE_MENU" })}
//               />
//             </div>

//             {/* Main content area */}
//             <main className="flex-1 p-4 md:p-6">
//               <Routes>
//                 <Route path="/" element={<Navigate to="/search" replace />} />
//                 <Route
//                   path="/search"
//                   element={
//                     <SearchContainer baseUrl={baseUrl} darkMode={darkMode} />
//                   }
//                 />
//                 <Route
//                   path="/create-collection"
//                   element={
//                     <Suspense fallback={LoadingSpinner}>
//                       <FlowProcess darkMode={darkMode} />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="/add-data"
//                   element={
//                     <Suspense fallback={LoadingSpinner}>
//                       <AddDataToCollection darkMode={darkMode} />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="/indexing"
//                   element={
//                     <Suspense fallback={LoadingSpinner}>
//                       <IndexProcess darkMode={darkMode} />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="/import"
//                   element={
//                     <Suspense fallback={LoadingSpinner}>
//                       <ImportProcess darkMode={darkMode} />
//                     </Suspense>
//                   }
//                 />
//                 <Route
//                   path="/translate"
//                   element={
//                     <Suspense fallback={LoadingSpinner}>
//                       <TranslationManager darkMode={darkMode} />
//                     </Suspense>
//                   }
//                 />
//                 <Route path="*" element={<Navigate to="/search" replace />} />
//               </Routes>
//             </main>
//           </div>

//           {/* Footer */}
//           <footer className={footerClasses}>
//             <div className="container mx-auto flex flex-wrap justify-between items-center text-sm">
//               <div className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                 {t("copyright", "© 2025 جميع الحقوق محفوظة")}
//               </div>

//               <div
//                 className={`flex space-x-4 rtl:space-x-reverse ${
//                   darkMode ? "text-gray-400" : "text-gray-600"
//                 }`}
//               >
//                 <a href="#" className="hover:underline">
//                   {t("terms", "شروط الاستخدام")}
//                 </a>
//                 <a href="#" className="hover:underline">
//                   {t("privacy", "سياسة الخصوصية")}
//                 </a>
//                 <a href="#" className="hover:underline">
//                   {t("help", "المساعدة")}
//                 </a>
//               </div>
//             </div>
//           </footer>
//         </div>
//       </BrowserRouter>
//     </ThemeContext.Provider>
//   );
// }

// ===================================================================================================================

import React, {
  useEffect,
  useReducer,
  useState,
  Suspense,
  lazy,
  useMemo,
  useCallback,
} from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ApibaseUrl from "./ApibaseUrl";
import Sidebar from "./components/Sidebar";
import { useTranslation } from "react-i18next";

import SplashScreen from "./components/SplashScreen";
import AppIcon from "./components/AppIcon";

// Import the new SearchContainer component
import SearchContainer from "./components/Search/SearchContainer";

// Lazy load components with named chunks for better code splitting
const AddDataToCollection = lazy(() =>
  import(/* webpackChunkName: "add-data" */ "./components/AddDataToCollection")
);
const ImportProcess = lazy(() =>
  import(/* webpackChunkName: "import" */ "./components/import/ImportProcess")
);
const IndexProcess = lazy(() =>
  import(/* webpackChunkName: "indexing" */ "./components/index/IndexProcess")
);
const FlowProcess = lazy(() =>
  import(/* webpackChunkName: "flow" */ "./components/Flow/FlowProcess")
);
const TranslationManager = lazy(() =>
  import(/* webpackChunkName: "translation" */ "./i18n/TranslationManager")
);

// Initial state for app reducer - removed activeSection as it's now handled by router
const initialAppState = {
  darkMode: false,
  isMenuOpen: false,
  notifications: [],
};

// Updated reducer - removed SET_ACTIVE_SECTION
function appReducer(state, action) {
  switch (action.type) {
    case "SET_DARK_MODE":
      return { ...state, darkMode: action.payload };
    case "TOGGLE_MENU":
      return { ...state, isMenuOpen: !state.isMenuOpen };
    case "CLOSE_MENU":
      return { ...state, isMenuOpen: false };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            ...action.payload,
            read: false,
          },
        ],
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case "CLEAR_ALL_NOTIFICATIONS":
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

// Create theme context for easier theming
const ThemeContext = React.createContext({ darkMode: false });

export default function App() {
  const [appState, dispatch] = useReducer(appReducer, initialAppState);
  const { darkMode, isMenuOpen, notifications } = appState;
  const { t, i18n } = useTranslation();

  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showSplash, setShowSplash] = useState(true); // Add splash screen state
  const baseUrl = ApibaseUrl;

  // Handler for splash screen completion
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Optimized fetch translations with error boundaries
  useEffect(() => {
    const controller = new AbortController();

    const doTranslations = async () => {
      try {
        if (!baseUrl) return;

        const res = await axios.get(`${baseUrl}/translations`, {
          signal: controller.signal,
        });
        // Process translations data here
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Translation fetch error:", err);
        }
      }
    };

    doTranslations();

    return () => controller.abort();
  }, [baseUrl, i18n]);

  // Initialize dark mode from localStorage with proper error handling
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("darkMode");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialDarkMode =
        savedTheme !== null ? savedTheme === "true" : prefersDark;

      dispatch({ type: "SET_DARK_MODE", payload: initialDarkMode });

      if (initialDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      setIsFirstLoad(false);
    } catch (error) {
      console.error("Error initializing theme:", error);
      // Fallback to light mode
      dispatch({ type: "SET_DARK_MODE", payload: false });
      document.documentElement.classList.remove("dark");
      setIsFirstLoad(false);
    }
  }, []);

  // Keyboard event handler defined with useCallback at the top level
  const handleEscKey = useCallback(
    (event) => {
      if (event.key === "Escape") {
        dispatch({ type: "CLOSE_MENU" });
      }
    },
    [dispatch]
  );

  // Effect to add/remove the event listener
  useEffect(() => {
    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [handleEscKey]);

  // Memoized toggle dark mode function
  const toggleDarkMode = useCallback(() => {
    const newValue = !darkMode;
    dispatch({ type: "SET_DARK_MODE", payload: newValue });

    if (newValue) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      localStorage.setItem("darkMode", newValue);
    } catch (e) {
      console.error("Failed to save dark mode setting:", e);
    }
  }, [darkMode]);

  // Memoized loading spinner to prevent re-renders
  const LoadingSpinner = useMemo(
    () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div
            className={`w-12 h-12 border-4 border-t-4 rounded-full animate-spin ${
              darkMode
                ? "border-gray-600 border-t-blue-500"
                : "border-gray-200 border-t-blue-600"
            }`}
          ></div>
          <span
            className={`mt-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {t("loading", "جارٍ التحميل...")}
          </span>
        </div>
      </div>
    ),
    [darkMode, t]
  );

  // Memoized notifications panel to prevent re-renders
  const NotificationsPanel = useMemo(
    () => (
      <div
        className={`
      fixed top-16 left-4 w-80 rounded-lg shadow-lg z-50 overflow-hidden
      ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"}
      transform transition-transform duration-300
    `}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-medium">{t("notifications", "الإشعارات")}</h3>
          <button
            onClick={() => dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" })}
            className="text-sm text-blue-600 dark:text-blue-400"
          >
            {t("clearAll", "مسح الكل")}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {t("noNotifications", "لا توجد إشعارات")}
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0
                ${notification.read ? "" : "bg-blue-50 dark:bg-blue-900/10"}
              `}
              >
                <div className="flex justify-between">
                  <span className="font-medium text-sm">
                    {notification.title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(notification.time).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{notification.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    [darkMode, notifications, t]
  );

  // Create theme context value
  const themeContextValue = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
    }),
    [darkMode, toggleDarkMode]
  );

  // Conditional class strings
  const mainContainerClasses = `min-h-screen flex flex-col transition-colors duration-300 ${
    darkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
  }`;

  const headerClasses = `sticky top-0 z-30 py-3 px-4 shadow-md border-b ${
    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
  }`;

  const sidebarClasses = `
    fixed md:sticky top-0 md:top-16 right-0 h-full md:h-[calc(100vh-4rem)]
    w-64 z-50 md:z-0 transform transition-transform duration-300
    ${isMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
  `;

  // Footer classes with more explicit width and overflow control
  const footerClasses = `py-4 px-6 mt-auto border-t w-full overflow-hidden flex-shrink-0 ${
    darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
  }`;

  // If splash screen is showing, only render that
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <HashRouter>
        <div className={mainContainerClasses} dir="rtl">
          <ToastContainer
            position="top-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={darkMode ? "dark" : "light"}
          />

          {/* Mobile menu overlay - only render when needed */}
          {isMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
              onClick={() => dispatch({ type: "CLOSE_MENU" })}
            ></div>
          )}

          {/* Header */}
          <header className={headerClasses}>
            <div className="container mx-auto flex justify-between items-center">
              {/* Left side (right in RTL) - Menu and Logo */}
              <div className="flex items-center">
                <button
                  onClick={() => dispatch({ type: "TOGGLE_MENU" })}
                  className={`md:hidden p-2 rounded-md ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                  aria-label={t("toggleMenu", "قائمة التبديل")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                <div className="flex items-center mr-4">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      darkMode ? "bg-blue-600" : "bg-blue-500"
                    }`}
                  >
                    <AppIcon />
                  </div>
                  <h1 className="text-xl font-bold mr-2">
                    {t("appTitle", "إدارة المجموعات والبحث")}
                  </h1>
                </div>
              </div>

              {/* Right side (Left in RTL) - Actions */}
              <div className="flex items-center">
                {/* Dark mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full ${
                    darkMode
                      ? "bg-gray-700 text-yellow-300"
                      : "bg-gray-200 text-gray-700"
                  } transition-colors`}
                  aria-label={
                    darkMode
                      ? t("lightMode", "الوضع الفاتح")
                      : t("darkMode", "الوضع الداكن")
                  }
                  title={
                    darkMode
                      ? t("lightMode", "الوضع الفاتح")
                      : t("darkMode", "الوضع الداكن")
                  }
                >
                  {darkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

                {/* Notifications */}
                <div className="relative mr-2">
                  <button
                    className={`p-2 rounded-full ${
                      darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                    aria-label={t("notifications", "الإشعارات")}
                    title={t("notifications", "الإشعارات")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute top-1 left-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </div>

                {/* User profile */}
                <div className="mr-2">
                  <button
                    className={`p-1 rounded-full border-2 ${
                      darkMode
                        ? "border-gray-600 hover:border-gray-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    aria-label={t("userProfile", "الملف الشخصي")}
                    title={t("userProfile", "الملف الشخصي")}
                  >
                    <span className="sr-only">
                      {t("profile", "الملف الشخصي")}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <div className="flex flex-1 relative">
            {/* Sidebar */}
            <div className={sidebarClasses}>
              <Sidebar
                darkMode={darkMode}
                isMobileOpen={isMenuOpen}
                closeMobileMenu={() => dispatch({ type: "CLOSE_MENU" })}
              />
            </div>

            {/* Main content area */}
            <main className="flex-1 p-4 md:p-6">
              <Routes>
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route
                  path="/search"
                  element={
                    <SearchContainer baseUrl={baseUrl} darkMode={darkMode} />
                  }
                />
                <Route
                  path="/create-collection"
                  element={
                    <Suspense fallback={LoadingSpinner}>
                      <FlowProcess darkMode={darkMode} />
                    </Suspense>
                  }
                />
                <Route
                  path="/add-data"
                  element={
                    <Suspense fallback={LoadingSpinner}>
                      <AddDataToCollection darkMode={darkMode} />
                    </Suspense>
                  }
                />
                <Route
                  path="/indexing"
                  element={
                    <Suspense fallback={LoadingSpinner}>
                      <IndexProcess darkMode={darkMode} />
                    </Suspense>
                  }
                />
                <Route
                  path="/import"
                  element={
                    <Suspense fallback={LoadingSpinner}>
                      <ImportProcess darkMode={darkMode} />
                    </Suspense>
                  }
                />
                <Route
                  path="/translate"
                  element={
                    <Suspense fallback={LoadingSpinner}>
                      <TranslationManager darkMode={darkMode} />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/search" replace />} />
              </Routes>
            </main>
          </div>

          {/* Footer */}
          <footer className={footerClasses}>
            <div className="container mx-auto flex flex-wrap justify-between items-center text-sm">
              <div className={darkMode ? "text-gray-400" : "text-gray-600"}>
                {t("copyright", "© 2025 جميع الحقوق محفوظة")}
              </div>

              <div
                className={`flex space-x-4 rtl:space-x-reverse ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <a href="#" className="hover:underline">
                  {t("terms", "شروط الاستخدام")}
                </a>
                <a href="#" className="hover:underline">
                  {t("privacy", "سياسة الخصوصية")}
                </a>
                <a href="#" className="hover:underline">
                  {t("help", "المساعدة")}
                </a>
              </div>
            </div>
          </footer>
        </div>
      </HashRouter>
    </ThemeContext.Provider>
  );
}
