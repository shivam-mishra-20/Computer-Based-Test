"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

// Step Components
import PaperBasicInfo from "./paper-creation/PaperBasicInfo";
import PaperBoardSelection from "./paper-creation/PaperBoardSelection";
import PaperChapterSelection from "./paper-creation/PaperChapterSelection";
import PaperQuestionSelection from "./paper-creation/PaperQuestionSelection";
import PaperPreview from "./paper-creation/PaperPreview";

export interface PaperFormData {
  // Basic Info
  className: string;
  subject: string;
  examTitle: string;
  totalMarks: number;
  duration: string;
  date: string;
  instituteName?: string;
  instituteLogo?: string;

  // Board Selection
  board: string; // CBSE, GSEB, JEE, NEET, Olympiad, Custom

  // Chapter Selection
  selectedChapters: string[];

  // Question Selection
  sections: {
    title: string;
    marksPerQuestion: number;
    instructions?: string;
    // Auto-placement key (objective, very_short, short, long, case_study)
    questionTypeKey?: string;
    types?: string[]; // Question types allowed in this section
    selectedQuestions: Array<{
      _id: string;
      text: string;
      type: string;
      options?: Array<{ text: string }>;
      explanation?: string;
    }>;
  }[];
}

const initialFormData: PaperFormData = {
  className: "",
  subject: "",
  examTitle: "",
  totalMarks: 0,
  duration: "",
  date: "",
  instituteName: "",
  instituteLogo: "",
  board: "",
  selectedChapters: [],
  sections: [],
};

const steps = [
  { id: 1, title: "Basic Info", description: "Class, Subject & Exam Details" },
  { id: 2, title: "Board Type", description: "Select Exam Board" },
  { id: 3, title: "Chapters", description: "Choose Topics" },
  { id: 4, title: "Questions", description: "Select Questions by Section" },
  { id: 5, title: "Preview", description: "Review & Export" },
];

export default function CreatePaperFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PaperFormData>(initialFormData);

  const STORAGE_KEY = "createPaperFlow_state";

  // Restore saved state on component mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setFormData(parsed.formData || initialFormData);
        setCurrentStep(parsed.currentStep || 1);
      }
    } catch (error) {
      console.error("Error restoring paper flow state:", error);
    }
  }, []);

  // Save state to localStorage whenever formData or currentStep changes
  useEffect(() => {
    try {
      const stateToSave = {
        formData,
        currentStep,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Error saving paper flow state:", error);
    }
  }, [formData, currentStep]);

  const updateFormData = (data: Partial<PaperFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.className && formData.subject && formData.examTitle;
      case 2:
        return formData.board !== "";
      case 3:
        return formData.selectedChapters.length > 0;
      case 4:
        return formData.sections.some((s) => s.selectedQuestions.length > 0);
      default:
        return true;
    }
  };

  const handleComplete = () => {
    // Clear saved state from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing paper flow state:", error);
    }

    // Reset form to initial state
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PaperBasicInfo formData={formData} updateFormData={updateFormData} />
        );
      case 2:
        return (
          <PaperBoardSelection
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 3:
        return (
          <PaperChapterSelection
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 4:
        return (
          <PaperQuestionSelection
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 5:
        return <PaperPreview formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-2 lg:px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-900">
              Create Question Paper
            </h1>
            <p className="text-sm text-gray-600">
              Step {currentStep} of {steps.length}:{" "}
              {steps[currentStep - 1].title}
            </p>
          </div>
        </motion.div>

        {/* Progress Stepper - Mobile Optimized */}
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > step.id
                      ? "bg-emerald-600 text-white"
                      : currentStep === step.id
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-200"
                      : "bg-white text-gray-400 border-2 border-gray-200"
                  }`}
                  animate={{
                    scale: currentStep === step.id ? 1.1 : 1,
                  }}
                >
                  {currentStep > step.id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      currentStep > step.id ? "bg-emerald-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-xs text-center text-gray-600 mt-2">
            {steps[currentStep - 1].description}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm">
              {renderStep()}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex gap-3 items-center pb-6">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            variant="outline"
            className="flex-1 border-2 border-emerald-600 text-black hover:bg-emerald-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-black h-12 rounded-xl font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back</span>
          </Button>

          {currentStep < steps.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:bg-gray-300 h-12 rounded-xl font-medium shadow-sm"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-medium shadow-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              <span>Complete</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
