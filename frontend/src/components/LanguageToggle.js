// // import React from "react";
// // import { useTranslation } from "react-i18next";

// // function LanguageToggle() {
// //   const { i18n } = useTranslation();

// //   const toggleLanguage = () => {
// //     // Decide the next language:
// //     const newLang = i18n.language === "en" ? "ar" : "en";

// //     // Change the language in i18next
// //     i18n.changeLanguage(newLang);

// //     // Also set the direction on the <html> element
// //     const html = document.documentElement;
// //     if (newLang === "ar") {
// //       html.setAttribute("dir", "rtl");
// //     } else {
// //       html.setAttribute("dir", "ltr");
// //     }
// //   };

// //   return (
// //     <button onClick={toggleLanguage}>
// //       {i18n.language === "en" ? "Switch to Arabic" : "Switch to English"}
// //     </button>
// //   );
// // }

// // export default LanguageToggle;

// // ========================================================================

// // LanguageToggle.js

// import React, { useEffect } from "react";
// import { useTranslation } from "react-i18next";

// function LanguageToggle() {
//   const { i18n } = useTranslation();

//   // Whenever language changes, update the <html dir="rtl" or "ltr">
//   useEffect(() => {
//     document.documentElement.setAttribute(
//       "dir",
//       i18n.language === "ar" ? "rtl" : "ltr"
//     );
//   }, [i18n.language]);

//   const toggleLanguage = () => {
//     // If we are in English, switch to Arabic, else switch to English
//     const newLang = i18n.language === "en" ? "ar" : "en";
//     i18n.changeLanguage(newLang);
//   };

//   return (
//     <button onClick={toggleLanguage}>
//       {i18n.language === "en" ? "Switch to Arabic" : "Switch to English"}
//     </button>
//   );
// }

// export default LanguageToggle;
