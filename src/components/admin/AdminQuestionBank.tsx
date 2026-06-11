"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { apiFetch } from "../../lib/api";
import { Modal } from "../ui/modal";
import { notify } from "../ui/toast";
import { Skeleton } from "../ui/skeleton";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  BookOpen,
  Tag,
  BarChart3,
  Filter,
  XCircle,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  GraduationCap,
  Wand2,
  X,
  Check,
} from "lucide-react";

// ─── Professional custom filter dropdown ───────────────────────────────────
interface FilterSelectOption { label: string; value: string; }
interface FilterSelectProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  searchable?: boolean;
}
const FilterSelect: React.FC<FilterSelectProps> = ({
  label, icon, value, onChange, options, placeholder = "All", searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Auto-focus search when opened
  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open, searchable]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selectedLabel = options.find(o => o.value === value)?.label ?? (value || "");

  return (
    <div ref={ref} className="relative">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
        {icon}{label}
      </p>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-xl border-2 transition-all font-medium text-left
          ${open ? "border-blue-500 ring-2 ring-blue-500/20 bg-white" : "border-gray-200 bg-white hover:border-blue-300"}
          ${value ? "text-gray-900" : "text-gray-400"}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange(""), setOpen(false))}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full left-0 mt-1 w-full min-w-[180px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                  />
                </div>
              </div>
            )}
            <div className="max-h-52 overflow-y-auto py-1">
              {/* All / reset option */}
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors
                  ${!value ? "text-blue-600 font-semibold bg-blue-50/60" : "text-gray-500"}`}
              >
                <span>{placeholder}</span>
                {!value && <Check className="w-3.5 h-3.5" />}
              </button>
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400 italic">No results</p>
              )}
              {filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors
                    ${value === opt.value ? "text-blue-700 font-semibold bg-blue-50" : "text-gray-700"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Diagram renderer ─────────────────────────────────────────────────────────

const DiagramRenderer: React.FC<{
  diagram?: { url?: string; svgInline?: string; alt?: string; kind?: string };
  diagramUrl?: string;
}> = ({ diagram, diagramUrl }) => {
  // Rich SVG inline (vector diagram from PDF extraction)
  if (diagram?.svgInline) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: diagram.svgInline }}
        />
      </div>
    );
  }
  // Rich raster URL
  if (diagram?.url) {
    return (
      <div className="my-3">
        <Image
          src={diagram.url}
          alt={diagram.alt || "Question diagram"}
          width={560}
          height={400}
          className="max-w-full rounded-lg border border-gray-200"
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  }
  // Legacy diagramUrl fallback
  if (diagramUrl) {
    return (
      <div className="my-3">
        <Image
          src={diagramUrl}
          alt="Question diagram"
          width={400}
          height={300}
          className="max-w-md rounded-lg border border-gray-200"
        />
      </div>
    );
  }
  return null;
};

// ── Table renderer ────────────────────────────────────────────────────────────

const TableDataRenderer: React.FC<{
  tableData?: { headers: string[]; rows: string[][]; html: string; caption?: string };
}> = ({ tableData }) => {
  if (!tableData) return null;
  const { headers, rows, caption } = tableData;
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
      {caption && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-medium">
          {caption}
        </div>
      )}
      <table className="min-w-full text-sm divide-y divide-gray-200">
        {headers.length > 0 && (
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                  <MathText text={h || ""} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "" : "bg-gray-50/50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-800 align-top">
                  <MathText text={cell || ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper component to render text with LaTeX math
const MathText: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => {
  if (!text) return null;

  // Split text by math delimiters: $...$ for inline, $$...$$ for block
  const parts: Array<{ type: "text" | "inline" | "block"; content: string }> =
    [];
  let remaining = text;

  // First, handle block math $$...$$
  const blockRegex = /\$\$([^$]+)\$\$/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "block", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    remaining = text.slice(lastIndex);
  } else {
    remaining = "";
  }

  // Then handle inline math $...$ in remaining text
  if (remaining) {
    const inlineRegex = /\$([^$]+)\$/g;
    let inlineLastIndex = 0;
    let inlineMatch;

    while ((inlineMatch = inlineRegex.exec(remaining)) !== null) {
      if (inlineMatch.index > inlineLastIndex) {
        parts.push({
          type: "text",
          content: remaining.slice(inlineLastIndex, inlineMatch.index),
        });
      }
      parts.push({ type: "inline", content: inlineMatch[1] });
      inlineLastIndex = inlineMatch.index + inlineMatch[0].length;
    }

    if (inlineLastIndex < remaining.length) {
      parts.push({ type: "text", content: remaining.slice(inlineLastIndex) });
    }
  }

  // If no math found, just return plain text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "block") {
          try {
            return <BlockMath key={i} math={part.content} />;
          } catch {
            return (
              <span key={i} className="text-red-500">
                Math Error
              </span>
            );
          }
        }
        if (part.type === "inline") {
          try {
            return <InlineMath key={i} math={part.content} />;
          } catch {
            return (
              <span key={i} className="text-red-500">
                {part.content}
              </span>
            );
          }
        }
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
};

interface QuestionOption {
  _id?: string;
  text: string;
  isCorrect?: boolean;
}

// Updated Question interface to match ClassQuestion model (flat structure)
interface Question {
  _id: string;
  text: string;
  type: string;
  // Flat metadata (matches ClassQuestion model)
  subject?: string;
  topic?: string;
  difficulty?: string;
  chapter?: string;
  board?: string;
  section?: string;
  marks?: number;
  // For backward compatibility, also support nested tags
  tags?: {
    subject?: string;
    topic?: string;
    difficulty?: string;
    chapter?: string;
  };
  options?: QuestionOption[];
  explanation?: string;
  correctAnswerText?: string;
  assertion?: string;
  reason?: string;
  assertionIsTrue?: boolean;
  reasonIsTrue?: boolean;
  reasonExplainsAssertion?: boolean;
  integerAnswer?: number;
  isPYQ?: boolean;
  pyqYear?: number;
  pyqExam?: string;
  pyqShift?: string;
  diagramUrl?: string;
  // Rich diagram and table data (from PDF extraction)
  diagram?: {
    url?: string;
    svgInline?: string;
    alt?: string;
    kind?: 'image' | 'vector';
  };
  tableData?: {
    headers: string[];
    rows: string[][];
    html: string;
    caption?: string;
  };
  class?: string;
  // Support both old and new source values
  source?:
  | "Manual"
  | "Smart Import"
  | "AI"
  | "Upload"
  | "manual"
  | "imported"
  | "ai-generated";
  createdAt?: string;
  updatedAt?: string;
}

type Draft = Omit<Question, "_id"> & { _id?: string };

const emptyDraft = (sticky?: Partial<Draft>): Draft => ({
  text: "",
  type: sticky?.type ?? "mcq",
  tags: { subject: sticky?.subject ?? "", topic: sticky?.topic ?? "", difficulty: sticky?.difficulty ?? "medium", chapter: sticky?.chapter ?? "" },
  subject: sticky?.subject ?? "",
  topic: sticky?.topic ?? "",
  chapter: sticky?.chapter ?? "",
  difficulty: sticky?.difficulty ?? "medium",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  explanation: "",
  correctAnswerText: "",
  integerAnswer: undefined,
  diagramUrl: "",
  class: sticky?.class ?? "",
  board: sticky?.board ?? "",
  section: sticky?.section ?? "",
  marks: sticky?.marks ?? undefined,
  source: sticky?.source ?? "Manual",
  isPYQ: false,
  pyqYear: undefined,
  pyqExam: "",
  pyqShift: "",
});

const difficultyColors = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200",
};

const typeLabels = {
  mcq: "Multiple Choice",
  "mcq-single": "MCQ Single",
  "mcq-multi": "MCQ Multiple",
  truefalse: "True/False",
  short: "Short Answer",
  long: "Long Answer",
  fill: "Fill in the Blank",
  assertionreason: "Assertion-Reason",
  integer: "Integer Type",
  subjective: "Subjective",
};

const sourceColors = {
  manual: "bg-blue-100 text-blue-700 border-blue-200",
  imported: "bg-purple-100 text-purple-700 border-purple-200",
  "ai-generated": "bg-pink-100 text-pink-700 border-pink-200",
};

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );
  const [modalTab, setModalTab] = useState<"basic" | "options" | "advanced">(
    "basic"
  );

  // Class selector for fetching from class-based collections
  const [selectedClass, setSelectedClass] = useState("11");
  const availableClasses = ["6", "7", "8", "9", "10", "11", "12"];

  // File upload state for diagrams
  const [pendingDiagramFile, setPendingDiagramFile] = useState<File | null>(
    null
  );
  const [uploadingDiagram, setUploadingDiagram] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    type: "",
    subject: "",
    topic: "",
    difficulty: "",
    board: "",
    source: "",
    hasCorrectAnswer: "",
    hasImage: "",
    hasExplanation: "",
    chapter: "",
    isPYQ: "",
    pyqYear: "",
    pyqExam: "",
  });

  // AI Solve state
  const [_solvingId, setSolvingId] = useState<string | null>(null);
  const [solvingBatch, setSolvingBatch] = useState(false);

  // AI Solve Preview State
  const [showSolvePreview, setShowSolvePreview] = useState(false);
  const [solvePreviewData, setSolvePreviewData] = useState<
    {
      id: string;
      original: Question;
      aiResult: {
        correctOptionIndex?: number;
        correctAnswerText?: string;
        explanation: string;
        confidence: string;
        questionType?: string;
      };
      selected: boolean;
    }[]
  >([]);
  const [acceptingSolves, setAcceptingSolves] = useState(false);

  // Available filter options (populated from loaded questions)
  const [filterOptions, setFilterOptions] = useState<{
    types: string[];
    subjects: string[];
    topics: string[];
    chapters: string[];
    boards: string[];
    sources: string[];
    pyqYears: string[];
    pyqExams: string[];
  }>({
    types: [],
    subjects: [],
    topics: [],
    chapters: [],
    boards: [],
    sources: [],
    pyqYears: [],
    pyqExams: [],
  });

  const [loadError, setLoadError] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Bulk meta update state (tracks original values when editing, for "Apply to all" prompt)
  const [originalDraftMeta, setOriginalDraftMeta] = useState<{
    subject?: string; topic?: string; chapter?: string; difficulty?: string; board?: string;
  }>({});
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Sticky metadata — persists across new-question opens for rapid batch entry
  const [stickyMeta, setStickyMeta] = useState<Partial<Draft>>({});
  const addAnotherRef = useRef(false);

  // Ref to abort stale question-list fetches
  const loadAbortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    setLoadError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", itemsPerPage.toString());
      if (query) queryParams.append("query", query);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.subject) queryParams.append("subject", filters.subject);
      if (filters.topic) queryParams.append("topic", filters.topic);
      if (filters.chapter) queryParams.append("chapter", filters.chapter);
      if (filters.difficulty) queryParams.append("difficulty", filters.difficulty);
      if (filters.board) queryParams.append("board", filters.board);
      if (filters.source) queryParams.append("source", filters.source);
      if (filters.hasCorrectAnswer) queryParams.append("hasCorrectAnswer", filters.hasCorrectAnswer);
      if (filters.hasImage) queryParams.append("hasImage", filters.hasImage);
      if (filters.hasExplanation) queryParams.append("hasExplanation", filters.hasExplanation);
      if (filters.isPYQ) queryParams.append("isPYQ", filters.isPYQ);
      if (filters.pyqYear) queryParams.append("pyqYear", filters.pyqYear);
      if (filters.pyqExam) queryParams.append("pyqExam", filters.pyqExam);

      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
      const url = `${base}/ai/questions/class/${selectedClass}?${queryParams.toString()}`;
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
      }

      const response = (await res.json()) as {
        success: boolean;
        data: {
          questions: Array<{
            _id: string; text: string; type: string;
            subject?: string; topic?: string; difficulty?: string;
            chapter?: string; board?: string; section?: string; marks?: number;
            options?: Question["options"]; explanation?: string; solutionText?: string;
            correctAnswerText?: string; integerAnswer?: number; assertion?: string; reason?: string;
            assertionIsTrue?: boolean; reasonIsTrue?: boolean; reasonExplainsAssertion?: boolean;
            diagramUrl?: string; source?: string; createdAt?: string; updatedAt?: string;
            isPYQ?: boolean; pyqYear?: number; pyqExam?: string; pyqShift?: string;
          }>;
          total: number; page: number; totalPages: number; class: string;
        };
      };

      if (controller.signal.aborted) return;
      if (!response.success) throw new Error("Failed to fetch questions");

      const mappedQuestions: Question[] = (response.data.questions || []).map((q) => ({
        _id: q._id,
        text: q.text,
        type: q.type,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        chapter: q.chapter,
        board: q.board,
        section: q.section,
        marks: q.marks,
        tags: { subject: q.subject, topic: q.topic, difficulty: q.difficulty, chapter: q.chapter },
        options: q.options,
        explanation: q.explanation || q.solutionText,
        correctAnswerText: q.correctAnswerText,
        integerAnswer: q.integerAnswer,
        assertion: q.assertion,
        reason: q.reason,
        assertionIsTrue: q.assertionIsTrue,
        reasonIsTrue: q.reasonIsTrue,
        reasonExplainsAssertion: q.reasonExplainsAssertion,
        isPYQ: q.isPYQ,
        pyqYear: q.pyqYear,
        pyqExam: q.pyqExam,
        pyqShift: q.pyqShift,
        diagramUrl: q.diagramUrl,
        diagram: (q as Record<string, unknown>).diagram as Question["diagram"],
        tableData: (q as Record<string, unknown>).tableData as Question["tableData"],
        class: selectedClass,
        source: q.source as Question["source"],
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      }));

      setQuestions(mappedQuestions);
      setTotalPages(response.data.totalPages || 1);
      setTotalQuestions(response.data.total || 0);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return; // stale request cancelled — ignore
      console.error("Error loading questions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load questions";
      setLoadError(errorMessage);
      setQuestions([]);
      notify.error(errorMessage);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [selectedClass, currentPage, itemsPerPage, query, filters]);

  // Load questions whenever load fn changes (deps: class, page, filters, query)
  useEffect(() => {
    load();
    return () => { loadAbortRef.current?.abort(); };
  }, [load]);

  // Fetch all subjects+boards once per class change
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const res = await fetch(`${base}/ai/questions/class/${selectedClass}/filters`, {
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        const data = (await res.json()) as { success: boolean; data: { subjects: string[]; boards: string[]; chapters: string[]; topics: string[]; sources: string[]; types: string[]; pyqYears?: number[]; pyqExams?: string[] } };
        if (data.success) {
          setFilterOptions(prev => ({
            ...prev,
            subjects: (data.data.subjects || []).filter(Boolean).sort(),
            boards: (data.data.boards || []).filter(Boolean).sort(),
            chapters: (data.data.chapters || []).filter(Boolean).sort(),
            topics: (data.data.topics || []).filter(Boolean).sort(),
            sources: (data.data.sources || []).filter(Boolean).sort(),
            types: (data.data.types || []).filter(Boolean).sort(),
            pyqYears: (data.data.pyqYears || []).map(String),
            pyqExams: (data.data.pyqExams || []).filter(Boolean).sort(),
          }));
        }
      } catch (e) { console.error("fetchSubjects error", e); }
    }
    fetchSubjects();
  }, [selectedClass]);

  // Re-fetch chapters & topics when subject filter changes (cascading dropdowns)
  useEffect(() => {
    async function fetchCascaded() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const qs = filters.subject ? `?subject=${encodeURIComponent(filters.subject)}` : "";
        const res = await fetch(`${base}/ai/questions/class/${selectedClass}/filters${qs}`, {
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        const data = (await res.json()) as { success: boolean; data: { chapters: string[]; topics: string[]; sources: string[]; types: string[] } };
        if (data.success) {
          setFilterOptions(prev => ({
            ...prev,
            chapters: (data.data.chapters || []).filter(Boolean).sort(),
            topics: (data.data.topics || []).filter(Boolean).sort(),
          }));
        }
      } catch (e) { console.error("fetchCascaded error", e); }
    }
    fetchCascaded();
  }, [selectedClass, filters.subject]);

  // Helper: update a single filter key AND reset to page 1 atomically
  // When subject changes, also clear topic/chapter since their options will cascade
  const setFilter = useCallback((key: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === "subject") { next.topic = ""; next.chapter = ""; }
      return next;
    });
    setCurrentPage(1);
  }, []);

  // questions IS the paginated list now
  const paginatedQuestions = questions;

  function onCreate() {
    addAnotherRef.current = false;
    setDraft(emptyDraft(stickyMeta));
    setOriginalDraftMeta({});
    setModalTab("basic");
    setOpen(true);
  }

  function onEdit(q: Question) {
    const sub = q.subject || q.tags?.subject || '';
    const top = q.topic || q.tags?.topic || '';
    const ch = q.chapter || q.tags?.chapter || '';
    const diff = q.difficulty || q.tags?.difficulty || 'medium';
    const brd = q.board || '';
    setOriginalDraftMeta({ subject: sub, topic: top, chapter: ch, difficulty: diff, board: brd });
    setDraft({
      ...q,
      class: q.class || selectedClass,
      subject: sub,
      topic: top,
      chapter: ch,
      difficulty: diff,
      isPYQ: q.isPYQ ?? false,
      pyqYear: q.pyqYear,
      pyqExam: q.pyqExam ?? "",
      pyqShift: q.pyqShift ?? "",
    });
    setModalTab("basic");
    setOpen(true);
  }

  function onDuplicate(q: Question) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...duplicated } = q;
    duplicated.text = `${duplicated.text} (Copy)`;
    setDraft(duplicated);
    setOpen(true);
  }

  async function bulkUpdateMeta(field: string, fromValue: string, toValue: string) {
    if (!toValue.trim()) return;
    const cls = draft.class || selectedClass;
    const label = field.charAt(0).toUpperCase() + field.slice(1);
    const fromLabel = fromValue || '(empty/unknown)';
    if (!confirm(`Change ${label} from "${fromLabel}" → "${toValue}" for ALL matching questions in Class ${cls}?\n\nThis cannot be undone.`)) return;
    setBulkUpdating(true);
    try {
      const resp = await apiFetch(`/ai/questions/class/${cls}/bulk-update-meta`, {
        method: 'PUT',
        body: JSON.stringify({ field, fromValue, toValue }),
      }) as { success: boolean; data?: { updated: number } };
      if (!resp.success) throw new Error('Bulk update failed');
      notify.success(`Updated ${resp.data?.updated ?? 0} questions`);
      await load();
    } catch (e) {
      notify.error((e as Error).message || 'Bulk update failed');
    } finally {
      setBulkUpdating(false);
    }
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.text.trim()) {
      notify.error("Question text required");
      return;
    }
    if (draft.type === "mcq" || draft.type === "mcq-single") {
      const correct = draft.options?.some((o) => o.isCorrect);
      if (!correct) {
        notify.error("Select a correct option for MCQ questions");
        return;
      }
    }
    setSaving(true);
    try {
      let diagramUrl = draft.diagramUrl;

      // Upload diagram file if pending
      if (pendingDiagramFile) {
        setUploadingDiagram(true);
        try {
          const base =
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
          const formData = new FormData();
          formData.append("image", pendingDiagramFile);
          const resp = await fetch(`${base}/uploads/image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken") || ""
                }`,
            },
            body: formData,
          });
          if (resp.ok) {
            const data = await resp.json();
            diagramUrl = data.url;
          } else {
            notify.error("Failed to upload diagram");
          }
        } finally {
          setUploadingDiagram(false);
          setPendingDiagramFile(null);
        }
      }

      // Map FE source values → canonical BE enum values
      const sourceMap: Record<string, string> = {
        manual: 'Manual', Manual: 'Manual',
        imported: 'Smart Import', 'Smart Import': 'Smart Import',
        'ai-generated': 'AI', AI: 'AI',
        Upload: 'Upload',
      };

      const payload = {
        ...draft,
        diagramUrl,
        class: draft.class || selectedClass,
        board: draft.board || undefined,
        section: draft.section || undefined,
        marks: draft.marks || undefined,
        subject: draft.subject || draft.tags?.subject,
        topic: draft.topic || draft.tags?.topic,
        chapter: draft.chapter || draft.tags?.chapter,
        difficulty: draft.difficulty || draft.tags?.difficulty,
        source: sourceMap[draft.source || 'Manual'] || 'Manual',
        integerAnswer: draft.integerAnswer,
        isPYQ: draft.isPYQ ?? false,
        pyqYear: draft.isPYQ ? draft.pyqYear : undefined,
        pyqExam: draft.isPYQ ? (draft.pyqExam || undefined) : undefined,
        pyqShift: draft.isPYQ ? (draft.pyqShift || undefined) : undefined,
      };

      const questionClass = draft.class || selectedClass;

      // Capture meta for sticky reuse
      const newSticky: Partial<Draft> = {
        subject: payload.subject, topic: payload.topic, chapter: payload.chapter,
        difficulty: payload.difficulty, board: payload.board, class: payload.class,
        marks: payload.marks, section: payload.section, source: payload.source as Draft['source'],
      };

      if (draft._id) {
        const response = (await apiFetch(
          `/ai/questions/class/${questionClass}/${draft._id}`,
          { method: "PUT", body: JSON.stringify(payload) }
        )) as { success: boolean };

        if (!response.success) throw new Error("Failed to update question");
        notify.success("Question updated");
        setStickyMeta(newSticky);
        setOpen(false);
        await load();
      } else {
        const response = (await apiFetch(`/ai/save-questions`, {
          method: "POST",
          body: JSON.stringify({ questions: [payload] }),
        })) as { success: boolean; data: { saved: number } };

        if (!response.success || response.data.saved === 0) {
          throw new Error("Failed to create question");
        }

        setStickyMeta(newSticky);

        if (addAnotherRef.current) {
          // Stay open with sticky meta pre-filled, clear text only
          setDraft(emptyDraft(newSticky));
          setOriginalDraftMeta({});
          setModalTab("basic");
          notify.success("Question saved — ready for next one");
        } else {
          notify.success("Question created");
          setOpen(false);
          await load();
        }
        addAnotherRef.current = false;
        await load();
      }
    } catch (e) {
      notify.error((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    setDeletingId(id);
    try {
      // Use class-based delete endpoint
      const response = (await apiFetch(
        `/ai/questions/class/${selectedClass}/${id}`,
        { method: "DELETE" }
      )) as { success: boolean };
      if (!response.success) {
        throw new Error("Failed to delete question");
      }
      notify.success("Deleted");
      setQuestions((qs) => qs.filter((q) => q._id !== id));
    } catch (e) {
      notify.error((e as Error).message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function onBulkDelete() {
    if (selectedIds.size === 0) {
      notify.error("Select questions to delete");
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected questions?`)) return;

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiFetch(`/ai/questions/class/${selectedClass}/${id}`, {
            method: "DELETE",
          })
        )
      );
      notify.success(`${selectedIds.size} questions deleted`);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      notify.error((e as Error).message || "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  }

  // AI Solve single question
  async function _onSolve(id: string) {
    setSolvingId(id);
    try {
      const response = (await apiFetch(
        `/ai/questions/class/${selectedClass}/${id}/solve`,
        {
          method: "POST",
          body: JSON.stringify({ preview: true }),
        }
      )) as {
        success: boolean;
        data: Question;
        aiResult?: {
          correctOptionIndex: number;
          confidence: string;
          explanation: string;
        };
      };

      if (response.success && response.aiResult && response.data) {
        setSolvePreviewData([
          {
            id: response.data._id,
            original: response.data,
            aiResult: response.aiResult,
            selected: true,
          },
        ]);
        setShowSolvePreview(true);
      } else {
        throw new Error("Failed to solve question");
      }
    } catch (e) {
      notify.error((e as Error).message || "AI solve failed");
    } finally {
      setSolvingId(null);
    }
  }

  // AI Solve all questions without answers
  async function onSolveAll() {
    // Find questions without correct answers (all types)
    const unsolved = questions.filter((q) => {
      const isMCQ = [
        "mcq",
        "mcq-single",
        "mcq-multi",
        "Multiple Choice",
        "true-false",
        "truefalse",
        "assertionreason",
      ].includes(q.type);
      if (isMCQ) {
        return !q.options?.some((o) => o.isCorrect);
      } else {
        // For non-MCQ, check if correctAnswerText is empty
        return !q.correctAnswerText;
      }
    });

    if (unsolved.length === 0) {
      notify.error("No unsolved questions found");
      return;
    }

    if (
      !confirm(
        `AI will solve ${unsolved.length} questions without answers. Continue?`
      )
    ) {
      return;
    }

    setSolvingBatch(true);

    try {
      const questionIds = unsolved.map((q) => q._id).filter(Boolean);
      const response = (await apiFetch(
        `/ai/questions/class/${selectedClass}/solve-batch`,
        {
          method: "POST",
          body: JSON.stringify({ questionIds, preview: true }),
        }
      )) as {
        success: boolean;
        data: {
          results: {
            id: string;
            success: boolean;
            aiResult?: {
              correctOptionIndex?: number;
              confidence?: number;
              explanation?: string;
            };
          }[];
        };
      };

      if (response.success && response.data.results) {
        const previews = response.data.results
          .filter((r) => r.success && r.aiResult)
          .map((r) => {
            const original = unsolved.find((q) => q._id === r.id);
            if (!original) return null;
            const ai = r.aiResult;
            const aiResult = {
              correctOptionIndex:
                typeof ai?.correctOptionIndex === "number"
                  ? ai.correctOptionIndex
                  : undefined,
              correctAnswerText:
                typeof ai?.correctOptionIndex === "number" &&
                  original.options &&
                  original.options[ai.correctOptionIndex]
                  ? original.options[ai.correctOptionIndex].text
                  : undefined,
              explanation: ai?.explanation ?? "",
              confidence:
                ai?.confidence !== undefined ? String(ai.confidence) : "",
              questionType: original.type,
            };
            return {
              id: r.id,
              original,
              aiResult,
              selected: true,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (previews.length > 0) {
          setSolvePreviewData(previews);
          setShowSolvePreview(true);
        } else {
          notify.info("No solutions generated");
        }
      }
    } catch (e) {
      notify.error((e as Error).message || "Bulk solve failed");
    } finally {
      setSolvingBatch(false);
    }
  }

  const handleAcceptSolves = async () => {
    const toAccept = solvePreviewData.filter((d) => d.selected);
    if (toAccept.length === 0) return;

    setAcceptingSolves(true);
    try {
      // Prepare updates based on question type
      const updates = toAccept.map((item) => {
        const isMCQ = [
          "mcq",
          "mcq-single",
          "mcq-multi",
          "Multiple Choice",
          "true-false",
          "truefalse",
          "assertionreason",
        ].includes(item.original.type);

        if (isMCQ && item.aiResult.correctOptionIndex !== undefined) {
          // MCQ-style answer
          const updatedOptions = item.original.options?.map((opt, idx) => ({
            ...opt,
            isCorrect: idx === item.aiResult.correctOptionIndex,
          }));

          return {
            id: item.id,
            options: updatedOptions,
            correctAnswerText:
              item.original.options?.[item.aiResult.correctOptionIndex]?.text,
            explanation: item.aiResult.explanation || item.original.explanation,
          };
        } else {
          // Text-based answer
          return {
            id: item.id,
            correctAnswerText: item.aiResult.correctAnswerText,
            explanation: item.aiResult.explanation || item.original.explanation,
          };
        }
      });

      const response = (await apiFetch(
        `/ai/questions/class/${selectedClass}/bulk-update`,
        {
          method: "PUT",
          body: JSON.stringify({ updates }),
        }
      )) as { success: boolean; data: { updated: number } };

      if (response.success) {
        notify.success(
          `Successfully updated ${response.data.updated} questions`
        );
        setShowSolvePreview(false);
        setSolvePreviewData([]);
        // Refresh data while preserving filters
        await load();
      } else {
        throw new Error("Failed to update questions");
      }
    } catch (error) {
      notify.error((error as Error).message || "Failed to accept solutions");
    } finally {
      setAcceptingSolves(false);
    }
  };

  function updateOption(idx: number, patch: Partial<QuestionOption>) {
    setDraft((d) => ({
      ...d,
      options: d.options?.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  }

  function setCorrect(idx: number) {
    if (draft.type === "mcq-multi") {
      // Toggle for multi-select
      setDraft((d) => ({
        ...d,
        options: d.options?.map((o, i) =>
          i === idx ? { ...o, isCorrect: !o.isCorrect } : o
        ),
      }));
    } else {
      // Single select for MCQ
      setDraft((d) => ({
        ...d,
        options: d.options?.map((o, i) => ({ ...o, isCorrect: i === idx })),
      }));
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedQuestions.map((q) => q._id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setFilters({
      type: "",
      subject: "",
      topic: "",
      difficulty: "",
      board: "",
      source: "",
      hasCorrectAnswer: "",
      hasImage: "",
      hasExplanation: "",
      chapter: "",
      isPYQ: "",
      pyqYear: "",
      pyqExam: "",
    });
    setQuery("");
    setCurrentPage(1);
  }

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== "").length + (query ? 1 : 0);

  function hasCorrectAnswer(q: Question): boolean {
    if (q.type === "mcq" || q.type === "mcq-single" || q.type === "mcq-multi") {
      return !!q.options?.some((o) => o.isCorrect);
    }
    return !!q.correctAnswerText;
  }

  // Ctrl+Enter to save while modal is open
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveDraft(e as unknown as React.FormEvent);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, saveDraft]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20"
    >
      <div className="max-w-[1400px] mx-auto px-3 py-4 sm:p-4 md:p-6 lg:p-8">
        {/* Professional Header - Compact on Mobile */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6"
        >
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Question Bank
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                  Comprehensive question management with advanced filtering
                </p>
              </div>
            </div>
            {/* Stats Row - Compact on Mobile */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Class Selector */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-200 shadow-sm">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer text-sm"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats - Compact */}
              <div className="bg-white rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-200 shadow-sm flex items-center gap-2 sm:gap-3">
                <div className="text-center">
                  <span className="text-[10px] sm:text-xs text-gray-500 block">
                    {activeFilterCount > 0 ? "Filtered" : "Total"}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {totalQuestions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modern Actions Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/50 p-3 sm:p-4 md:p-5 mb-4 md:mb-6"
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 sm:gap-4">
            {/* Enhanced Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by text, subject, topic..."
                className="w-full pl-10 sm:pl-12 pr-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all bg-white"
              />
            </div>

            {/* Professional Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl border-2 text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm ${showFilters
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow-md"
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden xs:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${showFilters
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-700"
                      }`}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCreate}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold flex items-center gap-1.5 sm:gap-2 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">New Question</span>
                <span className="xs:hidden">New</span>
              </motion.button>

              {/* AI Solve All Button */}
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSolveAll}
                disabled={solvingBatch}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold flex items-center gap-1.5 sm:gap-2 hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI Solve all MCQs without answers"
              >
                {solvingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Solving...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span className="hidden sm:inline">AI Solve Page</span>
                    <span className="sm:hidden">Solve</span>
                  </>
                )}
              </motion.button>

              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onBulkDelete}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Delete</span> (
                  {selectedIds.size})
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={load}
                disabled={loading}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border-2 border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </motion.button>
            </div>
          </div>

          {/* Enhanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 pt-5 border-t border-gray-200/50"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <FilterSelect
                    label="Question Type"
                    icon={<Tag className="w-3 h-3" />}
                    value={filters.type}
                    onChange={v => setFilter("type", v)}
                    placeholder="All Types"
                    searchable={filterOptions.types.length > 6}
                    options={filterOptions.types.map(t => ({ value: t, label: typeLabels[t as keyof typeof typeLabels] || t }))}
                  />
                  <FilterSelect
                    label="Subject"
                    icon={<BookOpen className="w-3 h-3" />}
                    value={filters.subject}
                    onChange={v => setFilter("subject", v)}
                    placeholder="All Subjects"
                    searchable
                    options={filterOptions.subjects.map(s => ({ value: s, label: s }))}
                  />
                  <FilterSelect
                    label="Topic"
                    icon={<FileText className="w-3 h-3" />}
                    value={filters.topic}
                    onChange={v => setFilter("topic", v)}
                    placeholder={filters.subject ? `Topics in ${filters.subject}` : "All Topics"}
                    searchable
                    options={filterOptions.topics.map(t => ({ value: t, label: t }))}
                  />
                  <FilterSelect
                    label="Chapter"
                    icon={<BookOpen className="w-3 h-3" />}
                    value={filters.chapter}
                    onChange={v => setFilter("chapter", v)}
                    placeholder={filters.subject ? `Chapters in ${filters.subject}` : "All Chapters"}
                    searchable
                    options={filterOptions.chapters.map(c => ({ value: c, label: c }))}
                  />
                  <FilterSelect
                    label="Difficulty"
                    icon={<BarChart3 className="w-3 h-3" />}
                    value={filters.difficulty}
                    onChange={v => setFilter("difficulty", v)}
                    placeholder="All Difficulties"
                    options={[
                      { value: "easy", label: "🟢 Easy" },
                      { value: "medium", label: "🟡 Medium" },
                      { value: "hard", label: "🔴 Hard" },
                    ]}
                  />
                  <FilterSelect
                    label="Board"
                    icon={<BookOpen className="w-3 h-3" />}
                    value={filters.board}
                    onChange={v => setFilter("board", v)}
                    placeholder="All Boards"
                    options={filterOptions.boards.map(b => ({ value: b, label: b }))}
                  />
                  <FilterSelect
                    label="Source"
                    icon={<Upload className="w-3 h-3" />}
                    value={filters.source}
                    onChange={v => setFilter("source", v)}
                    placeholder="All Sources"
                    options={filterOptions.sources.length > 0
                      ? filterOptions.sources.map(s => ({ value: s, label: s }))
                      : [
                        { value: "Manual", label: "Manual" },
                        { value: "Smart Import", label: "Smart Import" },
                        { value: "AI", label: "AI" },
                        { value: "Upload", label: "Upload" },
                      ]
                    }
                  />
                  <FilterSelect
                    label="Correct Answer"
                    icon={<CheckCircle className="w-3 h-3" />}
                    value={filters.hasCorrectAnswer}
                    onChange={v => setFilter("hasCorrectAnswer", v)}
                    placeholder="All"
                    options={[
                      { value: "yes", label: "✅ With Answer" },
                      { value: "no", label: "❌ Without Answer" },
                    ]}
                  />
                  <FilterSelect
                    label="Diagrams / Images"
                    icon={<ImageIcon className="w-3 h-3" />}
                    value={filters.hasImage}
                    onChange={v => setFilter("hasImage", v)}
                    placeholder="All"
                    options={[
                      { value: "yes", label: "🖼️ With Diagram" },
                      { value: "no", label: "— Without Diagram" },
                    ]}
                  />
                  <FilterSelect
                    label="Explanation"
                    icon={<AlertCircle className="w-3 h-3" />}
                    value={filters.hasExplanation}
                    onChange={v => setFilter("hasExplanation", v)}
                    placeholder="All"
                    options={[
                      { value: "yes", label: "📝 With Explanation" },
                      { value: "no", label: "— Without Explanation" },
                    ]}
                  />
                  <FilterSelect
                    label="PYQ"
                    icon={<GraduationCap className="w-3 h-3" />}
                    value={filters.isPYQ}
                    onChange={v => {
                      setFilter("isPYQ", v);
                      if (!v) { setFilter("pyqYear", ""); setFilter("pyqExam", ""); }
                    }}
                    placeholder="All Questions"
                    options={[{ value: "true", label: "⭐ Previous Year Questions" }]}
                  />
                  <FilterSelect
                    label="PYQ Year"
                    icon={<GraduationCap className="w-3 h-3" />}
                    value={filters.pyqYear}
                    onChange={v => { setFilter("pyqYear", v); if (v) setFilter("isPYQ", "true"); }}
                    placeholder="Any Year"
                    searchable
                    options={filterOptions.pyqYears.length > 0
                      ? filterOptions.pyqYears.map(y => ({ value: y, label: y }))
                      : Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => String(new Date().getFullYear() - i)).map(y => ({ value: y, label: y }))
                    }
                  />
                  <FilterSelect
                    label="PYQ Exam"
                    icon={<GraduationCap className="w-3 h-3" />}
                    value={filters.pyqExam}
                    onChange={v => { setFilter("pyqExam", v); if (v) setFilter("isPYQ", "true"); }}
                    placeholder="Any Exam"
                    searchable
                    options={filterOptions.pyqExams.length > 0
                      ? filterOptions.pyqExams.map(e => ({ value: e, label: e }))
                      : ["JEE Main","JEE Advanced","NEET","CBSE Board","ICSE Board","Olympiad"].map(e => ({ value: e, label: e }))
                    }
                  />
                </div>

                {/* Active filter chips + clear */}
                {activeFilterCount > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Active:</span>
                    {filters.subject && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">Subject: {filters.subject}<button onClick={() => setFilter("subject", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.topic && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">Topic: {filters.topic}<button onClick={() => setFilter("topic", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.chapter && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">Chapter: {filters.chapter}<button onClick={() => setFilter("chapter", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.type && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs font-medium">Type: {typeLabels[filters.type as keyof typeof typeLabels] || filters.type}<button onClick={() => setFilter("type", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.difficulty && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-medium">Difficulty: {filters.difficulty}<button onClick={() => setFilter("difficulty", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.board && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-medium">Board: {filters.board}<button onClick={() => setFilter("board", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.source && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-full text-xs font-medium">Source: {filters.source}<button onClick={() => setFilter("source", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.hasCorrectAnswer && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Answer: {filters.hasCorrectAnswer === "yes" ? "With" : "Without"}<button onClick={() => setFilter("hasCorrectAnswer", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.hasImage && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-xs font-medium">Diagram: {filters.hasImage === "yes" ? "With" : "Without"}<button onClick={() => setFilter("hasImage", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.hasExplanation && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-medium">Explanation: {filters.hasExplanation === "yes" ? "With" : "Without"}<button onClick={() => setFilter("hasExplanation", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.isPYQ && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">⭐ PYQ Only<button onClick={() => { setFilter("isPYQ", ""); setFilter("pyqYear", ""); setFilter("pyqExam", ""); }}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.pyqYear && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">Year: {filters.pyqYear}<button onClick={() => setFilter("pyqYear", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    {filters.pyqExam && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">{filters.pyqExam}<button onClick={() => setFilter("pyqExam", "")}><X className="w-3 h-3 ml-0.5" /></button></span>}
                    <button onClick={clearFilters} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2.5 py-1 rounded-full border border-red-200 transition-all">
                      <XCircle className="w-3.5 h-3.5" /> Clear all
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Professional Questions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={
                        paginatedQuestions.length > 0 &&
                        selectedIds.size === paginatedQuestions.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Subject / Topic
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-full rounded" />
                          <Skeleton className="h-4 w-3/4 rounded" />
                          <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                      </td>
                    </tr>
                  ) : loadError ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="max-w-md mx-auto"
                        >
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Error Loading Questions
                          </h3>
                          <p className="text-gray-600 mb-4">{loadError}</p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-4">
                            <p className="text-sm font-semibold text-blue-900 mb-2">
                              Troubleshooting Steps:
                            </p>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                              <li>Check if the backend server is running</li>
                              <li>Verify your authentication token is valid</li>
                              <li>
                                Ensure API_BASE_URL is configured correctly
                              </li>
                              <li>Check browser console for detailed errors</li>
                            </ul>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={load}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                          >
                            <RefreshCw className="w-4 h-4 inline-block mr-2" />
                            Retry Loading
                          </motion.button>
                        </motion.div>
                      </td>
                    </tr>
                  ) : paginatedQuestions.length > 0 ? (
                    paginatedQuestions.map((q, index) => (
                      <React.Fragment key={q._id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(q._id)}
                              onChange={() => toggleSelect(q._id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <div className="flex items-start gap-2">
                                <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                  <MathText text={q.text} />
                                </div>
                                <button
                                  onClick={() =>
                                    setExpandedQuestionId(
                                      expandedQuestionId === q._id
                                        ? null
                                        : q._id
                                    )
                                  }
                                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                >
                                  {expandedQuestionId === q._id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              {q.diagramUrl && (
                                <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                                  <ImageIcon className="w-3 h-3" />
                                  Has diagram
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full whitespace-nowrap">
                              {typeLabels[q.type as keyof typeof typeLabels] ||
                                q.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {q.tags?.subject || "-"}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {q.tags?.topic || "-"}
                              </div>
                              {q.tags?.chapter && (
                                <div className="text-gray-400 text-xs">
                                  Ch: {q.tags.chapter}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${sourceColors[
                                (q.source ||
                                  "manual") as keyof typeof sourceColors
                                ]
                                }`}
                            >
                              {q.source === "ai-generated" && (
                                <Sparkles className="w-3 h-3 mr-1" />
                              )}
                              {q.source === "imported" && (
                                <Upload className="w-3 h-3 mr-1" />
                              )}
                              {q.source === "manual" && (
                                <FileText className="w-3 h-3 mr-1" />
                              )}
                              {q.source || "manual"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${difficultyColors[
                                  (q.tags
                                    ?.difficulty as keyof typeof difficultyColors) ||
                                  "medium"
                                  ]
                                  }`}
                              >
                                {q.tags?.difficulty || "medium"}
                              </span>
                              {hasCorrectAnswer(q) ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 whitespace-nowrap">
                                  <CheckCircle className="w-3 h-3" />
                                  Answer
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600 whitespace-nowrap">
                                  <XCircle className="w-3 h-3" />
                                  No answer
                                </span>
                              )}
                              {q.explanation && (
                                <span className="inline-flex items-center gap-1 text-xs text-blue-600 whitespace-nowrap">
                                  <Eye className="w-3 h-3" />
                                  Explanation
                                </span>
                              )}
                              {(q.diagram || q.diagramUrl) && (
                                <span className="inline-flex items-center gap-1 text-xs text-violet-600 whitespace-nowrap">
                                  <ImageIcon className="w-3 h-3" />
                                  {q.diagram?.kind === 'vector' ? 'SVG' : 'Diagram'}
                                </span>
                              )}
                              {q.tableData && (
                                <span className="inline-flex items-center gap-1 text-xs text-teal-600 whitespace-nowrap">
                                  <FileText className="w-3 h-3" />
                                  Table
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onEdit(q)}
                                className="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onDuplicate(q)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </motion.button>
                              {/* AI Solve Button - For all questions without answer */}
                              {!hasCorrectAnswer(q) && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => _onSolve(q._id)}
                                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Solve with AI"
                                  disabled={loading || !!_solvingId}
                                >
                                  {_solvingId === q._id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                                  ) : (
                                    <Wand2 className="w-4 h-4" />
                                  )}
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                disabled={deletingId === q._id}
                                onClick={() => onDelete(q._id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === q._id ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                  >
                                    <Circle className="w-4 h-4" />
                                  </motion.div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>

                        {/* Expanded Row */}
                        <AnimatePresence>
                          {expandedQuestionId === q._id && (
                            <motion.tr
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                      Full Question
                                    </div>
                                    <div className="text-sm text-gray-900">
                                      <MathText text={q.text} />
                                    </div>
                                  </div>

                                  {q.options && q.options.length > 0 && (
                                    <div>
                                      <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                        Options
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {q.options.map((opt, idx) => (
                                          <div
                                            key={idx}
                                            className={`p-2 rounded-lg border ${opt.isCorrect
                                                ? "border-green-300 bg-green-50"
                                                : "border-gray-200"
                                              }`}
                                          >
                                            <div className="flex items-start gap-2">
                                              {opt.isCorrect && (
                                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                              )}
                                              <span className="text-sm">
                                                <MathText text={opt.text} />
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {q.correctAnswerText && (
                                    <div>
                                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                        Correct Answer
                                      </div>
                                      <div className="text-sm text-gray-900 bg-green-50 border border-green-200 rounded-lg p-2">
                                        <MathText text={q.correctAnswerText} />
                                      </div>
                                    </div>
                                  )}

                                  {q.explanation && (
                                    <div>
                                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                        Explanation
                                      </div>
                                      <div className="text-sm text-gray-700">
                                        <MathText text={q.explanation} />
                                      </div>
                                    </div>
                                  )}

                                  {(q.diagram || q.diagramUrl) && (
                                    <div>
                                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                        Diagram/Figure
                                      </div>
                                      <DiagramRenderer diagram={q.diagram} diagramUrl={q.diagramUrl} />
                                    </div>
                                  )}

                                  {q.tableData && (
                                    <div>
                                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                                        Associated Table
                                      </div>
                                      <TableDataRenderer tableData={q.tableData} />
                                    </div>
                                  )}

                                  <div className="text-xs text-gray-500">
                                    Created:{" "}
                                    {q.createdAt
                                      ? new Date(
                                        q.createdAt
                                      ).toLocaleDateString()
                                      : "N/A"}
                                    {q.updatedAt && (
                                      <>
                                        {" "}
                                        • Updated:{" "}
                                        {new Date(
                                          q.updatedAt
                                        ).toLocaleDateString()}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="max-w-md mx-auto"
                        >
                          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                            <BookOpen className="w-10 h-10 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {activeFilterCount > 0
                              ? "No Matching Questions"
                              : "No Questions Yet"}
                          </h3>
                          <p className="text-gray-600 mb-6">
                            {activeFilterCount > 0
                              ? "Try adjusting or clearing your filters to see more results"
                              : "Get started by creating your first question or importing from existing sources"}
                          </p>
                          {activeFilterCount > 0 ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={clearFilters}
                              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                            >
                              <XCircle className="w-4 h-4 inline-block mr-2" />
                              Clear All Filters
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={onCreate}
                              className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl transition-all"
                            >
                              <Plus className="w-5 h-5 inline-block mr-2" />
                              Create Your First Question
                            </motion.button>
                          )}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 md:px-6 py-4 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Mobile: Show compact info */}
                <div className="text-sm text-gray-600 font-medium">
                  <span className="hidden sm:inline">Showing </span>
                  <span className="font-bold text-gray-800">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  <span className="hidden sm:inline"> to </span>
                  <span className="sm:hidden">-</span>
                  <span className="font-bold text-gray-800">
                    {Math.min(
                      currentPage * itemsPerPage,
                      totalQuestions
                    )}
                  </span>
                  <span> of </span>
                  <span className="font-bold text-blue-600">
                    {totalQuestions}
                  </span>
                  <span className="hidden sm:inline"> questions</span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Previous Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-1"
                  >
                    <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>

                  {/* Page Numbers - Hidden on very small screens */}
                  <div className="hidden xs:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <motion.button
                          key={pageNum}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300"
                            }`}
                        >
                          {pageNum}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Mobile Page Indicator */}
                  <div className="xs:hidden px-3 py-2 bg-blue-50 rounded-lg text-sm font-medium text-blue-700">
                    {currentPage} / {totalPages}
                  </div>

                  {/* Next Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronUp className="w-4 h-4 rotate-90" />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Solve Preview Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Review AI Solutions
              </h2>
              <p className="text-xs md:text-sm text-gray-500">
                {solvePreviewData.length} question
                {solvePreviewData.length !== 1 ? "s" : ""} solved • Select to
                accept
              </p>
            </div>
          </div>
        }
        open={showSolvePreview}
        onOpenChange={(open) => {
          setShowSolvePreview(open);
          if (!open) {
            // Auto-refresh on close
            load();
          }
        }}
        wide
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <span>
                <strong className="text-purple-700">
                  {solvePreviewData.filter((d) => d.selected).length}
                </strong>{" "}
                of {solvePreviewData.length} selected
              </span>
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowSolvePreview(false);
                  load(); // Refresh on cancel
                }}
                className="flex-1 sm:flex-initial px-4 md:px-6 py-2 md:py-2.5 rounded-xl border-2 border-gray-300 text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all"
                disabled={acceptingSolves}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAcceptSolves}
                disabled={
                  acceptingSolves ||
                  solvePreviewData.filter((d) => d.selected).length === 0
                }
                className="flex-1 sm:flex-initial px-4 md:px-8 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs md:text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
              >
                {acceptingSolves ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Accept</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        }
      >
        <div className="p-4 md:p-6">
          {solvePreviewData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No solutions to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header with Select All */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <label className="flex items-center gap-2 md:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={solvePreviewData.every((d) => d.selected)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSolvePreviewData((prev) =>
                        prev.map((p) => ({ ...p, selected: checked }))
                      );
                    }}
                  />
                  <span className="font-semibold text-gray-700 text-sm md:text-base">
                    Select All
                  </span>
                </label>
                <div className="text-xs md:text-sm text-gray-500">
                  Total: {solvePreviewData.length}
                </div>
              </div>

              {solvePreviewData.map((data, index) => (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-2 rounded-xl p-3 md:p-4 transition-all ${data.selected
                      ? "border-purple-500 bg-purple-50/30"
                      : "border-gray-200 bg-white"
                    }`}
                >
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="pt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={data.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSolvePreviewData((prev) =>
                            prev.map((p) =>
                              p.id === data.id ? { ...p, selected: checked } : p
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Question Text with MathText support */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            {data.original.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${data.aiResult.confidence === "high"
                                ? "bg-green-100 text-green-700"
                                : data.aiResult.confidence === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                          >
                            {data.aiResult.confidence} confidence
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base break-words">
                          <MathText text={data.original.text} />
                        </h4>

                        {/* MCQ Options Display */}
                        {data.original.options &&
                          data.original.options.length > 0 &&
                          data.aiResult.correctOptionIndex !== undefined ? (
                          <div className="space-y-2">
                            {data.original.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 md:p-3 rounded-lg text-xs md:text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${optIdx === data.aiResult.correctOptionIndex
                                    ? "bg-green-100 border-green-300 text-green-800 font-medium"
                                    : "bg-gray-50 border-gray-200 text-gray-600"
                                  }`}
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white flex items-center justify-center text-xs border font-bold flex-shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="break-words">
                                    <MathText text={opt.text} />
                                  </span>
                                </div>
                                {optIdx ===
                                  data.aiResult.correctOptionIndex && (
                                    <span className="flex items-center gap-1 text-xs bg-green-200 px-2 py-1 rounded-full text-green-800 whitespace-nowrap flex-shrink-0 self-start sm:self-auto">
                                      <Sparkles className="w-3 h-3" />
                                      <span className="hidden sm:inline">
                                        AI Choice
                                      </span>
                                    </span>
                                  )}
                              </div>
                            ))}
                          </div>
                        ) : data.aiResult.correctAnswerText ? (
                          /* Text-based Answer Display */
                          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 md:p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-semibold text-green-700 uppercase">
                                AI Generated Answer
                              </span>
                            </div>
                            <div className="text-sm md:text-base text-green-900 font-medium">
                              <MathText
                                text={data.aiResult.correctAnswerText}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Explanation with MathText support */}
                      {data.aiResult.explanation && (
                        <div className="mt-2 text-xs md:text-sm bg-blue-50 p-2 md:p-3 rounded-lg border border-blue-100 text-blue-800">
                          <span className="font-semibold mr-1">
                            Explanation:
                          </span>
                          <MathText text={data.aiResult.explanation} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Professional Create/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              {draft._id ? (
                <Edit3 className="w-5 h-5 text-white" />
              ) : (
                <Plus className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {draft._id ? "Edit Question" : "Create New Question"}
              </h2>
              <p className="text-sm text-gray-500">
                Fill in the details below to {draft._id ? "update" : "create"} a
                question
              </p>
            </div>
          </div>
        }
        open={open}
        onOpenChange={setOpen}
        wide
        footer={
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 flex-wrap gap-2">
            <div className="text-xs text-gray-500">
              {draft._id ? `Editing ID: ${draft._id}` : "New question • Ctrl+Enter to save"}
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all"
                disabled={saving}
                type="button"
              >
                Cancel
              </motion.button>
              {!draft._id && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => { addAnotherRef.current = true; saveDraft(e as unknown as React.FormEvent); }}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 bg-emerald-50 text-sm font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                  title="Save and open a new question with the same metadata pre-filled"
                >
                  <Plus className="w-4 h-4" />
                  Save &amp; Add Another
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveDraft}
                disabled={saving}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
                type="button"
              >
                {saving ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {draft._id ? "Update" : "Create"} Question
                  </>
                )}
              </motion.button>
            </div>
          </div>
        }
      >
        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 pb-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalTab("basic")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${modalTab === "basic"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            type="button"
          >
            <FileText className="w-4 h-4" />
            Basic Info
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalTab("options")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${modalTab === "options"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            type="button"
          >
            <CheckCircle className="w-4 h-4" />
            Answer Options
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalTab("advanced")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${modalTab === "advanced"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            type="button"
          >
            <Sparkles className="w-4 h-4" />
            Advanced
          </motion.button>
        </div>

        <form onSubmit={saveDraft} className="px-6">
          {/* Basic Info Tab */}
          {modalTab === "basic" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  Question Text
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none font-medium"
                  rows={5}
                  placeholder="Enter your question here..."
                  required
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Write a clear and concise question
                </p>
              </div>

              {/* Question Properties */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Question Properties
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Type
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={draft.type}
                      onChange={(e) =>
                        setDraft({ ...draft, type: e.target.value })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Subject */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Subject
                    </label>
                    <input
                      value={draft.subject || draft.tags?.subject || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          subject: e.target.value,
                          tags: { ...draft.tags, subject: e.target.value },
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                      placeholder="e.g., Physics"
                    />
                    {draft._id && (draft.subject || '') !== (originalDraftMeta.subject || '') && (draft.subject || '').trim() && (
                      <button
                        type="button"
                        disabled={bulkUpdating}
                        onClick={() => bulkUpdateMeta('subject', originalDraftMeta.subject || '', draft.subject || '')}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Apply &quot;{draft.subject}&quot; to all &quot;{originalDraftMeta.subject || 'empty'}&quot; questions
                      </button>
                    )}
                  </div>
                  {/* Topic */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Topic
                    </label>
                    <input
                      value={draft.topic || draft.tags?.topic || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          topic: e.target.value,
                          tags: { ...draft.tags, topic: e.target.value },
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                      placeholder="e.g., Mechanics"
                    />
                    {draft._id && (draft.topic || '') !== (originalDraftMeta.topic || '') && (draft.topic || '').trim() && (
                      <button
                        type="button"
                        disabled={bulkUpdating}
                        onClick={() => bulkUpdateMeta('topic', originalDraftMeta.topic || '', draft.topic || '')}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Apply &quot;{draft.topic}&quot; to all &quot;{originalDraftMeta.topic || 'empty'}&quot; questions
                      </button>
                    )}
                  </div>
                  {/* Chapter */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Chapter
                    </label>
                    <input
                      value={draft.chapter || draft.tags?.chapter || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          chapter: e.target.value,
                          tags: { ...draft.tags, chapter: e.target.value },
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                      placeholder="e.g., Chapter 1"
                    />
                    {draft._id && (draft.chapter || '') !== (originalDraftMeta.chapter || '') && (draft.chapter || '').trim() && (
                      <button
                        type="button"
                        disabled={bulkUpdating}
                        onClick={() => bulkUpdateMeta('chapter', originalDraftMeta.chapter || '', draft.chapter || '')}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Apply &quot;{draft.chapter}&quot; to all &quot;{originalDraftMeta.chapter || 'empty'}&quot; questions
                      </button>
                    )}
                  </div>
                  {/* Difficulty */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Difficulty
                    </label>
                    <select
                      value={
                        draft.difficulty || draft.tags?.difficulty || "medium"
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          difficulty: e.target.value,
                          tags: { ...draft.tags, difficulty: e.target.value },
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    {draft._id && (draft.difficulty || 'medium') !== (originalDraftMeta.difficulty || 'medium') && (
                      <button
                        type="button"
                        disabled={bulkUpdating}
                        onClick={() => bulkUpdateMeta('difficulty', originalDraftMeta.difficulty || '', draft.difficulty || '')}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Apply &quot;{draft.difficulty}&quot; to all &quot;{originalDraftMeta.difficulty || 'empty'}&quot; questions
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      Source
                    </label>
                    <select
                      value={draft.source || "Manual"}
                      onChange={(e) =>
                        setDraft({ ...draft, source: e.target.value as Draft['source'] })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Smart Import">Smart Import</option>
                      <option value="AI">AI Generated</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Class
                    </label>
                    <select
                      value={draft.class || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          class: e.target.value,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      <option value="">Select Class</option>
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Board
                    </label>
                    <select
                      value={draft.board || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          board: e.target.value,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="GSEB">GSEB</option>
                      <option value="JEE">JEE</option>
                      <option value="NEET">NEET</option>
                      <option value="Olympiad">Olympiad</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Section
                    </label>
                    <select
                      value={draft.section || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          section: e.target.value,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                    >
                      <option value="">Select Section</option>
                      <option value="Objective">Objective</option>
                      <option value="Very Short">Very Short</option>
                      <option value="Short">Short</option>
                      <option value="Long">Long</option>
                      <option value="Case Study">Case Study</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={draft.marks || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, marks: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium bg-white"
                      placeholder="e.g., 1"
                    />
                  </div>
                </div>
              </div>

              {/* PYQ Section */}
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 bg-amber-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!draft.isPYQ}
                    onChange={(e) => setDraft({ ...draft, isPYQ: e.target.checked, pyqYear: e.target.checked ? (draft.pyqYear ?? new Date().getFullYear()) : undefined })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                  <span className="text-sm font-semibold text-amber-800">This is a Previous Year Question (PYQ)</span>
                </label>
                {draft.isPYQ && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-4 bg-white border-t border-amber-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Exam</label>
                      <select
                        value={draft.pyqExam || ""}
                        onChange={(e) => setDraft({ ...draft, pyqExam: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 font-medium bg-white"
                      >
                        <option value="">Select Exam</option>
                        <option value="JEE Main">JEE Main</option>
                        <option value="JEE Advanced">JEE Advanced</option>
                        <option value="NEET">NEET</option>
                        <option value="CBSE Board">CBSE Board</option>
                        <option value="ICSE Board">ICSE Board</option>
                        <option value="Olympiad">Olympiad</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Year</label>
                      <select
                        value={draft.pyqYear ?? ""}
                        onChange={(e) => setDraft({ ...draft, pyqYear: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 font-medium bg-white"
                      >
                        <option value="">Select Year</option>
                        {Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => new Date().getFullYear() - i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Shift / Paper</label>
                      <select
                        value={draft.pyqShift || ""}
                        onChange={(e) => setDraft({ ...draft, pyqShift: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 font-medium bg-white"
                      >
                        <option value="">Any / Single Paper</option>
                        <option value="Morning Shift">Morning Shift</option>
                        <option value="Afternoon Shift">Afternoon Shift</option>
                        <option value="Paper 1">Paper 1</option>
                        <option value="Paper 2">Paper 2</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Options Tab */}
          {modalTab === "options" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* MCQ Options */}
              {(draft.type === "mcq" ||
                draft.type === "mcq-single" ||
                draft.type === "mcq-multi") && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Answer Options
                        <span className="text-red-500">*</span>
                      </label>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            options: [
                              ...(d.options || []),
                              { text: "", isCorrect: false },
                            ],
                          }))
                        }
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {draft.options?.map((o, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`relative border-2 rounded-xl p-4 transition-all shadow-sm ${o.isCorrect
                              ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-green-500/20"
                              : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-700">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                value={o.text}
                                onChange={(e) =>
                                  updateOption(i, { text: e.target.value })
                                }
                                placeholder={`Enter option ${String.fromCharCode(
                                  65 + i
                                )}`}
                                className="w-full text-sm bg-transparent outline-none placeholder-gray-400 font-medium border-b border-gray-200 pb-2 focus:border-blue-500"
                              />
                              {/* MathText Preview */}
                              {o.text && o.text.includes("$") && (
                                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                  <span className="text-gray-400 mr-1">
                                    Preview:
                                  </span>
                                  <MathText
                                    text={o.text}
                                    className="text-gray-700"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => setCorrect(i)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${o.isCorrect
                                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-500/30"
                                  : "border-2 border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600 bg-white"
                                }`}
                            >
                              {o.isCorrect ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                              {o.isCorrect ? "Correct Answer" : "Mark as Correct"}
                            </motion.button>
                            {draft.options && draft.options.length > 2 && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    options: d.options?.filter(
                                      (_, idx) => idx !== i
                                    ),
                                  }))
                                }
                                className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

              {/* True/False — dedicated radio buttons */}
              {draft.type === "truefalse" && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {["True", "False"].map(val => {
                      const isSelected = draft.options?.find(o => o.text === val)?.isCorrect === true ||
                        (!draft.options?.length && draft.correctAnswerText === val);
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDraft({
                            ...draft,
                            options: [
                              { text: "True", isCorrect: val === "True" },
                              { text: "False", isCorrect: val === "False" },
                            ],
                            correctAnswerText: val,
                          })}
                          className={`flex-1 py-4 rounded-xl border-2 text-sm font-bold transition-all ${
                            isSelected
                              ? val === "True"
                                ? "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-500/20"
                                : "border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-500/20"
                              : "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                          }`}
                        >
                          {val === "True" ? "✓ True" : "✗ False"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Integer type — numeric input */}
              {draft.type === "integer" && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Integer Answer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={draft.integerAnswer ?? ""}
                    onChange={(e) => setDraft({
                      ...draft,
                      integerAnswer: e.target.value !== "" ? Number(e.target.value) : undefined,
                      correctAnswerText: e.target.value,
                    })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all bg-green-50/30 text-center"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">Enter a non-negative integer (e.g., 0–9999)</p>
                </div>
              )}

              {/* Correct Answer Text (for subjective / fill / short / long) */}
              {!["mcq", "mcq-single", "mcq-multi", "assertionreason", "truefalse", "integer"].includes(draft.type) && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={draft.correctAnswerText || ""}
                    onChange={(e) => setDraft({ ...draft, correctAnswerText: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all resize-none font-medium bg-green-50/30"
                    rows={4}
                    placeholder="Enter the correct answer..."
                  />
                </div>
              )}

              {draft.type === "assertionreason" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    Assertion &amp; Reason
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Assertion (A)</label>
                      <textarea
                        value={draft.assertion || ""}
                        onChange={(e) => setDraft({ ...draft, assertion: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none font-medium"
                        rows={4}
                        placeholder="Enter assertion statement..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Reason (R)</label>
                      <textarea
                        value={draft.reason || ""}
                        onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none font-medium"
                        rows={4}
                        placeholder="Enter reason statement..."
                      />
                    </div>
                  </div>

                  {/* Standard 4-option A-R answer panel */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Correct Answer Code</p>
                    {[
                      { code: "a", label: "Both A and R are true; R is the correct explanation of A", isTrue: true, rTrue: true, explains: true },
                      { code: "b", label: "Both A and R are true; but R is NOT the correct explanation of A", isTrue: true, rTrue: true, explains: false },
                      { code: "c", label: "A is true, R is false", isTrue: true, rTrue: false, explains: false },
                      { code: "d", label: "A is false, R is true", isTrue: false, rTrue: true, explains: false },
                    ].map(opt => {
                      const selected =
                        draft.assertionIsTrue === opt.isTrue &&
                        draft.reasonIsTrue === opt.rTrue &&
                        (draft.reasonExplainsAssertion ?? false) === opt.explains;
                      return (
                        <label key={opt.code} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${selected ? "border-blue-500 bg-white" : "border-transparent hover:bg-blue-100/60"}`}>
                          <input
                            type="radio"
                            name="ar-code"
                            checked={selected}
                            onChange={() => setDraft({
                              ...draft,
                              assertionIsTrue: opt.isTrue,
                              reasonIsTrue: opt.rTrue,
                              reasonExplainsAssertion: opt.explains,
                              options: [
                                { text: "(a) Both A and R true; R explains A", isCorrect: opt.code === "a" },
                                { text: "(b) Both A and R true; R does NOT explain A", isCorrect: opt.code === "b" },
                                { text: "(c) A true, R false", isCorrect: opt.code === "c" },
                                { text: "(d) A false, R true", isCorrect: opt.code === "d" },
                              ],
                              correctAnswerText: `(${opt.code})`,
                            })}
                            className="mt-0.5 accent-blue-600"
                          />
                          <span className="text-sm text-gray-800"><span className="font-bold">({opt.code})</span> {opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Diagram hint — moved to Advanced tab */}
              <p className="text-xs text-gray-400 italic mt-4">
                To add a diagram or image, switch to the <strong>Advanced</strong> tab.
              </p>
            </motion.div>
          )}

          {/* Advanced Tab */}
          {modalTab === "advanced" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Explanation */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Explanation
                  <span className="text-xs font-normal text-gray-500">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={draft.explanation || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, explanation: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all resize-none font-medium bg-purple-50/30"
                  rows={4}
                  placeholder="Provide a detailed explanation for the correct answer..."
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Help students understand the reasoning behind the answer
                </p>
              </div>

              {/* Diagram Upload */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  Diagram/Image
                  <span className="text-xs font-normal text-gray-500">
                    (optional)
                  </span>
                </label>

                {/* File Upload */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl p-4 text-center hover:border-indigo-500 transition-all">
                  <input
                    type="file"
                    id="diagram-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPendingDiagramFile(file);
                        // Clear URL if uploading file
                        setDraft({ ...draft, diagramUrl: "" });
                      }
                    }}
                  />
                  <label
                    htmlFor="diagram-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <div className="p-3 bg-indigo-100 rounded-full">
                      <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-indigo-700">
                        {pendingDiagramFile
                          ? pendingDiagramFile.name
                          : "Click to upload diagram"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </label>
                  {pendingDiagramFile && (
                    <button
                      type="button"
                      onClick={() => setPendingDiagramFile(null)}
                      className="mt-2 text-xs text-red-600 hover:underline"
                    >
                      Remove selected file
                    </button>
                  )}
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500 font-medium">
                    OR enter URL
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={draft.diagramUrl || ""}
                    onChange={(e) => {
                      setDraft({ ...draft, diagramUrl: e.target.value });
                      // Clear pending file if entering URL
                      if (e.target.value) {
                        setPendingDiagramFile(null);
                      }
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-medium"
                    placeholder="https://example.com/image.png"
                  />
                </div>

                {/* Preview */}
                {(draft.diagramUrl || pendingDiagramFile) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">
                      {uploadingDiagram ? "Uploading..." : "Preview:"}
                    </p>
                    {pendingDiagramFile && !draft.diagramUrl ? (
                      <Image
                        src={URL.createObjectURL(pendingDiagramFile)}
                        alt="Question diagram preview"
                        width={400}
                        height={300}
                        className="max-w-md max-h-64 rounded-lg border border-gray-200 object-contain"
                      />
                    ) : draft.diagramUrl ? (
                      <Image
                        src={draft.diagramUrl}
                        alt="Question diagram preview"
                        width={400}
                        height={300}
                        className="max-w-full rounded-lg border border-gray-200"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </form>
      </Modal>
    </motion.div>
  );
}
