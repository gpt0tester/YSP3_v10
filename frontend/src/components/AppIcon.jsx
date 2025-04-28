import React from "react";
import appIcon from "../assets/man-face-icon.png"; // Replace with your actual icon path

const AppIcon = ({ className = "" }) => {
  return (
    <div
      className={`w-8 h-8 rounded-md flex items-center justify-center ${className}`}
      style={{ backgroundColor: "#1a73e8" }}
    >
      <img
        src={appIcon}
        alt="App Icon"
        className="w-5 h-5"
        onError={(e) => {
          // Fallback to SVG if image fails to load
          e.target.style.display = "none";
          e.target.parentNode.innerHTML = `
            <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                  </svg>
          `;
        }}
      />
    </div>
  );
};

export default AppIcon;
