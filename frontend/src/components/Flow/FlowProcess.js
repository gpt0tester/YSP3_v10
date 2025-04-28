import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  Database,
  Layers,
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  AlertTriangle,
} from "lucide-react";
import MongoCollectionManager from "./MongoCollectionManager";
import SolrCollectionManager from "./SolrCollectionManager";
import NiFiFlowAutoForm from "./NiFiFlowAutoForm";

const FlowProcess = ({ darkMode }) => {
  // Manage which section is active in the UI
  const [activeSection, setActiveSection] = useState("collection-creation");

  // Track completion status of each step
  const [completedSteps, setCompletedSteps] = useState({
    "collection-creation": false,
    "index-creation": false,
    "nifi-auto-flow": false,
  });

  // Store created resources for reference
  const [createdResources, setCreatedResources] = useState({
    collectionName: "",
    indexName: "",
  });

  // Define steps with metadata
  const steps = [
    {
      id: "collection-creation",
      label: "إنشاء مجموعة",
      subtitle: "MongoDB",
      description: "إنشاء مجموعة بيانات في MongoDB",
      icon: Database,
      ariaLabel: "إنشاء مجموعة MongoDB",
    },
    {
      id: "index-creation",
      label: "إنشاء فهرس",
      subtitle: "Solr",
      description: "إنشاء فهرس بحث في Solr",
      icon: Layers,
      ariaLabel: "إنشاء فهرس Solr",
    },
    {
      id: "nifi-auto-flow",
      label: "إنشاء تدفق",
      subtitle: "NiFi",
      description: "إنشاء تدفق معالجة البيانات في NiFi",
      icon: Activity,
      ariaLabel: "إنشاء تدفق NiFi",
    },
  ];

  // Handle step completion events
  const handleCreateCollectionSuccess = (createdCollectionName) => {
    setCreatedResources((prev) => ({
      ...prev,
      collectionName: createdCollectionName,
    }));

    setCompletedSteps((prev) => ({
      ...prev,
      "collection-creation": true,
    }));

    // Navigate to next step
    setActiveSection("index-creation");
  };

  const handleCreateIndexSuccess = (createdIndexName) => {
    setCreatedResources((prev) => ({
      ...prev,
      indexName: createdIndexName,
    }));

    setCompletedSteps((prev) => ({
      ...prev,
      "index-creation": true,
    }));

    // Navigate to next step
    setActiveSection("nifi-auto-flow");
  };

  const handleCreateFlowSuccess = () => {
    setCompletedSteps((prev) => ({
      ...prev,
      "nifi-auto-flow": true,
    }));

    toast.success("تم إنشاء جميع العناصر بنجاح!");
  };

  // Navigate to next/previous step
  const goToNextStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === activeSection);
    if (currentIndex < steps.length - 1) {
      setActiveSection(steps[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex((step) => step.id === activeSection);
    if (currentIndex > 0) {
      setActiveSection(steps[currentIndex - 1].id);
    }
  };

  // Get current step index and info
  const currentStepIndex = steps.findIndex((step) => step.id === activeSection);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate overall progress
  const totalSteps = steps.length;
  const completedStepCount =
    Object.values(completedSteps).filter(Boolean).length;
  const progress = Math.round((completedStepCount / totalSteps) * 100);

  // Theme classes for consistent styling
  const themeClasses = {
    container: darkMode
      ? "bg-gray-900 text-gray-100"
      : "bg-gray-50 text-gray-800",
    card: darkMode
      ? "bg-gray-800 text-gray-100 border-gray-700"
      : "bg-white text-gray-800 border-gray-200",
    stepButton: {
      active: darkMode
        ? "bg-blue-600 text-white border-blue-700"
        : "bg-blue-600 text-white border-blue-500",
      completed: darkMode
        ? "bg-green-700 text-white border-green-800"
        : "bg-green-600 text-white border-green-500",
      inactive: darkMode
        ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
        : "bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300",
    },
    navButton: {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      disabled: darkMode
        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
        : "bg-gray-200 text-gray-400 cursor-not-allowed",
    },
  };

  return (
    <div dir="rtl" className={`p-6 ${themeClasses.container}`}>
      {/* Overall Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">إنشاء نظام معالجة البيانات</h1>
          <div className="text-sm font-medium">
            {completedStepCount} من {totalSteps} ({progress}%)
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">مراحل الإنشاء</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {steps.map((step, index) => {
            // Determine step status
            const isActive = step.id === activeSection;
            const isCompleted = completedSteps[step.id];
            const isPending = !isActive && !isCompleted;

            // Apply appropriate styling based on status
            let stepClass = themeClasses.stepButton.inactive;
            if (isActive) stepClass = themeClasses.stepButton.active;
            if (isCompleted) stepClass = themeClasses.stepButton.completed;

            return (
              <div key={step.id} className="flex-1">
                <button
                  className={`w-full p-4 rounded-lg border transition-all duration-200 flex items-center justify-between ${stepClass}`}
                  onClick={() => setActiveSection(step.id)}
                  disabled={false}
                  aria-label={step.ariaLabel}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-opacity-20 bg-white mr-3">
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{step.label}</div>
                      <div className="text-sm opacity-80">{step.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isCompleted && !isActive && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500 bg-opacity-20">
                        تم الإكمال
                      </span>
                    )}
                    <ChevronLeft className="h-5 w-5 mr-2 opacity-70" />
                  </div>
                </button>

                {/* Connector line between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block h-px w-6 bg-gray-300 dark:bg-gray-600 mx-auto my-2"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Information */}
      <div className={`mb-6 p-4 rounded-lg border ${themeClasses.card}`}>
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
            <currentStep.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {currentStep.label} {currentStep.subtitle}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Show relevant context for the current step */}
        {!isFirstStep && createdResources.collectionName && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm flex items-start ${
              darkMode
                ? "dark:bg-blue-900/20 dark:text-blue-200"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            <Info className="h-5 w-5 ml-2 flex-shrink-0" />
            <div>
              <p className="font-medium">مجموعة MongoDB التي تم إنشاؤها:</p>
              <p className="mt-1">{createdResources.collectionName}</p>
            </div>
          </div>
        )}

        {activeSection === "nifi-auto-flow" && createdResources.indexName && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm flex items-start ${
              darkMode
                ? "dark:bg-blue-900/20 dark:text-blue-200"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            <Info className="h-5 w-5 ml-2 flex-shrink-0" />
            <div>
              <p className="font-medium">فهرس Solr الذي تم إنشاؤه:</p>
              <p className="mt-1">{createdResources.indexName}</p>
            </div>
          </div>
        )}

        {/* Warning for skipped steps */}
        {/* {currentStepIndex > 0 &&
          !completedSteps[steps[currentStepIndex - 1].id] && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex items-start">
              <AlertTriangle className="h-5 w-5 ml-2 flex-shrink-0" />
              <div>
                <p className="font-medium">تخطيت خطوة سابقة!</p>
                <p className="mt-1">
                  يُفضل إتمام الخطوات السابقة قبل المتابعة لضمان عمل النظام بشكل
                  صحيح.
                </p>
              </div>
            </div>
          )} */}
      </div>

      {/* Component Container */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        {activeSection === "collection-creation" && (
          <MongoCollectionManager
            darkMode={darkMode}
            onSuccess={handleCreateCollectionSuccess}
          />
        )}

        {activeSection === "index-creation" && (
          <SolrCollectionManager
            darkMode={darkMode}
            onSuccess={handleCreateIndexSuccess}
          />
        )}

        {activeSection === "nifi-auto-flow" && (
          <NiFiFlowAutoForm
            darkMode={darkMode}
            defaultCollectionName={createdResources.collectionName}
            onSuccess={handleCreateFlowSuccess}
          />
        )}
      </div>

      {/* Navigation Controls */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={goToPreviousStep}
          disabled={isFirstStep}
          className={`px-4 py-2 rounded-lg flex items-center ${
            isFirstStep
              ? themeClasses.navButton.disabled
              : themeClasses.navButton.primary
          }`}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          الخطوة السابقة
        </button>

        <button
          onClick={goToNextStep}
          disabled={isLastStep}
          className={`px-4 py-2 rounded-lg flex items-center ${
            isLastStep
              ? themeClasses.navButton.disabled
              : themeClasses.navButton.primary
          }`}
        >
          الخطوة التالية
          <ArrowLeft className="mr-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FlowProcess;
