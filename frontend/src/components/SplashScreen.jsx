import React, { useEffect } from "react";
import appLogo from "../assets/man-face-icon.png"; // Replace with your actual logo path

const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    // Show splash screen for 2.5 seconds then call the onFinish callback
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    // Clean up timer if component unmounts
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 z-50">
      <div className="text-center">
        <div className="w-48 h-48 bg-white rounded-xl shadow-lg flex items-center justify-center mx-auto mb-8">
          <img
            src={appLogo}
            alt="App Logo"
            className="w-32 h-32 animate-pulse"
            onError={(e) => {
              // Fallback to SVG if image fails to load
              e.target.style.display = "none";
              e.target.parentNode.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
              `;
            }}
          />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          إدارة المجموعات والبحث
        </h1>
        <div className="mt-6">
          <div className="w-12 h-1 bg-blue-200 rounded-full mx-auto mb-1 animate-pulse"></div>
          <div className="w-8 h-1 bg-blue-200 rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
