"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
import SmartImportPreviewModal from "./SmartImportPreviewModal";
import MathText from "@/components/ui/MathText";
import EquationEditor from "@/components/ui/EquationEditor";

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
  "Scholarships",
];

const SECTION_OPTIONS = [
  "Objective",
  "Very Short",
  "Short",
  "Long",
  "Case Study",
];

const DIFFICULTY_OPTIONS = [
  { value: "mixed", label: "Mixed" },
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

type QuestionOption = { text: string; isCorrect: boolean };

interface AIToolsProps {
  onClose?: () => void;
}

type SelectOption = { value: string; label: string };

function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-left flex items-center justify-between disabled:bg-gray-100 disabled:text-gray-500"
      >
        <span className={selected ? "text-gray-900" : "text-gray-500"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 ${
                opt.value === value
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [questionCount] = useState("10");
  const [difficulty, setDifficulty] = useState("mixed");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");

  // Initialize metadata from localStorage on mount
  useEffect(() => {
    try {
      const savedMetadata = localStorage.getItem("aiquestion_metadata");
      if (savedMetadata) {
        const metadata = JSON.parse(savedMetadata);
        if (metadata.subject) setSubject(metadata.subject);
        if (metadata.className) setClassName(metadata.className);
        if (metadata.topic) setTopic(metadata.topic);
        if (metadata.board) setBoard(metadata.board);
        if (metadata.chapter) setChapter(metadata.chapter);
        if (metadata.section) setSection(metadata.section);
        if (metadata.marks) setMarks(metadata.marks);
        if (metadata.difficulty) setDifficulty(metadata.difficulty);
        if (metadata.selectedModel) setSelectedModel(metadata.selectedModel);
      }
    } catch {
      // Silent fail - localStorage might not be available
    }
  }, []);

  // Persist metadata to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "aiquestion_metadata",
        JSON.stringify({
          subject,
          className,
          topic,
          board,
          chapter,
          section,
          marks,
          difficulty,
          selectedModel,
        })
      );
    } catch {
      // Silent fail
    }
  }, [subject, className, topic, board, chapter, section, marks, difficulty, selectedModel]);

  // Manual Add Questions (Text Input mode only, no AI)
  const [manualQuestionText, setManualQuestionText] = useState("");
  const [manualQuestionType, setManualQuestionType] = useState("mcq");
  const [manualOptions, setManualOptions] = useState<QuestionOption[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [manualCorrectAnswerText, setManualCorrectAnswerText] = useState("");
  const [manualDiagramFile, setManualDiagramFile] = useState<File | null>(null);
  const [manualDiagramPreview, setManualDiagramPreview] = useState("");
  const [manualQuestions, setManualQuestions] = useState<GeneratedQuestion[]>([]);
  const [uploadingDiagram, setUploadingDiagram] = useState(false);
  const [uploadingQuestionDiagramId, setUploadingQuestionDiagramId] =
    useState<string | null>(null);

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

  const resetManualComposer = useCallback(() => {
    setManualQuestionText("");
    setManualQuestionType("mcq");
    setManualOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setManualCorrectAnswerText("");
    setManualDiagramFile(null);
    setManualDiagramPreview("");
  }, []);

  // Reset all form data including localStorage
  const resetAllForm = useCallback(() => {
    if (confirm("Are you sure you want to reset all form data?")) {
      setSubject("");
      setClassName("");
      setTopic("");
      setBoard("");
      setChapter("");
      setSection("");
      setMarks("");
      setDifficulty("mixed");
      setSelectedModel("gemini-2.5-pro");
      setManualQuestions([]);
      resetManualComposer();
      try {
        localStorage.removeItem("aiquestion_metadata");
      } catch {
        // Silent fail
      }
      setError(null);
      setSuccess(null);
    }
  }, [resetManualComposer]);

  const handleManualOptionTextChange = (index: number, value: string) => {
    setManualOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text: value } : opt))
    );
  };

  const handleManualOptionCorrect = (index: number) => {
    setManualOptions((prev) =>
      prev.map((opt, i) => ({ ...opt, isCorrect: i === index }))
    );
  };

  // Map question type to auto-selected section
  const getSectionForQuestionType = (type: string): string => {
    switch (type) {
      case "mcq":
      case "truefalse":
      case "assertionreason":
        return "Objective";
      case "fill":
      case "short":
      case "integer":
        return "Short";
      case "long":
        return "Long";
      default:
        return "Short";
    }
  };

  // Auto-select section when question type changes in manual mode
  useEffect(() => {
    if (inputMode === "text") {
      const autoSection = getSectionForQuestionType(manualQuestionType);
      setSection(autoSection);
    }
  }, [manualQuestionType, inputMode]);

  const handleManualDiagramInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setManualDiagramFile(null);
      setManualDiagramPreview("");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Diagram must be an image (JPG, PNG, WEBP, GIF, BMP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Diagram too large. Maximum size is 10MB.");
      return;
    }

    setManualDiagramFile(file);
    setManualDiagramPreview(URL.createObjectURL(file));
    setError(null);
  };

  const uploadManualDiagram = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const result = (await apiFetch("/uploads/image", {
      method: "POST",
      body: formData,
      headers: {},
    })) as { url?: string };

    if (!result?.url) {
      throw new Error("Failed to upload diagram image");
    }

    return result.url;
  };

  const updateManualQuestion = (
    id: string,
    updater: (q: GeneratedQuestion) => GeneratedQuestion
  ) => {
    setManualQuestions((prev) => prev.map((q) => (q._id === id ? updater(q) : q)));
  };

  const updateManualQuestionType = (id: string, type: string) => {
    updateManualQuestion(id, (q) => {
      if (type === "mcq") {
        return {
          ...q,
          type,
          options:
            q.options && q.options.length >= 2
              ? q.options
              : [
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
                ],
          correctAnswerText: "",
          integerAnswer: undefined,
        };
      }

      if (type === "truefalse") {
        return {
          ...q,
          type,
          options: [
            { text: "True", isCorrect: false },
            { text: "False", isCorrect: false },
          ],
          correctAnswerText: "",
          integerAnswer: undefined,
        };
      }

      return {
        ...q,
        type,
        options: undefined,
        correctAnswerText: "",
        integerAnswer: undefined,
      };
    });
  };

  const updateManualOption = (id: string, index: number, text: string) => {
    updateManualQuestion(id, (q) => {
      const options = q.options ? [...q.options] : [];
      while (options.length <= index) {
        options.push({ text: "", isCorrect: false });
      }
      options[index] = { ...options[index], text };
      return { ...q, options };
    });
  };

  const markManualOptionCorrect = (id: string, index: number) => {
    updateManualQuestion(id, (q) => {
      const options = (q.options || []).map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      return {
        ...q,
        options,
        correctAnswerText: options[index]?.text || "",
      };
    });
  };

  const attachDiagramToManualQuestion = async (id: string, file: File) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Diagram must be an image (JPG, PNG, WEBP, GIF, BMP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Diagram too large. Maximum size is 10MB.");
      return;
    }

    try {
      setUploadingQuestionDiagramId(id);
      const diagramUrl = await uploadManualDiagram(file);
      updateManualQuestion(id, (q) => ({ ...q, diagramUrl }));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload diagram");
    } finally {
      setUploadingQuestionDiagramId(null);
    }
  };

  const validateManualDraft = (): string | null => {
    if (!manualQuestionText.trim()) {
      return "Question text is required";
    }

    if (manualQuestionType === "mcq") {
      const validOptions = manualOptions.filter((opt) => opt.text.trim());
      if (validOptions.length < 2) {
        return "Please provide at least two options for MCQ";
      }
      if (!manualOptions.some((opt) => opt.isCorrect && opt.text.trim())) {
        return "Please mark one correct option for MCQ";
      }
    }

    if (manualQuestionType === "truefalse" && !manualCorrectAnswerText) {
      return "Please mark the correct answer (True/False)";
    }

    if (
      manualQuestionType !== "mcq" &&
      manualQuestionType !== "truefalse" &&
      !manualCorrectAnswerText.trim()
    ) {
      return "Please provide the correct answer";
    }

    if (
      manualQuestionType === "integer" &&
      Number.isNaN(Number(manualCorrectAnswerText.trim()))
    ) {
      return "Integer answer must be a valid number";
    }

    return null;
  };

  const validateManualQuestionList = (): string | null => {
    if (manualQuestions.length === 0) {
      return "Please add at least one manual question";
    }

    if (manualQuestions.length > 10) {
      return "You can save up to 10 questions at a time";
    }

    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.text?.trim()) {
        return `Question ${i + 1} text is required`;
      }

      if (q.type === "mcq") {
        const opts = (q.options || []).filter((o) => o.text.trim());
        if (opts.length < 2) return `Question ${i + 1} needs at least 2 options`;
        if (!opts.some((o) => o.isCorrect)) {
          return `Question ${i + 1} must have one correct option`;
        }
      } else if (q.type === "truefalse") {
        if (!q.correctAnswerText || !["True", "False"].includes(q.correctAnswerText)) {
          return `Question ${i + 1} must have correct answer True or False`;
        }
      } else if (q.type === "integer") {
        if (q.correctAnswerText && Number.isNaN(Number(q.correctAnswerText))) {
          return `Question ${i + 1} integer answer must be numeric`;
        }
        if (q.integerAnswer === undefined && !q.correctAnswerText?.trim()) {
          return `Question ${i + 1} needs an integer answer`;
        }
      } else {
        if (!q.correctAnswerText?.trim()) {
          return `Question ${i + 1} needs a correct answer`;
        }
      }
    }

    return null;
  };

  const normalizeDifficultyForSave = (value?: string) => {
    if (!value) return "medium";
    const normalized = value.toLowerCase().trim();
    if (normalized === "mixed") return "medium";
    if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
      return normalized;
    }
    return "medium";
  };

  const handleAddManualQuestion = async () => {
    setError(null);
    setSuccess(null);

    if (manualQuestions.length >= 10) {
      setError("You can add up to 10 questions at a time before saving.");
      return;
    }

    const validationError = validateManualDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploadingDiagram(true);

      let diagramUrl: string | undefined;
      if (manualDiagramFile) {
        diagramUrl = await uploadManualDiagram(manualDiagramFile);
      }

      const normalizedOptions =
        manualQuestionType === "mcq"
          ? manualOptions.filter((opt) => opt.text.trim())
          : manualQuestionType === "truefalse"
          ? [
              { text: "True", isCorrect: manualCorrectAnswerText === "True" },
              {
                text: "False",
                isCorrect: manualCorrectAnswerText === "False",
              },
            ]
          : undefined;

      const questionId = `manual-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const newQuestion: GeneratedQuestion = {
        _id: questionId,
        questionNumber: manualQuestions.length + 1,
        text: manualQuestionText.trim(),
        type: manualQuestionType,
        status: "approved",
        difficulty,
        options: normalizedOptions,
        correctAnswerText:
          manualQuestionType === "mcq"
            ? normalizedOptions?.find((opt) => opt.isCorrect)?.text
            : manualCorrectAnswerText.trim() || undefined,
        integerAnswer:
          manualQuestionType === "integer"
            ? Number(manualCorrectAnswerText.trim())
            : undefined,
        diagramUrl,
      };

      setManualQuestions((prev) => [...prev, newQuestion]);
      setSuccess("Question queued. Click Save Added Questions to persist to DB.");
      resetManualComposer();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setUploadingDiagram(false);
    }
  };

  const removeManualQuestion = (id: string) => {
    setManualQuestions((prev) =>
      prev
        .filter((q) => q._id !== id)
        .map((q, index) => ({ ...q, questionNumber: index + 1 }))
    );
  };

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
      inputMode !== "text" &&
      (!questionCount || isNaN(Number(questionCount)) || Number(questionCount) < 1)
    ) {
      setError("Valid question count is required");
      return false;
    }
    if (inputMode === "text" && manualQuestions.length === 0) {
      setError("Please add at least one manual question");
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
        endpoint = "/ai/ai-generate/text";
        jsonBody = { ...baseData, text: "" };
      } else {
        const isPDF = selectedFile!.type === "application/pdf";
        endpoint = isPDF
          ? "/ai/ai-generate/pdf"
          : "/ai/ai-generate/image";

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

  const handleSaveManualQuestions = async () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    const validationError = validateManualQuestionList();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload = manualQuestions.map((q) => ({
        text: q.text,
        type: q.type,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        class: className.trim(),
        board: board.trim() || undefined,
        chapter: chapter.trim() || undefined,
        section: section.trim() || undefined,
        marks: marks.trim() ? Number(marks) : undefined,
        difficulty: normalizeDifficultyForSave(q.difficulty ?? difficulty),
        source: "Manual",
        options: q.options,
        correctAnswerText:
          q.type === "mcq"
            ? q.options?.find((opt) => opt.isCorrect)?.text || ""
            : q.correctAnswerText,
        integerAnswer:
          q.type === "integer"
            ? q.integerAnswer ?? Number(q.correctAnswerText)
            : q.integerAnswer,
        assertion: q.assertion,
        reason: q.reason,
        diagramUrl: q.diagramUrl,
      }));

      const result = (await apiFetch("/ai/save-questions", {
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

      setManualQuestions([]);
      resetManualComposer();
    } catch (err: unknown) {
      console.error("[Add Questions] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save questions");
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
        difficulty: normalizeDifficultyForSave(
          overrides?.[q._id]?.difficulty ?? q.difficulty ?? difficulty
        ),
        source: "Smart Import",
        options: overrides?.[q._id]?.options ?? q.options,
        correctAnswerText:
          overrides?.[q._id]?.correctAnswerText ?? q.correctAnswerText,
        integerAnswer: q.integerAnswer,
        assertion: q.assertion,
        reason: q.reason,
        diagramUrl: overrides?.[q._id]?.diagramUrl ?? undefined,
      }));

      const result = (await apiFetch("/ai/save-questions", {
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

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [error, success]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
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
                  Add Questions
                </h1>
                <p className="text-gray-600 mt-1">
                  Add teacher-authored questions with diagrams and marked
                  correct answers
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

        </motion.div>

        {/* Popup Toast Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="fixed top-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md p-4 bg-red-50 border border-red-200 rounded-xl shadow-xl flex items-start space-x-3"
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-semibold">Error</p>
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
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="fixed top-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl flex items-start space-x-3"
            >
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800 font-semibold">Success</p>
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

        {/* Input Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Choose Input Method
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => {
                setInputMode("file");
              }}
              className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                inputMode === "file"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <DocumentArrowUpIcon
                className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${
                  inputMode === "file" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-sm sm:text-base text-gray-900">Upload File</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">PDF or Image</p>
            </button>

            <button
              onClick={() => {
                setInputMode("camera");
                setSelectedFile(null);
              }}
              className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                inputMode === "camera"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CameraIcon
                className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${
                  inputMode === "camera" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-sm sm:text-base text-gray-900">Camera</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Take Photo</p>
            </button>

            <button
              onClick={() => {
                setInputMode("text");
                setSelectedFile(null);
              }}
              className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                inputMode === "text"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <DocumentTextIcon
                className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${
                  inputMode === "text" ? "text-indigo-600" : "text-gray-400"
                }`}
              />
              <p className="font-medium text-sm sm:text-base text-gray-900">Text Input</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Manual Entry
              </p>
            </button>
          </div>
        </motion.div>

        {/* File Upload or Text Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6"
        >
          {inputMode === "text" ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Question Composer Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 rounded-xl border border-indigo-200">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
                  Compose Question
                </h3>
                
                {/* Question Text with Equation Editor */}
                <div className="mb-6">
                  <EquationEditor
                    value={manualQuestionText}
                    onChange={setManualQuestionText}
                    label="Question Text (with math support)"
                    placeholder="Enter your question. Use toolbar for math symbols..."
                    showPreview={true}
                  />
                </div>

                {/* Question Type Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Question Type
                    </label>
                    <SelectMenu
                      value={manualQuestionType}
                      onChange={setManualQuestionType}
                      placeholder="Select question type"
                      options={[
                        { value: "mcq", label: "MCQ" },
                        { value: "truefalse", label: "True / False" },
                        { value: "fill", label: "Fill in the Blank" },
                        { value: "short", label: "Short Answer" },
                        { value: "long", label: "Long Answer" },
                        { value: "integer", label: "Integer" },
                        { value: "assertionreason", label: "Assertion-Reason" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Attach Diagram (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleManualDiagramInput}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white cursor-pointer file:cursor-pointer"
                    />
                    {manualDiagramFile && (
                      <p className="text-xs text-green-600 font-medium mt-2">
                        ✓ {manualDiagramFile.name} selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Diagram Preview */}
                {manualDiagramPreview && (
                  <div className="mb-6 p-4 bg-white rounded-lg border-2 border-indigo-200">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Diagram Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={manualDiagramPreview}
                      alt="Diagram preview"
                      className="max-h-64 rounded-lg object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Answer Section - Conditional based on Question Type */}
                {manualQuestionType === "mcq" && (
                  <div className="bg-white p-6 rounded-lg border-2 border-amber-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      MCQ Options & Correct Answer
                    </label>
                  <div className="space-y-4">
                    {manualOptions.map((option, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          option.isCorrect
                            ? "border-green-400 bg-green-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <input
                            type="radio"
                            name="manual-correct-option"
                            checked={option.isCorrect}
                            onChange={() => handleManualOptionCorrect(index)}
                            className="h-5 w-5 text-indigo-600 mt-1 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            Option {index + 1}
                          </span>
                          {option.isCorrect && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) =>
                            handleManualOptionTextChange(index, e.target.value)
                          }
                          placeholder={`Enter option ${index + 1}...`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                        {!!option.text?.trim() && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Preview</p>
                            <MathText text={option.text} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manualQuestionType === "truefalse" && (
                <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Select Correct Answer
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: "True", color: "green", icon: "✓" },
                      { value: "False", color: "red", icon: "✗" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setManualCorrectAnswerText(option.value)}
                        className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                          manualCorrectAnswerText === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                            : `border-gray-200 bg-white text-gray-600 hover:border-gray-300`
                        }`}
                      >
                        <span className="text-2xl block mb-2">{option.icon}</span>
                        {option.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {manualQuestionType !== "mcq" && manualQuestionType !== "truefalse" && (
                <div className="bg-white p-6 rounded-lg border-2 border-purple-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Correct Answer
                  </label>
                  <textarea
                    value={manualCorrectAnswerText}
                    onChange={(e) => setManualCorrectAnswerText(e.target.value)}
                    placeholder="Enter the correct answer..."
                    rows={manualQuestionType === "long" ? 4 : 2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
                  />
                  {!!manualCorrectAnswerText.trim() && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Preview</p>
                      <p className="text-sm text-gray-700">{manualCorrectAnswerText}</p>
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Action Buttons */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg border-2 border-blue-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                <div className="flex-1 flex gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    disabled={uploadingDiagram}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base disabled:bg-gray-400 shadow-md transition-all hover:shadow-lg"
                  >
                    {uploadingDiagram ? "⏳ Uploading..." : "✓ Queue Question"}
                  </button>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-sm font-bold text-gray-700">
                    Questions Added
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {manualQuestions.length}<span className="text-gray-500 text-lg">/10</span>
                  </p>
                </div>
              </div>

              {manualQuestions.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Questions Ready to Save ({manualQuestions.length})
                  </h3>
                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {manualQuestions.map((q, index) => (
                      <div
                        key={q._id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-3">
                            <p className="text-sm font-semibold text-gray-900">
                              Q{index + 1}
                            </p>
                            <textarea
                              value={q.text}
                              onChange={(e) =>
                                updateManualQuestion(q._id, (x) => ({
                                  ...x,
                                  text: e.target.value,
                                }))
                              }
                              rows={3}
                              placeholder={`Enter question ${index + 1}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            {!!q.text?.trim() && (
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <p className="text-[11px] text-gray-500 mb-1">Math Preview</p>
                                <MathText text={q.text} />
                              </div>
                            )}

                            <SelectMenu
                              value={q.type}
                              onChange={(value) => updateManualQuestionType(q._id, value)}
                              placeholder="Select type"
                              options={[
                                { value: "mcq", label: "MCQ" },
                                { value: "truefalse", label: "True / False" },
                                { value: "fill", label: "Fill in the Blank" },
                                { value: "short", label: "Short Answer" },
                                { value: "long", label: "Long Answer" },
                                { value: "integer", label: "Integer" },
                                { value: "assertionreason", label: "Assertion-Reason" },
                              ]}
                            />

                            {q.type === "mcq" && (
                              <div className="space-y-2">
                                {(q.options || [
                                  { text: "", isCorrect: false },
                                  { text: "", isCorrect: false },
                                  { text: "", isCorrect: false },
                                  { text: "", isCorrect: false },
                                ]).slice(0, 4).map((opt, optIndex) => (
                                  <div key={optIndex} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        checked={!!opt.isCorrect}
                                        onChange={() =>
                                          markManualOptionCorrect(q._id, optIndex)
                                        }
                                        name={`manual-correct-${q._id}`}
                                        className="h-4 w-4 text-indigo-600"
                                      />
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) =>
                                          updateManualOption(
                                            q._id,
                                            optIndex,
                                            e.target.value
                                          )
                                        }
                                        placeholder={`Option ${optIndex + 1}`}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                      />
                                    </div>
                                    {!!opt.text?.trim() && (
                                      <div className="ml-6 text-xs text-gray-600">
                                        <MathText text={opt.text} inline />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.type === "truefalse" && (
                              <SelectMenu
                                value={q.correctAnswerText || ""}
                                onChange={(value) =>
                                  updateManualQuestion(q._id, (x) => ({
                                    ...x,
                                    correctAnswerText: value,
                                    options: [
                                      {
                                        text: "True",
                                        isCorrect: value === "True",
                                      },
                                      {
                                        text: "False",
                                        isCorrect: value === "False",
                                      },
                                    ],
                                  }))
                                }
                                placeholder="Select correct answer"
                                options={[
                                  { value: "True", label: "True" },
                                  { value: "False", label: "False" },
                                ]}
                              />
                            )}

                            {q.type !== "mcq" && q.type !== "truefalse" && (
                              <input
                                type="text"
                                value={q.correctAnswerText || ""}
                                onChange={(e) =>
                                  updateManualQuestion(q._id, (x) => ({
                                    ...x,
                                    correctAnswerText: e.target.value,
                                    integerAnswer:
                                      x.type === "integer" &&
                                      !Number.isNaN(Number(e.target.value))
                                        ? Number(e.target.value)
                                        : x.integerAnswer,
                                  }))
                                }
                                placeholder="Enter correct answer"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            )}

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-gray-600">
                                Diagram (optional)
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void attachDiagramToManualQuestion(
                                      q._id,
                                      file
                                    );
                                  }
                                }}
                                className="w-full text-sm"
                              />
                              {uploadingQuestionDiagramId === q._id && (
                                <p className="text-xs text-indigo-600">Uploading diagram...</p>
                              )}
                              {q.diagramUrl && (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={q.diagramUrl}
                                    alt="Question diagram"
                                    className="max-h-40 rounded border border-gray-200"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeManualQuestion(q._id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Question Details
            </h2>
            <button
              type="button"
              onClick={resetAllForm}
              className="px-3 py-1 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors"
            >
              Reset Form
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Subject - Required */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <SelectMenu
                value={subject}
                onChange={setSubject}
                placeholder="Select Subject"
                options={SUBJECT_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>

            {/* Class - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <SelectMenu
                value={className}
                onChange={setClassName}
                placeholder="Select Class"
                options={CLASS_OPTIONS.map((c) => ({
                  value: c,
                  label: `Class ${c}`,
                }))}
              />
            </div>

            {/* Topic - Hidden for Scholarships */}
            {board !== "Scholarships" && (
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
            )}

            {/* Board */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board
              </label>
              <SelectMenu
                value={board}
                onChange={setBoard}
                placeholder="Select Board"
                options={BOARD_OPTIONS.map((b) => ({ value: b, label: b }))}
              />
            </div>

            {/* Chapter - Hidden for Scholarships */}
            {board !== "Scholarships" && (
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
            )}

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section {inputMode === "text" && <span className="text-xs text-indigo-600">(Auto-selected)</span>}
              </label>
              <SelectMenu
                value={section}
                onChange={setSection}
                placeholder="Select Section"
                options={SECTION_OPTIONS.map((s) => ({ value: s, label: s }))}
                disabled={inputMode === "text"}
              />
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

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <SelectMenu
                value={difficulty}
                onChange={setDifficulty}
                placeholder="Select Difficulty"
                options={DIFFICULTY_OPTIONS.map((d) => ({
                  value: d.value,
                  label: d.label,
                }))}
              />
            </div>

            {/* AI Model */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
               
              </label>
              {inputMode === "text" ? (
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  
                </div>
              ) : (
                <>
                  <SelectMenu
                    value={selectedModel}
                    onChange={setSelectedModel}
                    placeholder="Select AI Model"
                    options={MODEL_OPTIONS.map((model) => ({
                      value: model.value,
                      label: model.label,
                    }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      MODEL_OPTIONS.find((m) => m.value === selectedModel)
                        ?.description
                    }
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center px-4 sm:px-0"
        >
          <button
            onClick={inputMode === "text" ? handleSaveManualQuestions : handleGenerate}
            disabled={generating || uploadingDiagram}
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base text-white shadow-lg transition-all transform hover:scale-105 ${
              generating || uploadingDiagram
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            }`}
          >
            {generating ? (
              <span className="flex items-center space-x-3">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Generating Questions...</span>
              </span>
            ) : uploadingDiagram ? (
              <span className="flex items-center space-x-3">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Uploading Diagram...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-3">
                {inputMode === "text" ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  <SparklesIcon className="w-5 h-5" />
                )}
                <span>
                  {inputMode === "text"
                    ? "Save Added Questions"
                    : "Generate Questions"}
                </span>
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
