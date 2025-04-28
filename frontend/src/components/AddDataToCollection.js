import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import PredefinedCollection from "./predefinedCollection";
import ApibaseUrl from "../ApibaseUrl";

const AddDataToCollection = ({ darkMode }) => {
  const baseUrl = ApibaseUrl;

  const [selectedCollection, setSelectedCollection] = useState("");
  const [collectionMetadata, setCollectionMetadata] = useState(null);
  const [formData, setFormData] = useState({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [errorMetadata, setErrorMetadata] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to initialize form data based on collection fields
  const initializeFormData = (fields) => {
    return fields.reduce((acc, field) => {
      acc[field.fieldName] = "";
      return acc;
    }, {});
  };

  useEffect(() => {
    if (selectedCollection) {
      const fetchCollectionMetadata = async () => {
        setLoadingMetadata(true);
        setErrorMetadata(null);
        try {
          if (!baseUrl) {
            throw new Error("لم يتم تعريف عنوان API الأساسي.");
          }
          const response = await axios.get(
            `${baseUrl}/collections/${selectedCollection}`
          );
          setCollectionMetadata(response.data);
          setFormData(initializeFormData(response.data.fields));
        } catch (error) {
          console.error("خطأ في جلب بيانات المجموعة:", error);
          setErrorMetadata("تعذر جلب بيانات المجموعة. يرجى المحاولة مرة أخرى.");
          toast.error("تعذر جلب بيانات المجموعة. يرجى المحاولة مرة أخرى.");
        } finally {
          setLoadingMetadata(false);
        }
      };
      fetchCollectionMetadata();
    } else {
      setCollectionMetadata(null);
      setFormData({});
    }
  }, [selectedCollection]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateFormData = () => {
    // Implement any additional validation logic here
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!baseUrl) {
        throw new Error("لم يتم تعريف عنوان API الأساسي.");
      }

      const response = await axios.post(
        `${baseUrl}/collections/${selectedCollection}/add`,
        formData
      );

      if (response.status === 201) {
        toast.success("تم إضافة البيانات بنجاح!");
        setFormData(initializeFormData(collectionMetadata.fields));
      } else {
        toast.error("فشل في إضافة البيانات.");
      }
    } catch (error) {
      console.error("خطأ في إضافة البيانات إلى المجموعة المحددة:", error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          toast.error(
            `خطأ من الخادم: ${error.response.data.message || error.message}`
          );
        } else if (error.request) {
          toast.error("تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
        } else {
          toast.error(`خطأ: ${error.message}`);
        }
      } else {
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-md ${
        darkMode
          ? "dark:text-gray-100 dark:bg-gray-800"
          : "text-gray-700 dark:bg-gray-200"
      }`}
      dir="rtl"
    >
      <h2 className="text-2xl font-semibold mb-4">إضافة بيانات إلى مجموعة</h2>
      <PredefinedCollection
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
        darkMode={darkMode}
      />

      {loadingMetadata && <p>جاري تحميل بيانات المجموعة...</p>}

      {errorMetadata && <p className="text-red-600">{errorMetadata}</p>}

      {collectionMetadata && (
        <form onSubmit={handleSubmit}>
          {collectionMetadata.fields.map((field) => {
            const inputProps = {
              name: field.fieldName,
              value: formData[field.fieldName],
              onChange: handleInputChange,
              required: true,
              className: `w-full px-4 py-2 border rounded-lg ${
                darkMode
                  ? "dark:text-gray-100 bg-gray-700 border-gray-700"
                  : "text-gray-800 bg-gray-100 border-gray-300"
              }`,
              id: field.fieldName,
            };

            // Determine input type based on field type
            let inputElement;
            switch (field.fieldType) {
              case "String":
                inputElement = <input type="text" {...inputProps} />;
                break;
              case "Number":
                inputElement = <input type="number" {...inputProps} />;
                break;
              case "Boolean":
                inputElement = (
                  <input
                    type="checkbox"
                    {...inputProps}
                    checked={formData[field.fieldName] || false}
                  />
                );
                break;
              case "Date":
                inputElement = <input type="date" {...inputProps} />;
                break;
              default:
                inputElement = <input type="text" {...inputProps} />;
            }

            return (
              <div key={field.fieldName} className="mb-4">
                <label htmlFor={field.fieldName} className="block mb-2">
                  {field.fieldName}:
                </label>
                {inputElement}
              </div>
            );
          })}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg mt-2 w-full md:w-auto hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-700 hover:text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "جاري الإضافة..." : "إضافة البيانات"}
          </button>
        </form>
      )}
    </div>
  );
};

export default AddDataToCollection;
