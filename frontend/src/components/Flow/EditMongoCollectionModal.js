// EditCollectionModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default function EditCollectionModal({
  isOpen,
  onClose,
  collection, // The collection object to edit
  baseUrl,
  darkMode,
  onSaveSuccess, // callback after a successful PUT
}) {
  const [localCollection, setLocalCollection] = useState(null);

  // Whenever 'collection' changes, copy it into local state
  useEffect(() => {
    if (collection) {
      setLocalCollection({ ...collection });
    } else {
      setLocalCollection(null);
    }
  }, [collection]);

  if (!localCollection) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-4">Loading...</div>
      </Modal>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLocalCollection((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // Assume your route is PUT /collections/:id or similar
      // Possibly including fields like numShards, replicationFactor, etc.
      const { _id } = localCollection;
      await axios.put(`${baseUrl}/collections/${_id}`, localCollection);

      if (onSaveSuccess) onSaveSuccess(localCollection);
      if (onClose) onClose();
    } catch (error) {
      console.error("Error updating collection:", error);
      alert("Failed to update collection");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        className={`p-4 ${
          darkMode
            ? "dark:text-gray-100 dark:bg-gray-800"
            : "bg-white text-gray-800"
        }`}
      >
        <h2 className="text-xl font-bold mb-4">
          Edit Collection: {localCollection.collectionName}
        </h2>

        {/* Example fields:
            collectionName: read-only? 
            displayName: editable
            configSetName, etc. 
        */}
        <div className="mb-2">
          <label className="block">Collection Name (internal):</label>
          <input
            type="text"
            name="collectionName"
            value={localCollection.collectionName || ""}
            onChange={handleInputChange}
            readOnly // typically we don't allow changing the actual name
            className={`w-full px-4 py-2 border rounded-lg ${
              darkMode
                ? "dark:text-gray-100 dark:bg-gray-700 dark:border-gray-700"
                : "text-gray-800 bg-gray-100 border-gray-300"
            }`}
          />
        </div>

        <div className="mb-2">
          <label className="block">Display Name:</label>
          <input
            type="text"
            name="displayName"
            value={localCollection.displayName || ""}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg ${
              darkMode
                ? "dark:text-gray-100 dark:bg-gray-700 dark:border-gray-700"
                : "text-gray-800 bg-gray-100 border-gray-300"
            }`}
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
