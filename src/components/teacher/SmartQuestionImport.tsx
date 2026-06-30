"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DocumentArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
// Removed inline preview dependencies (MathText/Image) for modal-only flow
import Router from "next/router";
import Image from "next/image";
import SmartImportPreviewModal from "./SmartImportPreviewModal";

// Static option sets
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
  ocrProvider: "pdf-parse" | "nvidia-vision" | "tesseract" | "google-vision" | "groq" | "gemini";
  // Live progress fields merged into the GET response (not persisted).
  stage?: string;
  stageLabel?: string;
  etaSeconds?: number | null;
  questionsPerSecond?: number;
  elapsedSeconds?: number;
  error?: string;
}

// BlueprintItem interface removed (blueprint feature deferred)

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
  // Removed inline preview state (grid/list, filters)
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Removed blueprint selection state for simplified flow
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Persist state across modal sessions
  const STORAGE_KEY = "smartImport_questions";
  const BATCH_KEY = "smartImport_batch";

  // Load persisted questions on mount
  useEffect(() => {
    const savedQuestions = sessionStorage.getItem(STORAGE_KEY);
    const savedBatch = sessionStorage.getItem(BATCH_KEY);
    if (savedQuestions) {
      try {
        const parsed = JSON.parse(savedQuestions);
        setQuestions(parsed);
      } catch (e) {
        console.error("Failed to parse saved questions:", e);
      }
    }
    if (savedBatch) {
      try {
        const parsed = JSON.parse(savedBatch);
        setCurrentBatch(parsed);
      } catch (e) {
        console.error("Failed to parse saved batch:", e);
      }
    }
  }, []);

  // Persist questions whenever they change
  useEffect(() => {
    if (questions.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  }, [questions]);

  useEffect(() => {
    if (currentBatch) {
      sessionStorage.setItem(BATCH_KEY, JSON.stringify(currentBatch));
    }
  }, [currentBatch]);

  // Inline edit state removed (handled in modal)

  // Form fields
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [ocrProvider] = useState<"pdf-parse">("pdf-parse");
  const [provider, setProvider] = useState<"nvidia" | "ollama">("nvidia");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

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

    // Generate preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);
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

  // Form fields for metadata (for new validation endpoint)
  const [className, setClassName] = useState("");
  const [board, setBoard] = useState("");
  const [chapter, setChapter] = useState("");
  const [section, setSection] = useState("");
  const [marks, setMarks] = useState("");

  // Unsaved changes detection now limited to modal actions; inline edit tracker removed
  const hasUnsavedEdits = false;

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Warn on browser/tab close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedEdits) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedEdits]);

  // Intercept internal route changes (Next.js pages router)
  useEffect(() => {
    const routeChangeStart = () => {
      if (!hasUnsavedEdits) return;
      const ok = window.confirm(
        "You have unsaved changes to a question. Are you sure you want to leave this page?"
      );
      if (!ok) {
        Router.events.emit("routeChangeError");
        // Abort the route change by throwing; Next.js will catch this
        throw new Error("Route change aborted.");
      }
    };
    Router.events.on("routeChangeStart", routeChangeStart);
    return () => {
      Router.events.off("routeChangeStart", routeChangeStart);
    };
  }, [hasUnsavedEdits]);

  // Poll the batch endpoint for live progress while the import runs in the
  // background. Updates currentBatch (stage / processed / total / ETA / speed).
  const pollBatch = (batchId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const POLL_MS = Number(process.env.NEXT_PUBLIC_IMPORT_POLL_MS) || 1500;
    const tick = async () => {
      try {
        const data = (await apiFetch(`/import-paper/batch/${batchId}`)) as {
          batch: ImportBatch;
          questions: ImportedQuestion[];
        };
        if (data?.batch) setCurrentBatch(data.batch);
        const status = data?.batch?.status;
        if (status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setQuestions(data.questions || []);
          setProcessing(false);
          setSuccess(`Extracted ${data.questions?.length || 0} questions — review and save.`);
          setIsPreviewOpen(true);
        } else if (status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setProcessing(false);
          setError(data.batch?.error || "Import failed during processing.");
        }
      } catch {
        // transient error — keep polling
      }
    };
    tick();
    pollRef.current = setInterval(tick, POLL_MS);
  };

  // Upload and process file with new validation endpoint
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
      formData.append("provider", provider);

      // Add new metadata fields for validation
      if (className.trim()) formData.append("class", className.trim());
      if (board.trim()) formData.append("board", board.trim());
      if (chapter.trim()) formData.append("chapter", chapter.trim());
      if (section.trim()) formData.append("section", section.trim());
      if (marks.trim()) formData.append("marks", marks.trim());

      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
      const response = await fetch(`${base}/import-paper`, {
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

      const result = (await response.json()) as { batchId?: string; status?: string };
      if (!result.batchId) throw new Error("Server did not return a batch id");

      // File uploaded; processing now runs in the background. Poll for progress.
      setUploading(false);
      pollBatch(result.batchId);
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
        `/import-paper/batch/${batchId}`
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
        "/import-paper/questions/bulk-approve",
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

  // updateQuestionStatus removed (status changes via modal bulk actions)

  // Filter questions
  const getFilteredQuestions = () => questions;

  // Open preview modal when questions are available
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Ensure preview opens after fetch completes
  useEffect(() => {
    if (questions.length > 0) {
      setIsPreviewOpen(true);
    }
  }, [questions.length]);

  // Save selected questions to DB
  // Optionally accepts per-question overrides (from preview modal edits)
  const saveSelectedToBank = async (
    overrides?: Record<
      string,
      Partial<
        Pick<
          ImportedQuestion,
          "text" | "type" | "options" | "correctAnswerText" | "diagramUrl"
        > & { marks?: number }
      >
    >
  ) => {
    if (!className.trim()) {
      setError("Class is required to save questions (per-class storage)");
      return;
    }
    const selected = questions.filter((q) => selectedQuestions.has(q._id));
    if (selected.length === 0) {
      setError("Please select at least one question to save");
      return;
    }

    try {
      const payload = selected.map((q) => ({
        text: overrides?.[q._id]?.text ?? q.text,
        type: (overrides?.[q._id]?.type as ImportedQuestion["type"]) ?? q.type,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        class: className.trim(),
        board: board.trim() || undefined,
        chapter: chapter.trim() || undefined,
        section: section.trim() || undefined,
        // Use per-question marks if provided in overrides, otherwise use global marks field
        marks: overrides?.[q._id]?.marks ?? (marks.trim() ? Number(marks) : undefined),
        source: "Smart Import",
        options:
          (overrides?.[q._id]?.options as
            | { text: string; isCorrect: boolean }[]
            | undefined) ?? q.options,
        correctAnswerText:
          (overrides?.[q._id]?.correctAnswerText as string | undefined) ??
          q.correctAnswerText,
        explanation: q.explanation,
        diagramUrl:
          (overrides?.[q._id]?.diagramUrl as string | undefined) ??
          (q as unknown as { diagramUrl?: string }).diagramUrl,
      }));

      const result = (await apiFetch("/ai/save-questions", {
        method: "POST",
        body: JSON.stringify({ questions: payload }),
      })) as { success: boolean; data?: { saved: number; skipped: number } };
      const saved = result?.data?.saved ?? payload.length;
      const skipped = result?.data?.skipped ?? 0;
      setSuccess(
        `Saved ${saved}/${payload.length} questions.${
          skipped ? ` Skipped ${skipped} duplicates.` : ""
        }`
      );
      // Close modal after successful save - will trigger refresh
      setIsPreviewOpen(false);
      setSelectedQuestions(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save questions");
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg text-white">
                <DocumentArrowUpIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-emerald-900">
                  Smart Question Import
                </h1>
                <p className="text-sm text-gray-600">
                  Upload a PDF or image and extract questions with AI
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={() => {
                  if (hasUnsavedEdits) {
                    const ok = window.confirm(
                      "You have unsaved changes to a question. Discard and close?"
                    );
                    if (!ok) return;
                  }
                  onClose();
                }}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
              <p className="text-green-700 flex-1">{success}</p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200"
                >
                  Review now
                </button>
                <button
                  onClick={() => {
                    setSuccess(null);
                    // Refresh page after dismissing success message
                    window.location.reload();
                  }}
                  className="p-1 text-green-400 hover:text-green-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review banner for previously-extracted questions (persisted in session) */}
        {!processing && questions.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-emerald-800">
              You have <span className="font-semibold">{questions.length}</span> extracted question(s) from a previous import.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Review &amp; Save
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem(STORAGE_KEY);
                  sessionStorage.removeItem(BATCH_KEY);
                  setQuestions([]);
                  setCurrentBatch(null);
                  setSelectedQuestions(new Set());
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Upload Section — visible whenever idle (incl. after a completed/stale
            batch is restored from session) or during upload before a batch exists. */}
        {(!currentBatch || !processing) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg p-6 space-y-6"
          >
            {/* Configuration Fields */}
            <div>
              <h3 className="text-base font-semibold text-emerald-900 mb-4">
                Question Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Subject *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Select subject</option>
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Calculus"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Class
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Select class</option>
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AI model: Cloud (NVIDIA) vs Local (Ollama) */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Model</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setProvider("nvidia")}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                      provider === "nvidia"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-300 hover:bg-white"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${provider === "nvidia" ? "bg-emerald-500" : "bg-gray-300"}`} />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Cloud · NVIDIA</div>
                      <div className="text-xs text-gray-500">Nemotron Super 49B · best quality</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("ollama")}
                    className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                      provider === "ollama"
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-300 hover:bg-white"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${provider === "ollama" ? "bg-violet-500" : "bg-gray-300"}`} />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Local · Ollama</div>
                      <div className="text-xs text-gray-500">Qwen3:8b · private · offline · zero cost</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Board
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Select board</option>
                    {BOARD_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Chapter
                  </label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g., Algebra"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="">Select section</option>
                    {SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Marks
                  </label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="e.g., 1"
                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
              className="sr-only"
            />

            {/* File selection / drag target (inline preview launcher removed) */}
            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-emerald-300"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* File Preview */}
                  <div className="max-w-3xl mx-auto">
                    {selectedFile.type === "application/pdf" ? (
                      <div className="w-full rounded-lg overflow-hidden border-2 border-emerald-200 bg-gray-50">
                        <iframe
                          src={filePreviewUrl || ""}
                          className="w-full h-[500px]"
                          title="PDF Preview"
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border-2 border-emerald-200 bg-gray-50">
                        <Image
                          src={filePreviewUrl || ""}
                          alt="Preview"
                          width={1200}
                          height={800}
                          unoptimized
                          style={{ objectFit: "contain" }}
                          className="w-full h-auto max-h-[500px] mx-auto"
                        />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="text-center">
                    <p className="text-lg font-medium text-emerald-700">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-emerald-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {selectedFile.type === "application/pdf"
                        ? "PDF Document"
                        : "Image File"}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (filePreviewUrl) {
                          URL.revokeObjectURL(filePreviewUrl);
                          setFilePreviewUrl(null);
                        }
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 border border-emerald-200"
                    >
                      Change File
                    </button>
                    <button
                      onClick={() => {
                        if (filePreviewUrl) {
                          URL.revokeObjectURL(filePreviewUrl);
                          setFilePreviewUrl(null);
                        }
                        setSelectedFile(null);
                      }}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium rounded-lg hover:bg-red-50 border border-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <DocumentArrowUpIcon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-emerald-900">
                      Drop your question paper here
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      or{" "}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
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
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  !selectedFile || uploading || !subject.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl"
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

        {/* Processing Status — multi-stage live indicator */}
        {processing && currentBatch && (() => {
          const STAGES: { id: string; label: string }[] = [
            { id: "extracting", label: "Extracting" },
            { id: "parsing", label: "Parsing" },
            { id: "enhancing", label: "AI Enhancement" },
            { id: "validating", label: "Validating" },
            { id: "saving", label: "Saving" },
          ];
          const order = STAGES.map((s) => s.id);
          const cur = currentBatch.stage || "enhancing";
          const curIdx = order.indexOf(cur);
          const pct = Number.isFinite(currentBatch.processingProgress) ? currentBatch.processingProgress : 0;
          const eta = currentBatch.etaSeconds;
          const etaText = eta == null ? "—" : eta >= 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`;
          const elapsed = currentBatch.elapsedSeconds != null
            ? currentBatch.elapsedSeconds
            : Math.round((currentBatch.totalProcessingTime || 0) / 1000);
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentBatch.stageLabel || "Processing Questions"}
                </h3>
                <span className="ml-auto text-sm font-bold text-blue-600">{Math.round(pct)}%</span>
              </div>

              {/* Stage stepper */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {STAGES.map((st, i) => {
                  const active = i === curIdx;
                  const done = curIdx > i;
                  return (
                    <span
                      key={st.id}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        active
                          ? "bg-blue-100 text-blue-700"
                          : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? "✓ " : ""}{st.label}
                    </span>
                  );
                })}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <p className="text-gray-500">Questions</p>
                  <p className="font-semibold text-gray-900">
                    {currentBatch.processedQuestions || 0}
                    {currentBatch.totalQuestions ? ` / ${currentBatch.totalQuestions}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Speed</p>
                  <p className="font-semibold text-blue-600">
                    {currentBatch.questionsPerSecond ? `${currentBatch.questionsPerSecond.toFixed(2)} q/s` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">ETA</p>
                  <p className="font-semibold text-emerald-600">{etaText}</p>
                </div>
                <div>
                  <p className="text-gray-500">Elapsed</p>
                  <p className="font-semibold text-purple-600">{elapsed}s</p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Inline preview removed. All review happens in modal. */}

        {/* Bottom actions removed in modal-only flow */}

        {/* Preview & Save Modal */}
        <SmartImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            // Don't reload - state is now persisted in sessionStorage
          }}
          questions={questions}
          selectedIds={selectedQuestions}
          onToggleSelect={toggleQuestionSelection}
          onSelectAll={selectAllQuestions}
          onDeselectAll={deselectAllQuestions}
          onApproveSelected={bulkApproveQuestions}
          onSaveSelected={saveSelectedToBank}
          onClearStorage={() => {
            // Clear storage when questions are successfully saved
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(BATCH_KEY);
            setQuestions([]);
            setCurrentBatch(null);
            setSelectedQuestions(new Set());
          }}
        />
      </div>
    </div>
  );
};

export default SmartQuestionImport;
