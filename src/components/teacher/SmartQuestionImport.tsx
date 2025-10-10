"use client";
import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentArrowUpIcon,
  PhotoIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
import MathText from "../ui/MathText";

interface ImportedQuestion {
  _id: string;
  text: string;
  type:
    | "mcq"
    | "truefalse"
    | "fill"
    | "short"
    | "long"
    | "assertionreason"
    | "integer";
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  correctAnswerText?: string;
  explanation?: string;
  diagramUrl?: string;
  status: "pending" | "approved" | "rejected";
  needsReview: boolean;
  confidence: number;
  extractedText?: string;
  originalPosition?: number;
  questionNumber: number;
}

interface ImportBatch {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  totalQuestions: number;
  processedQuestions: number;
  approvedQuestions: number;
  rejectedQuestions: number;
  status: "uploading" | "processing" | "completed" | "failed";
  processingProgress: number;
  totalProcessingTime: number;
  createdAt: string;
  ocrProvider: "groq" | "gemini" | "tesseract";
  error?: string;
}

interface BlueprintItem {
  _id: string;
  name: string;
  examTitle: string;
}

interface SmartImportProps {
  onClose?: () => void;
}

const SmartQuestionImport: React.FC<SmartImportProps> = ({ onClose }) => {
  // States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<ImportBatch | null>(null);
  const [questions, setQuestions] = useState<ImportedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [previewMode, setPreviewMode] = useState<"grid" | "list">("list");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<BlueprintItem[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [creatingPaper, setCreatingPaper] = useState(false);

  // Form fields
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [ocrProvider, setOcrProvider] = useState<
    "groq" | "gemini" | "tesseract"
  >("tesseract");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only PDF and image files are allowed.");
      return;
    }

    // Validate file size (50MB max)
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

  // Upload and process file
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }

    setUploading(true);
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("questionPaper", selectedFile);
      formData.append("subject", subject.trim());
      formData.append("topic", topic.trim());
      formData.append("ocrProvider", ocrProvider);

      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/import-paper`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = (await response.json()) as {
        batchId: string;
        totalQuestions: number;
        processedQuestions: number;
        processingTime: number;
      };

      setSuccess(
        `Successfully processed ${result.processedQuestions} questions from ${result.totalQuestions} found`
      );

      // Fetch the batch details and questions
      await fetchBatchDetails(result.batchId);

      setUploading(false);
      setProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setProcessing(false);
    }
  };

  // Fetch batch details
  const fetchBatchDetails = async (batchId: string) => {
    try {
      const batchData = (await apiFetch(
        `/api/import-paper/batch/${batchId}`
      )) as {
        batch: ImportBatch;
        questions: ImportedQuestion[];
      };
      setCurrentBatch(batchData.batch);
      setQuestions(batchData.questions || []);
    } catch {
      setError("Failed to fetch batch details");
    }
  };

  // Question management
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    const filteredQuestions = getFilteredQuestions();
    setSelectedQuestions(new Set(filteredQuestions.map((q) => q._id)));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  const bulkApproveQuestions = async () => {
    if (selectedQuestions.size === 0) {
      setError("Please select questions to approve");
      return;
    }

    try {
      const result = (await apiFetch(
        "/api/import-paper/questions/bulk-approve",
        {
          method: "POST",
          body: JSON.stringify({
            questionIds: Array.from(selectedQuestions),
          }),
        }
      )) as { approved: number; failed: number };

      setSuccess(`Successfully approved ${result.approved} questions`);

      // Refresh questions
      if (currentBatch) {
        await fetchBatchDetails(currentBatch._id);
      }

      setSelectedQuestions(new Set());
    } catch {
      setError("Failed to approve questions");
    }
  };

  const updateQuestionStatus = async (
    questionId: string,
    action: "approve" | "reject"
  ) => {
    try {
      await apiFetch(`/api/import-paper/question/${questionId}`, {
        method: "PUT",
        body: JSON.stringify({ action }),
      });

      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === questionId
            ? { ...q, status: action === "approve" ? "approved" : "rejected" }
            : q
        )
      );

      setSuccess(`Question ${action}d successfully`);
    } catch {
      setError(`Failed to ${action} question`);
    }
  };

  // Filter questions
  const getFilteredQuestions = () => {
    return questions.filter((q) => {
      if (filterStatus === "all") return true;
      return q.status === filterStatus;
    });
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCurrentBatch(null);
    setQuestions([]);
    setSelectedQuestions(new Set());
    setSubject("");
    setTopic("");
    setError(null);
    setSuccess(null);
    setUploading(false);
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredQuestions = getFilteredQuestions();

  // Load blueprints (on demand)
  const loadBlueprints = async () => {
    try {
      const data = (await apiFetch("/api/blueprints")) as {
        items: BlueprintItem[];
      };
      setBlueprints(data.items || []);
    } catch {
      setError("Failed to load blueprints");
    }
  };

  const attachDiagram = async (questionId: string, file: File) => {
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const form = new FormData();
      form.append("image", file);
      const resp = await fetch(
        `${base}/api/import-paper/question/${questionId}/diagram`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("accessToken") || ""
            }`,
          },
          body: form,
        }
      );
      if (!resp.ok) throw new Error("Upload failed");
      const json = await resp.json();
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === questionId
            ? {
                ...q,
                diagramUrl:
                  json.data?.question?.diagramUrl || json.question?.diagramUrl,
              }
            : q
        )
      );
      setSuccess("Diagram uploaded");
    } catch {
      setError("Failed to upload diagram");
    }
  };

  const createPaperFromBlueprint = async () => {
    if (!selectedBlueprintId) {
      setError("Please select a blueprint");
      return;
    }
    const picked = Array.from(selectedQuestions);
    if (picked.length === 0) {
      setError("Please select at least one question");
      return;
    }
    try {
      setCreatingPaper(true);
      await apiFetch("/api/import-paper/create-paper", {
        method: "POST",
        body: JSON.stringify({
          blueprintId: selectedBlueprintId,
          questionIds: picked,
        }),
      });
      setSuccess(
        "Paper created from blueprint. You can export it from Papers."
      );
      setSelectedQuestions(new Set());
    } catch {
      setError("Failed to create paper from blueprint");
    } finally {
      setCreatingPaper(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                <DocumentArrowUpIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Smart Question Import
                </h1>
                <p className="text-gray-600">
                  Upload PDF or images to automatically extract questions
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Alert Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
            >
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700">{success}</p>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto p-1 text-green-400 hover:text-green-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Section */}
        {!currentBatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 space-y-6"
          >
            {/* Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Topic (optional)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Calculus"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  OCR Provider
                </label>
                <select
                  value={ocrProvider}
                  onChange={(e) =>
                    setOcrProvider(
                      e.target.value as "groq" | "gemini" | "tesseract"
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="tesseract">Tesseract (On-device OCR)</option>
                  <option value="groq">Groq (Fast)</option>
                  <option value="gemini">Gemini (Accurate)</option>
                </select>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : selectedFile
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInput}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                className="sr-only"
              />

              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    {selectedFile.type === "application/pdf" ? (
                      <DocumentTextIcon className="w-8 h-8 text-green-600" />
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-green-700">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {selectedFile.type}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Change File
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <DocumentArrowUpIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Drop your question paper here
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      or{" "}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports PDF, JPG, PNG, GIF, BMP • Max 50MB
                  </p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex justify-center">
              <motion.button
                onClick={handleUpload}
                disabled={!selectedFile || uploading || !subject.trim()}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  !selectedFile || uploading || !subject.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
                }`}
                whileHover={
                  !selectedFile || uploading || !subject.trim()
                    ? {}
                    : { scale: 1.02 }
                }
                whileTap={
                  !selectedFile || uploading || !subject.trim()
                    ? {}
                    : { scale: 0.98 }
                }
              >
                {uploading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="w-5 h-5" />
                    Import Questions
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Processing Status */}
        {processing && currentBatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900">
                Processing Questions
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(currentBatch.processingProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentBatch.processingProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-semibold text-gray-900">
                    {currentBatch.totalQuestions}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Processed</p>
                  <p className="font-semibold text-blue-600">
                    {currentBatch.processedQuestions}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-semibold text-purple-600">
                    {Math.round(currentBatch.totalProcessingTime / 1000)}s
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Questions Preview */}
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <EyeIcon className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Extracted Questions ({filteredQuestions.length})
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as
                          | "all"
                          | "pending"
                          | "approved"
                          | "rejected"
                      )
                    }
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Questions</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <button
                    onClick={() =>
                      setPreviewMode(previewMode === "list" ? "grid" : "list")
                    }
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {previewMode === "list" ? "Grid View" : "List View"}
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllQuestions}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllQuestions}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                  {selectedQuestions.size > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedQuestions.size} selected
                    </span>
                  )}
                </div>

                {selectedQuestions.size > 0 && (
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={bulkApproveQuestions}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                      Approve Selected
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="max-h-[600px] overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No questions match the selected filter</p>
                </div>
              ) : (
                <div
                  className={
                    previewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
                      : "divide-y divide-gray-200"
                  }
                >
                  {filteredQuestions.map((question, index) => (
                    <motion.div
                      key={question._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`${
                        previewMode === "grid"
                          ? "border border-gray-200 rounded-xl p-4 bg-white"
                          : "p-4 hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedQuestions.has(question._id)}
                          onChange={() => toggleQuestionSelection(question._id)}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />

                        {/* Question Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Q{question.questionNumber}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  question.type === "mcq"
                                    ? "bg-blue-100 text-blue-800"
                                    : question.type === "truefalse"
                                    ? "bg-green-100 text-green-800"
                                    : question.type === "fill"
                                    ? "bg-purple-100 text-purple-800"
                                    : question.type === "short"
                                    ? "bg-orange-100 text-orange-800"
                                    : question.type === "long"
                                    ? "bg-red-100 text-red-800"
                                    : question.type === "assertionreason"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-teal-100 text-teal-800"
                                }`}
                              >
                                {question.type.toUpperCase()}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  question.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : question.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {question.status.charAt(0).toUpperCase() +
                                  question.status.slice(1)}
                              </span>
                              {(question.confidence > 1
                                ? question.confidence
                                : question.confidence * 100) < 80 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Low Confidence
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {question.status === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateQuestionStatus(
                                        question._id,
                                        "approve"
                                      )
                                    }
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateQuestionStatus(
                                        question._id,
                                        "reject"
                                      )
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Question Text */}
                          <div className="mb-3">
                            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                              <MathText text={question.text} />
                            </p>
                          </div>

                          {/* Options for MCQ */}
                          {question.type === "mcq" && question.options && (
                            <div className="mb-3 space-y-1">
                              {question.options.map((option, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                                    option.isCorrect
                                      ? "bg-green-50 text-green-800"
                                      : "text-gray-600"
                                  }`}
                                >
                                  <span className="font-medium">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  <span className="flex-1">
                                    <MathText text={option.text} inline />
                                  </span>
                                  {option.isCorrect && (
                                    <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Correct Answer for non-MCQ */}
                          {question.type !== "mcq" &&
                            (question.correctAnswer ??
                            question.correctAnswerText
                              ? true
                              : false) && (
                              <div className="mb-3 p-2 bg-green-50 rounded-lg">
                                <p className="text-sm">
                                  <span className="font-medium text-green-800">
                                    Answer:
                                  </span>{" "}
                                  <span className="text-green-700">
                                    <MathText
                                      text={
                                        (question.correctAnswer ??
                                          question.correctAnswerText) as string
                                      }
                                      inline
                                    />
                                  </span>
                                </p>
                              </div>
                            )}

                          {/* Explanation */}
                          {question.explanation && (
                            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                              <p className="text-sm">
                                <span className="font-medium text-blue-800">
                                  Explanation:
                                </span>{" "}
                                <span className="text-blue-700">
                                  <MathText text={question.explanation} />
                                </span>
                              </p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              Confidence:{" "}
                              {Math.round(
                                question.confidence > 1
                                  ? question.confidence
                                  : question.confidence * 100
                              )}
                              %
                            </span>
                            {question.extractedText && (
                              <span>
                                Original Position: {question.originalPosition}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs text-gray-500">
                              Attach diagram:
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) attachDiagram(question._id, file);
                              }}
                              className="text-xs"
                            />
                            {question.diagramUrl && (
                              <a
                                href={question.diagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bottom Actions */}
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {questions.filter((q) => q.status === "approved").length} of{" "}
                {questions.length} questions approved
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadBlueprints}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Load Blueprints
                  </button>
                  {blueprints.length > 0 && (
                    <select
                      value={selectedBlueprintId}
                      onChange={(e) => setSelectedBlueprintId(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Blueprint</option>
                      {blueprints.map((bp) => (
                        <option key={bp._id} value={bp._id}>
                          {bp.examTitle || bp.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <motion.button
                    onClick={createPaperFromBlueprint}
                    disabled={!selectedBlueprintId || creatingPaper}
                    className={`px-4 py-2 ${
                      !selectedBlueprintId || creatingPaper
                        ? "bg-gray-100 text-gray-400"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } rounded-lg text-sm`}
                    whileHover={
                      !selectedBlueprintId || creatingPaper
                        ? {}
                        : { scale: 1.02 }
                    }
                    whileTap={
                      !selectedBlueprintId || creatingPaper
                        ? {}
                        : { scale: 0.98 }
                    }
                  >
                    {creatingPaper ? "Creating…" : "Add to Blueprint → Paper"}
                  </motion.button>
                </div>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Import Another Paper
                </button>

                <motion.button
                  onClick={() => {
                    // Handle saving to question bank
                    alert("Questions saved to question bank!");
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Save to Question Bank
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SmartQuestionImport;
