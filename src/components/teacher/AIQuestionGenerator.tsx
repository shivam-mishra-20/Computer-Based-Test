"use client";
import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  DocumentArrowUpIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
import SmartImportPreviewModal from "./SmartImportPreviewModal";

// Reuse constants from Smart Import
const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Computer Science",
  "Economics",
  "Accountancy",
  "Business Studies",
  "History",
  "Geography",
  "Civics",
];

const CLASS_OPTIONS = ["6", "7", "8", "9", "10", "11", "12"];

const BOARD_OPTIONS = [
  "CBSE",
  "ICSE",
  "GSEB",
  "JEE",
  "NEET",
  "Olympiad",
  "Custom",
];

const SECTION_OPTIONS = [
  "Objective",
  "Very Short",
  "Short",
  "Long",
  "Case Study",
];

const DIFFICULTY_OPTIONS = [
  { value: "mixed", label: "Mixed (30% Easy, 50% Medium, 20% Hard)" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const MODEL_OPTIONS = [
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro (Advanced)",
    description: "Enhanced reasoning for complex problems",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (Recommended)",
    description: "Fast and accurate - best for most use cases",
  },
];

interface GeneratedQuestion {
  _id: string;
  questionNumber: number;
  text: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  options?: { text: string; isCorrect: boolean }[];
  correctAnswerText?: string;
  integerAnswer?: number;
  assertion?: string;
  reason?: string;
  difficulty?: string;
  confidence?: number;
  needsReview?: boolean;
  diagramUrl?: string;
}

interface AIToolsProps {
  onClose?: () => void;
}

const AIQuestionGenerator: React.FC<AIToolsProps> = ({ onClose }) => {
  // Form states
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [topic, setTopic] = useState("");
  const [board, setBoard] = useState("");
  const [chapter, setChapter] = useState("");
  const [section, setSection] = useState("");
  const [marks, setMarks] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [difficulty, setDifficulty] = useState("mixed");
  const [textInput, setTextInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");

  // File/Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "camera" | "text">(
    "file"
  );

  // Processing states
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF and image files are allowed.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  // Validation
  const validateForm = (): boolean => {
    if (!subject.trim()) {
      setError("Subject is required");
      return false;
    }
    if (!className.trim()) {
      setError("Class is required");
      return false;
    }
    if (
      !questionCount ||
      isNaN(Number(questionCount)) ||
      Number(questionCount) < 1
    ) {
      setError("Valid question count is required");
      return false;
    }
    if (inputMode === "text" && textInput.trim().length < 50) {
      setError("Text input must be at least 50 characters");
      return false;
    }
    if (inputMode !== "text" && !selectedFile) {
      setError("Please select a file or switch to text input mode");
      return false;
    }
    return true;
  };

  // Generate Questions
  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setGenerating(true);

    try {
      let endpoint = "";
      let formData: FormData | null = null;
      let jsonBody: Record<string, unknown> | null = null;

      const baseData = {
        subject: subject.trim(),
        class: className.trim(),
        topic: topic.trim() || undefined,
        board: board.trim() || undefined,
        chapter: chapter.trim() || undefined,
        section: section.trim() || undefined,
        marks: marks.trim() ? Number(marks) : undefined,
        count: Number(questionCount),
        difficulty,
        model: selectedModel,
      };

      if (inputMode === "text") {
        endpoint = "/api/ai/ai-generate/text";
        jsonBody = { ...baseData, text: textInput.trim() };
      } else {
        const isPDF = selectedFile!.type === "application/pdf";
        endpoint = isPDF
          ? "/api/ai/ai-generate/pdf"
          : "/api/ai/ai-generate/image";

        formData = new FormData();
        formData.append("file", selectedFile!);
        Object.entries(baseData).forEach(([key, value]) => {
          if (value !== undefined) formData!.append(key, String(value));
        });
      }

      console.log(`[AI Tools] Generating questions via ${endpoint}...`);

      const result = (await apiFetch(endpoint, {
        method: "POST",
        ...(jsonBody
          ? { body: JSON.stringify(jsonBody) }
          : { body: formData, headers: {} }), // Let browser set multipart headers
      })) as { success: boolean; data?: { questions: GeneratedQuestion[] } };

      if (result.success && result.data?.questions) {
        setQuestions(result.data.questions);
        setSelectedQuestions(new Set(result.data.questions.map((q) => q._id)));
        setShowPreview(true);
        setSuccess(
          `Generated ${result.data.questions.length} questions successfully!`
        );
      } else {
        throw new Error("Failed to generate questions");
      }
    } catch (err: unknown) {
      console.error("[AI Tools] Generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate questions"
      );
    } finally {
      setGenerating(false);
    }
  };

  // Save Selected Questions
  const handleSaveSelected = async (
    overrides?: Record<string, Partial<GeneratedQuestion>>
  ) => {
    setError(null);
    setSuccess(null);

    const selected = questions.filter((q) => selectedQuestions.has(q._id));

    if (selected.length === 0) {
      setError("No questions selected");
      return;
    }

    try {
      const payload = selected.map((q) => ({
        text: overrides?.[q._id]?.text ?? q.text,
        type: overrides?.[q._id]?.type ?? q.type,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        class: className.trim(),
        board: board.trim() || undefined,
        chapter: chapter.trim() || undefined,
        section: section.trim() || undefined,
        marks: marks.trim() ? Number(marks) : undefined,
        difficulty:
          overrides?.[q._id]?.difficulty ?? q.difficulty ?? difficulty,
        source: "Smart Import",
        options: overrides?.[q._id]?.options ?? q.options,
        correctAnswerText:
          overrides?.[q._id]?.correctAnswerText ?? q.correctAnswerText,
        integerAnswer: q.integerAnswer,
        assertion: q.assertion,
        reason: q.reason,
        diagramUrl: overrides?.[q._id]?.diagramUrl ?? undefined,
      }));

      const result = (await apiFetch("/api/ai/save-questions", {
        method: "POST",
        body: JSON.stringify({ questions: payload }),
      })) as { success: boolean; data?: { saved: number; skipped: number } };

      const saved = result?.data?.saved ?? payload.length;
      const skipped = result?.data?.skipped ?? 0;

      setSuccess(
        `✅ Saved ${saved} questions to question bank! ${
          skipped > 0 ? `(${skipped} skipped)` : ""
        }`
      );
      setShowPreview(false);

      // Reset form
      setQuestions([]);
      setSelectedQuestions(new Set());
      setSelectedFile(null);
      setTextInput("");
    } catch (err: unknown) {
      console.error("[AI Tools] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save questions");
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedQuestions(new Set(questions.map((q) => q._id)));
  const deselectAll = () => setSelectedQuestions(new Set());

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Question Generator
                </h1>
                <p className="text-gray-600 mt-1">
                  Powered by Gemini 2.5 Pro - Generate high-quality questions
                  instantly
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            )}
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3"
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3"
              >
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-800 font-medium">Success</p>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="text-green-400 hover:text-green-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Input Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Choose Input Method
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setInputMode("file");
                setTextInput("");
              }}
              className={`p-6 rounded-xl border-2 transition-all ${
                inputMode === "file"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <DocumentArrowUpIcon
                className={`w-8 h-8 mx-auto mb-2 ${
                  inputMode === "file" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-gray-900">Upload File</p>
              <p className="text-sm text-gray-500 mt-1">PDF or Image</p>
            </button>

            <button
              onClick={() => {
                setInputMode("camera");
                setSelectedFile(null);
                setTextInput("");
              }}
              className={`p-6 rounded-xl border-2 transition-all ${
                inputMode === "camera"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CameraIcon
                className={`w-8 h-8 mx-auto mb-2 ${
                  inputMode === "camera" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-gray-900">Camera</p>
              <p className="text-sm text-gray-500 mt-1">Take Photo</p>
            </button>

            <button
              onClick={() => {
                setInputMode("text");
                setSelectedFile(null);
              }}
              className={`p-6 rounded-xl border-2 transition-all ${
                inputMode === "text"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <DocumentTextIcon
                className={`w-8 h-8 mx-auto mb-2 ${
                  inputMode === "text" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-gray-900">Text Input</p>
              <p className="text-sm text-gray-500 mt-1">Paste Content</p>
            </button>
          </div>
        </motion.div>

        {/* File Upload or Text Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          {inputMode === "text" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content for Question Generation
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={10}
                placeholder="Paste your study material, chapter content, or syllabus here (minimum 50 characters)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                {textInput.length} characters
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {inputMode === "camera" ? "Capture Image" : "Upload File"}
              </label>

              {inputMode === "camera" ? (
                <div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 transition-colors flex flex-col items-center justify-center space-y-3"
                  >
                    <CameraIcon className="w-12 h-12 text-gray-400" />
                    <span className="text-gray-600 font-medium">
                      {selectedFile ? selectedFile.name : "Take Photo"}
                    </span>
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center space-x-3">
                        {selectedFile.type === "application/pdf" ? (
                          <DocumentTextIcon className="w-8 h-8 text-red-500" />
                        ) : (
                          <PhotoIcon className="w-8 h-8 text-blue-500" />
                        )}
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <XMarkIcon className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 font-medium mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">
                          PDF or Image (up to 50MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Metadata Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Question Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Subject - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Subject</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Class - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Class</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quadratic Equations"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Board */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Board</option>
                {BOARD_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chapter
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g., Algebra"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Section</option>
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Marks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks per Question
              </label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                placeholder="e.g., 5"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Question Count - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions *
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                placeholder="e.g., 10"
                min="1"
                max="50"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Model */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model *
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {
                  MODEL_OPTIONS.find((m) => m.value === selectedModel)
                    ?.description
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`px-8 py-4 rounded-xl font-semibold text-white shadow-lg transition-all transform hover:scale-105 ${
              generating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            }`}
          >
            {generating ? (
              <span className="flex items-center space-x-3">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Generating Questions...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-3">
                <SparklesIcon className="w-5 h-5" />
                <span>Generate Questions</span>
              </span>
            )}
          </button>
        </motion.div>
      </div>

      {/* Preview Modal - Reuse Smart Import's Preview Modal */}
      {showPreview && (
        <SmartImportPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          questions={questions}
          selectedIds={selectedQuestions}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onSaveSelected={handleSaveSelected}
        />
      )}
    </div>
  );
};

export default AIQuestionGenerator;
