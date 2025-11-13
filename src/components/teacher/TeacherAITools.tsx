/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import BlueprintModal, {
  SavedBlueprint as ModalBlueprint,
} from "./modals/BlueprintModal";
import CreateExamFromPaperModal from "./modals/CreateExamFromPaperModal";
import BankExamModal from "./modals/BankExamModal";
import GenExamModal from "./modals/GenExamModal";
import {
  DocumentTextIcon,
  PlusCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  //PrinterIcon,
  AcademicCapIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import katex from "katex";
import "katex/dist/katex.min.css";
/* Lines 30-32 omitted */

// --- LaTeX helpers: render in UI (HTML+MathML) and convert to MathML for export ---
type LatexSegment = {
  type: "text" | "math";
  content: string;
  display: boolean;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Split a string into text/math segments based on common LaTeX delimiters
function splitLatexMixed(text: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  if (!text) return segments;

  let i = 0;
  const pushText = (s: string) => {
    if (s) segments.push({ type: "text", content: s, display: false });
  };
  const pushMath = (s: string, display: boolean) => {
    segments.push({ type: "math", content: s, display });
  };

  const findNext = (src: string, start: number, needle: string) =>
    src.indexOf(needle, start);

  while (i < text.length) {
    // Order matters: $$...$$, \[...\], \(...\), $...$
    if (text.startsWith("$$", i)) {
      const end = findNext(text, i + 2, "$$");
      if (end !== -1) {
        pushMath(text.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    if (text.startsWith("\\[", i)) {
      const end = findNext(text, i + 2, "\\]");
      if (end !== -1) {
        pushMath(text.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
    }
    if (text.startsWith("\\(", i)) {
      const end = findNext(text, i + 2, "\\)");
      if (end !== -1) {
        pushMath(text.slice(i + 2, end), false);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "$") {
      // naive search for next unescaped $
      let j = i + 1;
      let found = -1;
      while (j < text.length) {
        if (text[j] === "$" && text[j - 1] !== "\\") {
          found = j;
          break;
        }
        j++;
      }
      if (found !== -1) {
        pushMath(text.slice(i + 1, found), false);
        i = found + 1;
        continue;
      }
    }
    // If no delimiter matched at i, accumulate normal text until next potential delimiter
    let next = text.length;
    const candidates = [
      text.indexOf("$$", i),
      text.indexOf("$", i),
      text.indexOf("\\[", i),
      text.indexOf("\\(", i),
    ];
    for (const pos of candidates) {
      if (pos !== -1 && pos < next) next = pos;
    }
    pushText(text.slice(i, next));
    i = next;
  }
  return segments;
}

function renderLatexMixedToHtml(text: string): string {
  if (!text) return "";
  const segs = splitLatexMixed(text);
  let html = "";
  for (const s of segs) {
    if (s.type === "text") {
      // Preserve line breaks for print/export readability
      html += escapeHtml(s.content).replace(/\n/g, "<br/>");
    } else {
      try {
        html += katex.renderToString(s.content, {
          displayMode: s.display,
          throwOnError: false,
          trust: true,
          output: "htmlAndMathml",
        });
      } catch {
        html += `<span class="katex-error">${escapeHtml(s.content)}</span>`;
      }
    }
  }
  return html;
}

function renderLatexMixedToMathML(text: string): string {
  if (!text) return "";
  const segs = splitLatexMixed(text);
  let html = "";
  for (const s of segs) {
    if (s.type === "text") {
      html += escapeHtml(s.content).replace(/\n/g, "<br/>");
    } else {
      try {
        html += katex.renderToString(s.content, {
          displayMode: s.display,
          throwOnError: false,
          trust: true,
          output: "mathml",
        });
      } catch {
        html += `<span class="katex-error">${escapeHtml(s.content)}</span>`;
      }
    }
  }
  return html;
}

function convertPaperToMathMLHtml(
  paper: GeneratedPaperResult
): GeneratedPaperResult {
  return {
    ...paper,
    generalInstructions: paper.generalInstructions?.map((t) => t) || [],
    sections: paper.sections.map((sec) => ({
      ...sec,
      // Convert question text and related fields to MathML-embedded HTML
      questions: sec.questions.map((q) => ({
        ...q,
        text: renderLatexMixedToMathML(q.text || ""),
        assertion: q.assertion
          ? renderLatexMixedToMathML(q.assertion)
          : q.assertion,
        reason: q.reason ? renderLatexMixedToMathML(q.reason) : q.reason,
        explanation: q.explanation
          ? renderLatexMixedToMathML(q.explanation)
          : q.explanation,
        options: q.options?.map((o) => ({
          ...o,
          text: renderLatexMixedToMathML(o.text || ""),
        })),
      })),
    })),
  };
}

function MathText({ text, className }: { text?: string; className?: string }) {
  const html = renderLatexMixedToHtml(text || "");
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
import { CheckIcon } from "@heroicons/react/24/solid";
import Image from "next/image";

interface GenQuestion {
  _id?: string;
  text: string;
  type: string;
  tags?: { subject?: string; topic?: string; difficulty?: string };
  options?: { text: string; isCorrect?: boolean }[];
  integerAnswer?: number;
  assertion?: string;
  reason?: string;
  assertionIsTrue?: boolean;
  reasonIsTrue?: boolean;
  reasonExplainsAssertion?: boolean;
  explanation?: string;
  // Optional diagram for paper printing (kept in-memory as data URL)
  diagramDataUrl?: string;
  // Optional persisted URL from backend after upload
  diagramUrl?: string;
}

interface PaperSectionBlueprint {
  title: string;
  instructions: string;
  marksPerQuestion: number;
  questionCounts: Record<string, number>;
  difficultyDistribution: { easy: number; medium: number; hard: number };
}

interface GeneratedPaperSection extends PaperSectionBlueprint {
  questions: GenQuestion[];
}

interface GeneratedPaperResult {
  examTitle: string;
  subject?: string;
  totalMarks: number;
  generalInstructions: string[];
  sections: GeneratedPaperSection[];
}

const ALL_TYPES = [
  { id: "mcq", label: "MCQ", icon: "radio", color: "blue" },
  { id: "truefalse", label: "True/False", icon: "check", color: "green" },
  { id: "fill", label: "Fill in Blank", icon: "pencil", color: "purple" },
  { id: "short", label: "Short Answer", icon: "chat", color: "orange" },
  { id: "long", label: "Essay", icon: "document", color: "red" },
  {
    id: "assertionreason",
    label: "Assertion-Reason",
    icon: "scale",
    color: "indigo",
  },
  { id: "integer", label: "Integer", icon: "calculator", color: "teal" },
  // English formats
  {
    id: "english:letter-formal",
    label: "Letter (Formal)",
    icon: "document",
    color: "emerald",
  },
  {
    id: "english:letter-informal",
    label: "Letter (Informal)",
    icon: "document",
    color: "emerald",
  },
  {
    id: "english:story",
    label: "Story Writing",
    icon: "document",
    color: "emerald",
  },
  {
    id: "english:essay",
    label: "Essay Writing",
    icon: "document",
    color: "emerald",
  },
  {
    id: "english:diary",
    label: "Diary Entry",
    icon: "document",
    color: "emerald",
  },
  {
    id: "english:advertisement",
    label: "Advertisement",
    icon: "document",
    color: "emerald",
  },
  { id: "english:notice", label: "Notice", icon: "document", color: "emerald" },
  {
    id: "english:unseen-passage",
    label: "Unseen Passage",
    icon: "book",
    color: "emerald",
  },
  {
    id: "english:unseen-poem",
    label: "Unseen Poem",
    icon: "book",
    color: "emerald",
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const tabVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

export default function TeacherAITools() {
  const [tab, setTab] = useState<"generate" | "paper">("generate");
  const [mode, setMode] = useState<"pdf" | "image" | "text">("pdf");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GenQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    subject: "",
    topic: "",
    difficulty: "medium",
    count: 10,
    types: ["mcq", "truefalse", "fill", "short", "long"],
    class: "",
    board: "",
    chapter: "",
    section: "",
    marks: 1,
  });
  const [refiningIdx, setRefiningIdx] = useState<number | null>(null);
  // Editing state for generated items
  const [editing, setEditing] = useState<Set<number>>(new Set());
  // Paper preview editing state (per section:question)
  const [paperEditing, setPaperEditing] = useState<Set<string>>(new Set());

  // Paper blueprint state
  const [paperBlueprint, setPaperBlueprint] = useState({
    examTitle: "Sample Practice Paper",
    subject: "",
    generalInstructions: [
      "All questions are compulsory.",
      "Use only blue or black ink.",
    ],
    sections: [
      {
        title: "Section A",
        instructions: "Single correct MCQs",
        marksPerQuestion: 4,
        questionCounts: { mcq: 5 },
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      },
    ] as PaperSectionBlueprint[],
  });
  const [paperSource, setPaperSource] = useState("");
  const [paperPdfFile, setPaperPdfFile] = useState<File | null>(null);
  const [paperImageFile, setPaperImageFile] = useState<File | null>(null);
  const [paperInputMode, setPaperInputMode] = useState<
    "text" | "pdf" | "image"
  >("text");
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperResult, setPaperResult] = useState<GeneratedPaperResult | null>(
    null
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingPaper, setSavingPaper] = useState(false);

  // Blueprint persistence
  interface SavedBlueprint {
    _id: string;
    name?: string;
    examTitle?: string;
    subject?: string;
    generalInstructions?: string[];
    sections?: PaperSectionBlueprint[];
  }
  const [blueprints, setBlueprints] = useState<SavedBlueprint[]>([]);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [savingBlueprint, setSavingBlueprint] = useState(false);
  const [loadingBlueprints, setLoadingBlueprints] = useState(false);
  const [newBlueprintName, setNewBlueprintName] = useState("");
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(
    null
  );

  // Create exam modal state
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [batch, setBatch] = useState("");
  const [timerMins, setTimerMins] = useState<string>("60");
  const [autoPublish, setAutoPublish] = useState(true);
  const [creatingExam, setCreatingExam] = useState(false);

  // Question bank exam creation state
  const [bankExamOpen, setBankExamOpen] = useState(false);
  const [bankSelectedQuestions, setBankSelectedQuestions] = useState<string[]>(
    []
  );
  const [bankExamTitle, setBankExamTitle] = useState("Question Bank Exam");
  const [bankTimerMins, setBankTimerMins] = useState<string>("60");
  const [bankExamCreating, setBankExamCreating] = useState(false);

  // Create exam from generated questions state
  const [genExamOpen, setGenExamOpen] = useState(false);
  const [genExamTitle, setGenExamTitle] = useState("Generated Exam");
  const [genTimerMins, setGenTimerMins] = useState<string>("60");
  const [genExamCreating, setGenExamCreating] = useState(false);

  // Load blueprints list
  const loadBlueprints = useCallback(async () => {
    setLoadingBlueprints(true);
    try {
      const data = (await apiFetch("/api/exams/blueprints")) as {
        items: SavedBlueprint[];
      };
      setBlueprints(data.items || []);
    } catch {
      setBlueprints([]);
    } finally {
      setLoadingBlueprints(false);
    }
  }, []);

  useEffect(() => {
    if (blueprintModalOpen) loadBlueprints();
  }, [blueprintModalOpen, loadBlueprints]);

  function openBlueprintModal() {
    setBlueprintModalOpen(true);
  }

  async function saveCurrentBlueprint() {
    if (!paperBlueprint.examTitle.trim()) {
      alert("Blueprint needs an exam title");
      return;
    }
    setSavingBlueprint(true);
    try {
      const payload = {
        name: newBlueprintName || paperBlueprint.examTitle,
        examTitle: paperBlueprint.examTitle,
        subject: paperBlueprint.subject,
        generalInstructions: paperBlueprint.generalInstructions,
        sections: paperBlueprint.sections,
      };
      await apiFetch("/api/exams/blueprints", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setNewBlueprintName("");
      await loadBlueprints();
      alert("Blueprint saved");
    } catch {
      alert("Save failed");
    } finally {
      setSavingBlueprint(false);
    }
  }

  function applyBlueprint(bp: SavedBlueprint) {
    setPaperBlueprint({
      examTitle: bp.examTitle || bp.name || "Exam",
      subject: bp.subject || "",
      generalInstructions: bp.generalInstructions || [],
      sections: bp.sections || [],
    });
    setSelectedBlueprintId(bp._id);
    setBlueprintModalOpen(false);
  }

  async function deleteBlueprint(id: string) {
    if (!confirm("Delete blueprint?")) return;
    try {
      await apiFetch(`/api/exams/blueprints/${id}`, { method: "DELETE" });
      await loadBlueprints();
    } catch {
      /* ignore */
    }
  }

  function openCreateExam() {
    if (!paperResult) return;
    setExamTitle(paperResult.examTitle);
    setCreateExamOpen(true);
  }

  async function createExamFromPaper() {
    if (!paperResult) return;
    setCreatingExam(true);
    try {
      const options = {
        classLevel: classLevel || undefined,
        batch: batch || undefined,
        autoPublish,
        totalDurationMins: timerMins ? Number(timerMins) : undefined,
        blueprintId: selectedBlueprintId || undefined,
      };
      const payload = {
        paper: {
          ...paperResult,
          examTitle: examTitle || paperResult.examTitle,
        },
        options,
      };
      await apiFetch("/api/exams/from-paper", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("Exam created from paper");
      setCreateExamOpen(false);
    } catch {
      alert("Creation failed");
    } finally {
      setCreatingExam(false);
    }
  }

  // Question bank exam creation simple flow
  interface BankQuestion {
    _id: string;
    text: string;
    tags?: { subject?: string; topic?: string; difficulty?: string };
  }
  const [bankQuestionsList, setBankQuestionsList] = useState<BankQuestion[]>(
    []
  );
  const [bankLoading, setBankLoading] = useState(false);
  const loadBankQuestions = useCallback(async () => {
    setBankLoading(true);
    try {
      const data = (await apiFetch("/api/exams/questions?limit=200")) as {
        items: BankQuestion[];
      };
      setBankQuestionsList(data.items || []);
    } catch {
      setBankQuestionsList([]);
    } finally {
      setBankLoading(false);
    }
  }, []);
  useEffect(() => {
    if (bankExamOpen) loadBankQuestions();
  }, [bankExamOpen, loadBankQuestions]);

  async function createExamFromBank() {
    if (!bankSelectedQuestions.length) {
      alert("Select at least one question");
      return;
    }
    setBankExamCreating(true);
    try {
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: bankExamTitle,
          description: "Created from question bank selection",
          sections: [
            {
              title: "Section 1",
              questionIds: bankSelectedQuestions,
              shuffleQuestions: false,
              shuffleOptions: false,
            },
          ],
          isPublished: autoPublish,
          classLevel: classLevel || undefined,
          batch: batch || undefined,
          totalDurationMins: bankTimerMins ? Number(bankTimerMins) : undefined,
        }),
      });
      alert("Exam created from question bank");
      setBankExamOpen(false);
    } catch {
      alert("Create failed");
    } finally {
      setBankExamCreating(false);
    }
  }

  function toggleType(t: string) {
    setMeta((m) => {
      const exists = m.types.includes(t);
      return {
        ...m,
        types: exists ? m.types.filter((x) => x !== t) : [...m.types, t],
      };
    });
  }

  async function generateFromText() {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch("/api/ai/generate/text", {
        method: "POST",
        body: JSON.stringify({ text, ...meta, types: meta.types }),
      })) as { items?: GenQuestion[] };
      setItems(res.items || []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateFromPdf() {
    if (!file) {
      setError("Select PDF");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("pdf", file);
      Object.entries(meta).forEach(([k, v]) => {
        if (k === "types") form.append("types", (v as string[]).join(","));
        else form.append(k, String(v));
      });
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(base + "/api/ai/generate/pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: form,
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(data.items || []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateFromImage() {
    if (!file) {
      setError("Select image");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      Object.entries(meta).forEach(([k, v]) => {
        if (k === "types") form.append("types", (v as string[]).join(","));
        else form.append(k, String(v));
      });
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(base + "/api/ai/generate/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: form,
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(data.items || []);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Helpers for editing and diagrams
  function toggleEdit(i: number) {
    setEditing((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  function updateGeneratedQuestion(i: number, patch: Partial<GenQuestion>) {
    setItems((arr) =>
      arr.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    );
  }

  function handleGeneratedDiagram(i: number, file: File | null) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Image too large. Please keep under ~1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      updateGeneratedQuestion(i, { diagramDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  // Paper editing helpers
  const isDataUrl = (src?: string) => !!src && src.startsWith("data:");
  const pqKey = (si: number, qi: number) => `${si}:${qi}`;
  function togglePaperEdit(si: number, qi: number) {
    setPaperEditing((prev) => {
      const n = new Set(prev);
      const k = pqKey(si, qi);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  function updatePaperQuestion(
    si: number,
    qi: number,
    patch: Partial<GenQuestion>
  ) {
    setPaperResult((pr) => {
      if (!pr) return pr;
      const sections = pr.sections.map((sec, i) => {
        if (i !== si) return sec;
        const questions = sec.questions.map((q, j) =>
          j === qi ? { ...q, ...patch } : q
        );
        return { ...sec, questions };
      });
      return { ...pr, sections };
    });
  }
  function handlePaperDiagram(si: number, qi: number, file: File | null) {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Image too large. Please keep under ~1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      updatePaperQuestion(si, qi, { diagramDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "text") generateFromText();
    else if (mode === "pdf") generateFromPdf();
    else generateFromImage();
  }

  async function addToBank(indices: number[]) {
    if (!meta.class || !meta.class.trim()) {
      alert(
        "Class is required to save questions (per-class storage). Please set the Class field."
      );
      return;
    }
    const toAdd = indices.map((i) => items[i]).filter(Boolean);
    if (!toAdd.length) return;

    try {
      // Upload diagrams first if they exist
      const questionsWithUrls = await Promise.all(
        toAdd.map(async (q) => {
          let diagramUrl = q.diagramUrl;

          // Upload data URL diagram to get persistent URL
          if (q.diagramDataUrl && q.diagramDataUrl.startsWith("data:")) {
            try {
              const blob = await (await fetch(q.diagramDataUrl)).blob();
              const form = new FormData();
              form.append(
                "image",
                new File([blob], "diagram.png", {
                  type: blob.type || "image/png",
                })
              );
              const base =
                process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
              const resp = await fetch(base + "/api/upload/image", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${
                    localStorage.getItem("accessToken") || ""
                  }`,
                },
                body: form,
              });
              if (resp.ok) {
                const d = await resp.json();
                diagramUrl = d.url;
              }
            } catch (e) {
              console.error("Diagram upload failed:", e);
            }
          }

          return {
            text: q.text,
            type: q.type || "mcq",
            subject: meta.subject || q.tags?.subject || "",
            topic: meta.topic || q.tags?.topic,
            difficulty: meta.difficulty || q.tags?.difficulty || "medium",
            // Add metadata fields
            class: meta.class || undefined,
            board: meta.board || undefined,
            chapter: meta.chapter || undefined,
            section: meta.section || undefined,
            marks: meta.marks || undefined,
            source: "Manual",
            options: q.options,
            correctAnswerText:
              q.integerAnswer !== undefined
                ? String(q.integerAnswer)
                : undefined,
            integerAnswer: q.integerAnswer,
            assertion: q.assertion,
            reason: q.reason,
            assertionIsTrue: q.assertionIsTrue,
            reasonIsTrue: q.reasonIsTrue,
            reasonExplainsAssertion: q.reasonExplainsAssertion,
            explanation: q.explanation,
            diagramUrl,
            diagramAlt: "Diagram",
          };
        })
      );

      // Use new validation endpoint
      const result = (await apiFetch("/api/ai/save-questions", {
        method: "POST",
        body: JSON.stringify({ questions: questionsWithUrls }),
      })) as {
        success: boolean;
        data: { saved: number; skipped: number; questions: unknown[] };
      };

      alert(
        `✅ Added ${result.data.saved}/${
          toAdd.length
        } questions to bank with validation!\n${
          result.data.skipped > 0
            ? `⚠️ Skipped ${result.data.skipped} duplicates.`
            : ""
        }`
      );

      // Clear selection after successful save
      setSelected(new Set());
    } catch (error) {
      console.error("Failed to add questions:", error);
      alert(
        "❌ Failed to add questions: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }

  // Selection helpers
  function toggle(idx: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(idx)) n.delete(idx);
      else n.add(idx);
      return n;
    });
  }

  function allSelected() {
    return items.length > 0 && selected.size === items.length;
  }

  function toggleAll() {
    if (allSelected()) setSelected(new Set());
    else setSelected(new Set(items.map((_, i) => i)));
  }

  async function refine(idx: number) {
    const q = items[idx];
    if (!q) return;
    setRefiningIdx(idx);
    try {
      const refined = (await apiFetch("/api/ai/refine", {
        method: "POST",
        body: JSON.stringify({
          question: q,
          notes: "Improve clarity",
          desiredDifficulty: meta.difficulty,
        }),
      })) as GenQuestion;
      setItems((arr) =>
        arr.map((it, i) => (i === idx ? { ...it, ...refined } : it))
      );
    } catch {
      // ignore
    } finally {
      setRefiningIdx(null);
    }
  }

  // Paper editing helpers will be added alongside the preview editing UI

  // Create Exam from Generated Questions (selected)
  async function createExamFromGenerated() {
    const indices = [...selected];
    if (!indices.length) {
      alert("Select questions to create an exam");
      return;
    }
    setGenExamCreating(true);
    try {
      const createdIds: string[] = [];
      for (const i of indices) {
        const q = items[i];
        if (!q) continue;
        try {
          // Upload diagram if present (data URL)
          let diagramUrl: string | undefined;
          if (q.diagramDataUrl && q.diagramDataUrl.startsWith("data:")) {
            try {
              const blob = await (await fetch(q.diagramDataUrl)).blob();
              const form = new FormData();
              form.append(
                "image",
                new File([blob], "diagram.png", {
                  type: blob.type || "image/png",
                })
              );
              const base =
                process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
              const resp = await fetch(base + "/api/upload/image", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${
                    localStorage.getItem("accessToken") || ""
                  }`,
                },
                body: form,
              });
              if (resp.ok) {
                const d = await resp.json();
                diagramUrl = d.url as string;
              }
            } catch {
              // ignore
            }
          }
          const created = (await apiFetch("/api/exams/questions", {
            method: "POST",
            body: JSON.stringify({
              text: q.text,
              type: q.type || "mcq",
              assertion: q.assertion,
              reason: q.reason,
              assertionIsTrue: q.assertionIsTrue,
              reasonIsTrue: q.reasonIsTrue,
              reasonExplainsAssertion: q.reasonExplainsAssertion,
              integerAnswer: q.integerAnswer,
              tags: {
                subject: meta.subject || q.tags?.subject,
                topic: meta.topic || q.tags?.topic,
                difficulty: meta.difficulty || q.tags?.difficulty,
              },
              options: q.options,
              correctAnswerText:
                q.integerAnswer !== undefined
                  ? String(q.integerAnswer)
                  : undefined,
              explanation: q.explanation,
              diagramUrl,
              diagramAlt: "Diagram",
            }),
          })) as { _id?: string };
          if (created && created._id) createdIds.push(created._id);
        } catch {
          // skip failed question
        }
      }
      if (!createdIds.length) throw new Error("No questions created");
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: genExamTitle,
          description: "Created from AI generated questions",
          sections: [
            {
              title: "Section 1",
              questionIds: createdIds,
              shuffleQuestions: false,
              shuffleOptions: false,
            },
          ],
          isPublished: autoPublish,
          totalDurationMins: genTimerMins ? Number(genTimerMins) : undefined,
          classLevel: classLevel || undefined,
          batch: batch || undefined,
        }),
      });
      alert("Exam created from generated questions");
      setGenExamOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create exam");
    } finally {
      setGenExamCreating(false);
    }
  }

  // Paper blueprint editing helpers
  function updateSection(index: number, patch: Partial<PaperSectionBlueprint>) {
    setPaperBlueprint((pb) => {
      const sections = pb.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      );
      return { ...pb, sections };
    });
  }

  function addSection() {
    setPaperBlueprint((pb) => ({
      ...pb,
      sections: [
        ...pb.sections,
        {
          title: `Section ${String.fromCharCode(65 + pb.sections.length)}`,
          instructions: "",
          marksPerQuestion: 1,
          questionCounts: { mcq: 2 },
          difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        },
      ],
    }));
  }

  function removeSection(i: number) {
    setPaperBlueprint((pb) => ({
      ...pb,
      sections: pb.sections.filter((_, idx) => idx !== i),
    }));
  }

  function updateQuestionCount(
    sectionIdx: number,
    type: string,
    value: number
  ) {
    updateSection(sectionIdx, {
      questionCounts: {
        ...paperBlueprint.sections[sectionIdx].questionCounts,
        [type]: value,
      },
    });
  }

  function updateDifficulty(
    sectionIdx: number,
    key: keyof PaperSectionBlueprint["difficultyDistribution"],
    value: number
  ) {
    updateSection(sectionIdx, {
      difficultyDistribution: {
        ...paperBlueprint.sections[sectionIdx].difficultyDistribution,
        [key]: value,
      },
    });
  }

  async function generatePaper() {
    setPaperLoading(true);
    try {
      if (paperInputMode === "text") {
        if (!paperSource || paperSource.trim().length < 100) {
          alert("Provide at least 100 chars of source text");
          setPaperLoading(false);
          return;
        }
        const res = (await apiFetch("/api/ai/generate/paper", {
          method: "POST",
          body: JSON.stringify({
            sourceText: paperSource,
            blueprint: paperBlueprint,
          }),
        })) as GeneratedPaperResult;
        setPaperResult(res);
        // persist to history
        try {
          await apiFetch("/api/papers", {
            method: "POST",
            body: JSON.stringify({
              ...res,
              meta: { source: "ai", blueprint: paperBlueprint },
            }),
          });
        } catch {}
      } else if (paperInputMode === "pdf") {
        if (!paperPdfFile) {
          alert("Select PDF");
          setPaperLoading(false);
          return;
        }
        const form = new FormData();
        form.append("file", paperPdfFile);
        form.append("blueprint", JSON.stringify(paperBlueprint));
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(base + "/api/ai/generate/paper-pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("accessToken") || ""
            }`,
          },
          body: form,
        });
        if (!res.ok) {
          let msg = "Paper PDF generation failed";
          try {
            const err = await res.json();
            if (err?.message) msg = err.message as string;
          } catch {
            /* ignore parse error */
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as GeneratedPaperResult;
        setPaperResult(data);
        try {
          await apiFetch("/api/papers", {
            method: "POST",
            body: JSON.stringify({
              ...data,
              meta: { source: "ai-pdf", blueprint: paperBlueprint },
            }),
          });
        } catch {}
      } else {
        if (!paperImageFile) {
          alert("Select image");
          setPaperLoading(false);
          return;
        }
        const form = new FormData();
        form.append("image", paperImageFile);
        form.append("blueprint", JSON.stringify(paperBlueprint));
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(base + "/api/ai/generate/paper-image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("accessToken") || ""
            }`,
          },
          body: form,
        });
        if (!res.ok) {
          let msg = "Paper Image generation failed";
          try {
            const err = await res.json();
            if (err?.message) msg = err.message as string;
          } catch {
            /* ignore parse error */
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as GeneratedPaperResult;
        setPaperResult(data);
        try {
          await apiFetch("/api/papers", {
            method: "POST",
            body: JSON.stringify({
              ...data,
              meta: { source: "ai-image", blueprint: paperBlueprint },
            }),
          });
        } catch {}
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Paper generation failed");
    } finally {
      setPaperLoading(false);
    }
  }

  function printablePaper() {
    if (!paperResult) return null;
    return (
      <div className="printable-paper p-6 text-[13px] leading-relaxed max-w-4xl mx-auto print:text-black">
        <h1 className="text-center text-xl font-semibold mb-1">
          {paperResult.examTitle}
        </h1>
        {paperResult.subject && (
          <div className="text-center mb-2 font-medium">
            Subject: {paperResult.subject}
          </div>
        )}
        <ol className="text-xs mb-4 list-decimal pl-5 space-y-0.5">
          {paperResult.generalInstructions.map((ins, i) => (
            <li key={i}>
              <MathText text={ins} />
            </li>
          ))}
        </ol>
        {paperResult.sections.map((sec, si) => (
          <div key={si} className="mb-6">
            <h2 className="font-semibold mb-1">
              {sec.title}{" "}
              {sec.instructions && (
                <span className="text-gray-500 font-normal">
                  - <MathText text={sec.instructions} />
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {sec.questions.map((q, qi) => (
                <div key={qi} className="border-b pb-2">
                  <div className="font-medium mb-1">
                    <MathText text={`${qi + 1}. ${q.text || ""}`} />
                  </div>
                  {q.diagramDataUrl && (
                    <div className="ml-4 mb-2">
                      {isDataUrl(q.diagramDataUrl) ? (
                        <img
                          src={q.diagramDataUrl}
                          alt="Diagram"
                          className="h-auto w-auto max-h-52"
                        />
                      ) : (
                        <Image
                          src={q.diagramDataUrl}
                          alt="Diagram"
                          width={400}
                          height={300}
                          className="h-auto w-auto max-h-52"
                        />
                      )}
                    </div>
                  )}
                  {q.type === "assertionreason" && (
                    <div className="ml-4 text-xs text-gray-600 space-y-1">
                      {q.assertion && (
                        <div>
                          <strong>Assertion (A):</strong>{" "}
                          <MathText text={q.assertion} />
                        </div>
                      )}
                      {q.reason && (
                        <div>
                          <strong>Reason (R):</strong>{" "}
                          <MathText text={q.reason} />
                        </div>
                      )}
                      <ol className="ml-5 list-[upper-alpha] space-y-0.5 mt-1">
                        <li>
                          Both A and R are true, and R is the correct
                          explanation of A.
                        </li>
                        <li>
                          Both A and R are true, but R is not the correct
                          explanation of A.
                        </li>
                        <li>A is true, but R is false.</li>
                        <li>A is false, but R is true.</li>
                      </ol>
                    </div>
                  )}
                  {q.type === "mcq" && q.options && (
                    <ol className="ml-5 list-[upper-alpha] space-y-0.5 text-xs">
                      {q.options.map((o, oi) => (
                        <li key={oi}>
                          <MathText text={o.text} />
                        </li>
                      ))}
                    </ol>
                  )}
                  {q.type === "integer" && q.integerAnswer !== undefined && (
                    <div className="text-xs text-gray-600 ml-2">
                      (Integer answer)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // function handlePrint() {
  //   // Open the print preview modal. Actual printing is triggered by the
  //   // Print button inside the modal (so we only print the question paper)
  //   setShowPrintPreview(true);
  // }

  function closePrintPreview() {
    setShowPrintPreview(false);
  }

  function doPrint() {
    // Guard
    if (printing) return;
    setPrinting(true);
    // Apply the helper class so the @media print rules show only the paper
    document.body.classList.add("print-paper-only");

    // Allow the browser to repaint and apply the class before printing
    setTimeout(() => {
      try {
        window.print();
      } finally {
        // cleanup
        document.body.classList.remove("print-paper-only");
        setShowPrintPreview(false);
        setPrinting(false);
      }
    }, 200);
  }

  async function downloadPdfFromServer() {
    if (!paperResult) return;
    if (downloading) return;
    setDownloading(true);
    try {
      // Convert LaTeX to MathML before sending to server so exported PDF contains proper MathML
      const mathmlPaper = convertPaperToMathMLHtml(paperResult);
      const res = await fetch(`/api/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: mathmlPaper, mathFormat: "mathml" }),
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("application/pdf")) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Server did not return a PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (paperResult.examTitle || "question-paper").replace(
        /[^a-z0-9\-_]+/gi,
        "_"
      );
      a.download = `${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function downloadWordFromServer() {
    if (!paperResult) return;
    if (downloading) return;
    setDownloading(true);
    try {
      // Convert LaTeX to MathML prior to Word export
      const mathmlPaper = convertPaperToMathMLHtml(paperResult);
      const res = await fetch(`/api/word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper: mathmlPaper, mathFormat: "mathml" }),
      });
      if (!res.ok) throw new Error("Failed to generate Word document");
      const contentType = res.headers.get("Content-Type") || "";
      if (
        !contentType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) &&
        !contentType.includes("application/msword")
      ) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Server did not return a Word document");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (paperResult.examTitle || "question-paper").replace(
        /[^a-z0-9\-_]+/gi,
        "_"
      );
      a.download = `${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Word document download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function savePaperToHistory() {
    if (!paperResult) return;
    if (savingPaper) return;
    setSavingPaper(true);
    try {
      await apiFetch("/api/papers", {
        method: "POST",
        body: JSON.stringify({
          ...paperResult,
          meta: { source: "manual", blueprint: paperBlueprint },
        }),
      });
      alert("Saved to Papers");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPaper(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        // Updated container to be more responsive and constrained on small screens
        className="mx-auto px-4 sm:px-6 py-8 max-w-5xl lg:max-w-7xl"
      >
        {/* Navigation Tabs */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-8 px-2"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-200/50 max-w-full overflow-hidden">
            {/* Use flex-wrap so tabs don't overflow on small screens */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                {
                  id: "generate",
                  label: "Generate Questions",
                  icon: QuestionMarkCircleIcon,
                },
                {
                  id: "paper",
                  label: "Paper Generator",
                  icon: DocumentTextIcon,
                },
              ].map((tabItem) => (
                <motion.button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id as "generate" | "paper")}
                  className={`relative flex items-center gap-2 min-w-0 w-full sm:w-auto sm:px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    tab === tabItem.id
                      ? "text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {tab === tabItem.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <div className="relative flex items-center gap-2 whitespace-nowrap px-1">
                    <tabItem.icon className="w-5 h-5" />
                    <span className="whitespace-nowrap">{tabItem.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === "generate" ? (
            <motion.div
              key="generate"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-6"
            >
              {/* Generation Form */}
              <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
              >
                <form onSubmit={onSubmit} className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                      <BeakerIcon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Generate Questions
                    </h2>
                  </div>

                  {/* Input Mode Selection */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-gray-700">
                      Input Mode
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        {
                          id: "pdf",
                          label: "PDF Upload",
                          icon: DocumentTextIcon,
                        },
                        {
                          id: "image",
                          label: "Image (OCR)",
                          icon: ArrowDownTrayIcon,
                        },
                        { id: "text", label: "Text Input", icon: BookOpenIcon },
                      ].map((modeItem) => (
                        <motion.label
                          key={modeItem.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 w-full sm:w-auto ${
                            mode === modeItem.id
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <input
                            type="radio"
                            name="mode"
                            value={modeItem.id}
                            checked={mode === modeItem.id}
                            onChange={() =>
                              setMode(modeItem.id as "pdf" | "text")
                            }
                            className="sr-only"
                          />
                          <modeItem.icon className="w-5 h-5" />
                          <span className="font-medium">{modeItem.label}</span>
                          {mode === modeItem.id && (
                            <CheckCircleIcon className="w-5 h-5 text-blue-500 ml-auto" />
                          )}
                        </motion.label>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200 space-y-4">
                    <h4 className="text-sm font-semibold text-emerald-900">
                      Question Metadata (Optional)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Class
                        </label>
                        <input
                          type="text"
                          value={meta.class}
                          onChange={(e) =>
                            setMeta({ ...meta, class: e.target.value })
                          }
                          placeholder="e.g., 10"
                          className="w-full px-3 py-2 text-sm border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Board
                        </label>
                        <input
                          type="text"
                          value={meta.board}
                          onChange={(e) =>
                            setMeta({ ...meta, board: e.target.value })
                          }
                          placeholder="e.g., CBSE"
                          className="w-full px-3 py-2 text-sm border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Chapter
                        </label>
                        <input
                          type="text"
                          value={meta.chapter}
                          onChange={(e) =>
                            setMeta({ ...meta, chapter: e.target.value })
                          }
                          placeholder="e.g., Algebra"
                          className="w-full px-3 py-2 text-sm border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Section
                        </label>
                        <input
                          type="text"
                          value={meta.section}
                          onChange={(e) =>
                            setMeta({ ...meta, section: e.target.value })
                          }
                          placeholder="e.g., Objective"
                          className="w-full px-3 py-2 text-sm border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Marks
                        </label>
                        <input
                          type="number"
                          value={meta.marks}
                          onChange={(e) =>
                            setMeta({
                              ...meta,
                              marks: parseInt(e.target.value) || 1,
                            })
                          }
                          placeholder="1"
                          className="w-full px-3 py-2 text-sm border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Question Types */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-gray-700">
                      Question Types
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {ALL_TYPES.map((typeItem) => {
                        // map colors to concrete Tailwind classes to avoid
                        // dynamic class name issues (Tailwind purge/compile)
                        const colorMap: Record<
                          string,
                          {
                            bg: string;
                            border: string;
                            text: string;
                            checkBg: string;
                          }
                        > = {
                          blue: {
                            bg: "bg-blue-50",
                            border: "border-blue-500",
                            text: "text-blue-700",
                            checkBg: "bg-blue-500",
                          },
                          green: {
                            bg: "bg-green-50",
                            border: "border-green-500",
                            text: "text-green-700",
                            checkBg: "bg-green-500",
                          },
                          purple: {
                            bg: "bg-purple-50",
                            border: "border-purple-500",
                            text: "text-purple-700",
                            checkBg: "bg-purple-500",
                          },
                          orange: {
                            bg: "bg-orange-50",
                            border: "border-orange-500",
                            text: "text-orange-700",
                            checkBg: "bg-orange-500",
                          },
                          red: {
                            bg: "bg-red-50",
                            border: "border-red-500",
                            text: "text-red-700",
                            checkBg: "bg-red-500",
                          },
                          indigo: {
                            bg: "bg-indigo-50",
                            border: "border-indigo-500",
                            text: "text-indigo-700",
                            checkBg: "bg-indigo-500",
                          },
                          teal: {
                            bg: "bg-teal-50",
                            border: "border-teal-500",
                            text: "text-teal-700",
                            checkBg: "bg-teal-500",
                          },
                        };
                        const cols = colorMap[typeItem.color] || colorMap.blue;
                        const active = meta.types.includes(typeItem.id);
                        return (
                          <motion.label
                            key={typeItem.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                              active
                                ? `${cols.border} ${cols.bg} ${cols.text}`
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleType(typeItem.id)}
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                active
                                  ? `${cols.checkBg} border-transparent`
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {active && (
                                <CheckIcon className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium">
                              {typeItem.label}
                            </span>
                          </motion.label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="space-y-4">
                    {mode === "pdf" || mode === "image" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Upload{" "}
                          {mode === "pdf" ? "PDF" : "Image (PNG/JPG/WEBP)"}
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept={
                              mode === "pdf" ? "application/pdf" : "image/*"
                            }
                            {...(mode === "image"
                              ? { capture: "environment" }
                              : {})}
                            onChange={(e) =>
                              setFile(e.target.files?.[0] || null)
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Source Text
                        </label>
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Paste your source content here (minimum 50 characters)..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none h-32"
                        />
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        placeholder="e.g., Mathematics"
                        value={meta.subject}
                        onChange={(e) =>
                          setMeta({ ...meta, subject: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Topic
                      </label>
                      <input
                        placeholder="e.g., Algebra"
                        value={meta.topic}
                        onChange={(e) =>
                          setMeta({ ...meta, topic: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Difficulty
                      </label>
                      <select
                        value={meta.difficulty}
                        onChange={(e) =>
                          setMeta({ ...meta, difficulty: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={meta.count}
                        onChange={(e) =>
                          setMeta({ ...meta, count: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Error Display */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600"
                      >
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RocketLaunchIcon className="w-5 h-5" />
                        Generate Questions
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>

              {/* Generated Questions */}
              <motion.div variants={itemVariants}>
                {/* Make header stack on small screens and actions wrap */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg text-white">
                      <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Generated Questions ({items.length})
                    </h3>
                  </div>

                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
                      <motion.button
                        onClick={() => addToBank([...selected])}
                        disabled={!selected.size}
                        className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200"
                        whileHover={{ scale: selected.size ? 1.02 : 1 }}
                        whileTap={{ scale: selected.size ? 0.98 : 1 }}
                      >
                        <PlusCircleIcon className="w-4 h-4" />
                        <span className="truncate">
                          Add Selected ({selected.size})
                        </span>
                      </motion.button>

                      <motion.button
                        onClick={() => addToBank(items.map((_, i) => i))}
                        className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <PlusCircleIcon className="w-4 h-4" />
                        <span className="truncate">Add All</span>
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          setGenExamTitle(
                            items.length
                              ? `AI Exam (${items.length} Questions)`
                              : "AI Exam"
                          );
                          setGenExamOpen(true);
                        }}
                        disabled={!selected.size}
                        className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                        whileHover={{ scale: selected.size ? 1.02 : 1 }}
                        whileTap={{ scale: selected.size ? 0.98 : 1 }}
                      >
                        <AcademicCapIcon className="w-4 h-4" />
                        <span className="truncate">Create Exam</span>
                      </motion.button>
                    </div>
                  )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg overflow-hidden">
                  {items.length > 0 && (
                    <motion.div
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={allSelected()}
                          onChange={toggleAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="truncate">Select All Questions</span>
                      </label>
                      <span className="text-sm text-gray-500">
                        {selected.size} of {items.length} selected
                      </span>
                    </motion.div>
                  )}

                  <div className="divide-y divide-gray-200">
                    <AnimatePresence>
                      {items.map((q, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-6 transition-all duration-200 ${
                            selected.has(i)
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={selected.has(i)}
                              onChange={() => toggle(i)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 flex-shrink-0"
                            />

                            <div className="flex-1 space-y-3 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Q{i + 1}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        q.type === "mcq"
                                          ? "bg-blue-100 text-blue-800"
                                          : q.type === "truefalse"
                                          ? "bg-green-100 text-green-800"
                                          : q.type === "fill"
                                          ? "bg-purple-100 text-purple-800"
                                          : q.type === "short"
                                          ? "bg-orange-100 text-orange-800"
                                          : q.type === "long"
                                          ? "bg-red-100 text-red-800"
                                          : q.type === "assertionreason"
                                          ? "bg-indigo-100 text-indigo-800"
                                          : "bg-teal-100 text-teal-800"
                                      }`}
                                    >
                                      {ALL_TYPES.find((t) => t.id === q.type)
                                        ?.label || q.type}
                                    </span>
                                  </div>
                                  {editing.has(i) ? (
                                    <textarea
                                      className="w-full border rounded-md p-2 text-sm mb-2"
                                      value={q.text}
                                      onChange={(e) =>
                                        updateGeneratedQuestion(i, {
                                          text: e.target.value,
                                        })
                                      }
                                    />
                                  ) : (
                                    <h4 className="text-gray-900 font-medium leading-relaxed mb-3 break-words whitespace-pre-wrap">
                                      <MathText text={q.text} />
                                    </h4>
                                  )}

                                  {q.type === "mcq" && q.options && (
                                    <ol className="ml-6 space-y-1 text-sm text-gray-600">
                                      {q.options.map((o, oi) => (
                                        <li
                                          key={oi}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="font-medium text-gray-400 mt-0.5">
                                            {String.fromCharCode(65 + oi)}.
                                          </span>
                                          {editing.has(i) ? (
                                            <div className="flex-1 flex items-center gap-2">
                                              <input
                                                className="flex-1 border rounded px-2 py-1 text-sm"
                                                value={o.text}
                                                onChange={(e) =>
                                                  updateGeneratedQuestion(i, {
                                                    options: q.options?.map(
                                                      (x, idx) =>
                                                        idx === oi
                                                          ? {
                                                              ...x,
                                                              text: e.target
                                                                .value,
                                                            }
                                                          : x
                                                    ),
                                                  })
                                                }
                                              />
                                              <label className="text-xs text-gray-600 flex items-center gap-1">
                                                <input
                                                  type="checkbox"
                                                  checked={!!o.isCorrect}
                                                  onChange={(e) =>
                                                    updateGeneratedQuestion(i, {
                                                      options: q.options?.map(
                                                        (x, idx) =>
                                                          idx === oi
                                                            ? {
                                                                ...x,
                                                                isCorrect:
                                                                  e.target
                                                                    .checked,
                                                              }
                                                            : x
                                                      ),
                                                    })
                                                  }
                                                />
                                                Correct
                                              </label>
                                            </div>
                                          ) : (
                                            <span
                                              className={
                                                o.isCorrect
                                                  ? "text-green-600 font-medium"
                                                  : ""
                                              }
                                            >
                                              <MathText text={o.text} />
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ol>
                                  )}

                                  {q.type === "assertionreason" && (
                                    <div className="ml-4 space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                      <div>
                                        <strong className="text-gray-700">
                                          Assertion (A):
                                        </strong>{" "}
                                        {editing.has(i) ? (
                                          <input
                                            className="border rounded px-2 py-1 text-sm w-full mt-1"
                                            value={q.assertion || ""}
                                            onChange={(e) =>
                                              updateGeneratedQuestion(i, {
                                                assertion: e.target.value,
                                              })
                                            }
                                          />
                                        ) : (
                                          <span>{q.assertion}</span>
                                        )}
                                      </div>
                                      <div>
                                        <strong className="text-gray-700">
                                          Reason (R):
                                        </strong>{" "}
                                        {editing.has(i) ? (
                                          <input
                                            className="border rounded px-2 py-1 text-sm w-full mt-1"
                                            value={q.reason || ""}
                                            onChange={(e) =>
                                              updateGeneratedQuestion(i, {
                                                reason: e.target.value,
                                              })
                                            }
                                          />
                                        ) : (
                                          <span>{q.reason}</span>
                                        )}
                                      </div>
                                      <ol className="ml-5 list-[upper-alpha] space-y-0.5 mt-2">
                                        <li>
                                          Both A and R are true, and R is the
                                          correct explanation of A.
                                        </li>
                                        <li>
                                          Both A and R are true, but R is not
                                          the correct explanation of A.
                                        </li>
                                        <li>A is true, but R is false.</li>
                                        <li>A is false, but R is true.</li>
                                      </ol>
                                    </div>
                                  )}

                                  <div className="mt-2">
                                    {q.diagramDataUrl &&
                                      (isDataUrl(q.diagramDataUrl) ? (
                                        <img
                                          src={q.diagramDataUrl}
                                          alt="Diagram"
                                          className="max-h-40 rounded border"
                                        />
                                      ) : (
                                        <Image
                                          src={q.diagramDataUrl}
                                          alt="Diagram"
                                          width={320}
                                          height={240}
                                          className="h-auto w-auto max-h-40 rounded border"
                                        />
                                      ))}
                                    {editing.has(i) && (
                                      <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) =>
                                            handleGeneratedDiagram(
                                              i,
                                              e.target.files?.[0] || null
                                            )
                                          }
                                        />
                                        Upload Diagram (optional)
                                      </label>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 ml-2">
                                  <motion.button
                                    onClick={() => toggleEdit(i)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Cog6ToothIcon className="w-3 h-3" />
                                    {editing.has(i) ? "Done" : "Edit"}
                                  </motion.button>
                                  <motion.button
                                    onClick={() => refine(i)}
                                    disabled={refiningIdx === i}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    whileHover={{
                                      scale: refiningIdx === i ? 1 : 1.05,
                                    }}
                                    whileTap={{
                                      scale: refiningIdx === i ? 1 : 0.95,
                                    }}
                                  >
                                    {refiningIdx === i ? (
                                      <>
                                        <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                        Refining...
                                      </>
                                    ) : (
                                      <>
                                        <Cog6ToothIcon className="w-3 h-3" />
                                        Refine
                                      </>
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {items.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-500">
                      <BeakerIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">
                        No questions generated yet
                      </p>
                      <p className="text-sm">
                        Upload a PDF or enter text content to generate questions
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="paper"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-6"
            >
              {/* Paper Generator Content */}
              <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 space-y-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-white">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Paper Blueprint
                  </h2>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Exam Title
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter exam title"
                      value={paperBlueprint.examTitle}
                      onChange={(e) =>
                        setPaperBlueprint((pb) => ({
                          ...pb,
                          examTitle: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Subject (optional)
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Mathematics"
                      value={paperBlueprint.subject}
                      onChange={(e) =>
                        setPaperBlueprint((pb) => ({
                          ...pb,
                          subject: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* General Instructions */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">
                    General Instructions
                  </label>
                  <div className="space-y-3">
                    {paperBlueprint.generalInstructions.map((ins, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          value={ins}
                          onChange={(e) =>
                            setPaperBlueprint((pb) => {
                              const gi = [...pb.generalInstructions];
                              gi[i] = e.target.value;
                              return { ...pb, generalInstructions: gi };
                            })
                          }
                        />
                        <motion.button
                          type="button"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          onClick={() =>
                            setPaperBlueprint((pb) => ({
                              ...pb,
                              generalInstructions:
                                pb.generalInstructions.filter(
                                  (_, idx) => idx !== i
                                ),
                            }))
                          }
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </motion.button>
                      </motion.div>
                    ))}
                    <motion.button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-200"
                      onClick={() =>
                        setPaperBlueprint((pb) => ({
                          ...pb,
                          generalInstructions: [...pb.generalInstructions, ""],
                        }))
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircleIcon className="w-4 h-4" />
                      Add Instruction
                    </motion.button>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Exam Sections
                    </label>
                    <motion.button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all duration-200"
                      onClick={addSection}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircleIcon className="w-4 h-4" />
                      Add Section
                    </motion.button>
                  </div>

                  <div className="space-y-4">
                    {paperBlueprint.sections.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50/50"
                      >
                        {/* Section Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Section Title
                            </label>
                            <input
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="e.g., Section A"
                              value={s.title}
                              onChange={(e) =>
                                updateSection(i, { title: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Instructions
                            </label>
                            <input
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="e.g., Single correct MCQs"
                              value={s.instructions}
                              onChange={(e) =>
                                updateSection(i, {
                                  instructions: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Marks per Question
                            </label>
                            <input
                              type="number"
                              min={0}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              value={s.marksPerQuestion}
                              onChange={(e) =>
                                updateSection(i, {
                                  marksPerQuestion: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* Question Counts */}
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-gray-600">
                            Question Distribution
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {ALL_TYPES.map((t) => (
                              <div key={t.id} className="space-y-1">
                                <label className="text-xs text-gray-500">
                                  {t.label}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  value={s.questionCounts[t.id] || 0}
                                  onChange={(e) =>
                                    updateQuestionCount(
                                      i,
                                      t.id,
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Difficulty Distribution */}
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-gray-600">
                            Difficulty Distribution (%)
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {["easy", "medium", "hard"].map((level) => (
                              <div key={level} className="space-y-1">
                                <label className="text-xs text-gray-500 capitalize">
                                  {level}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  value={
                                    s.difficultyDistribution[
                                      level as keyof typeof s.difficultyDistribution
                                    ]
                                  }
                                  onChange={(e) =>
                                    updateDifficulty(
                                      i,
                                      level as keyof PaperSectionBlueprint["difficultyDistribution"],
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Remove Section */}
                        <div className="flex justify-end pt-2">
                          <motion.button
                            type="button"
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200"
                            onClick={() => removeSection(i)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <XMarkIcon className="w-3 h-3" />
                            Remove Section
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Blueprint Management */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
                  <motion.button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    onClick={openBlueprintModal}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <BookOpenIcon className="w-4 h-4" />
                    Manage Blueprints
                  </motion.button>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <input
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-auto"
                      placeholder="Blueprint name"
                      value={newBlueprintName}
                      onChange={(e) => setNewBlueprintName(e.target.value)}
                    />
                    <motion.button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto"
                      onClick={saveCurrentBlueprint}
                      disabled={savingBlueprint}
                      whileHover={{ scale: savingBlueprint ? 1 : 1.02 }}
                      whileTap={{ scale: savingBlueprint ? 1 : 0.98 }}
                    >
                      {savingBlueprint ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4" />
                          Save Blueprint
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Source Input & Generate */}
              <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg text-white">
                    <ChartBarIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Generate Paper
                  </h2>
                </div>

                {/* Input Mode Selection */}
                <div className="flex-1 gap-2 ">
                  {[
                    { id: "text", label: "Text Source", icon: BookOpenIcon },
                    { id: "pdf", label: "PDF Source", icon: DocumentTextIcon },
                    {
                      id: "image",
                      label: "Image (OCR)",
                      icon: ArrowDownTrayIcon,
                    },
                  ].map((modeItem) => (
                    <motion.label
                      key={modeItem.id}
                      className={`
                        flex items-center gap-2 px-2 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${
                          paperInputMode === modeItem.id
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <input
                        type="radio"
                        name="paper-input-mode"
                        value={modeItem.id}
                        checked={paperInputMode === modeItem.id}
                        onChange={() =>
                          setPaperInputMode(
                            modeItem.id as "text" | "pdf" | "image"
                          )
                        }
                        className="sr-only"
                      />
                      <modeItem.icon className="w-5 h-5" />
                      <span className="font-medium">{modeItem.label}</span>
                      {paperInputMode === modeItem.id && (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 ml-auto" />
                      )}
                    </motion.label>
                  ))}
                </div>

                {/* Input Area */}
                {paperInputMode === "text" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Source Content
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none h-36"
                      placeholder="Paste your source content here (minimum 100 characters)..."
                      value={paperSource}
                      onChange={(e) => setPaperSource(e.target.value)}
                    />
                  </div>
                ) : paperInputMode === "pdf" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Upload PDF
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      onChange={(e) =>
                        setPaperPdfFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Upload Image (PNG/JPG/WEBP)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      onChange={(e) =>
                        setPaperImageFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <motion.button
                    type="button"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full sm:w-auto"
                    onClick={generatePaper}
                    disabled={paperLoading}
                    whileHover={{ scale: paperLoading ? 1 : 1.02 }}
                    whileTap={{ scale: paperLoading ? 1 : 0.98 }}
                  >
                    {paperLoading ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RocketLaunchIcon className="w-5 h-5" />
                        Generate Paper
                      </>
                    )}
                  </motion.button>

                  {paperResult && (
                    <>
                      {/* <motion.button
                        type="button"
                        className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 w-full sm:w-auto"
                        onClick={handlePrint}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <PrinterIcon className="w-5 h-5" />
                        Print Paper
                      </motion.button> */}

                      <motion.button
                        type="button"
                        className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 w-full sm:w-auto"
                        onClick={savePaperToHistory}
                        disabled={savingPaper}
                        whileHover={{ scale: savingPaper ? 1 : 1.02 }}
                        whileTap={{ scale: savingPaper ? 1 : 0.98 }}
                      >
                        {savingPaper ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <DocumentTextIcon className="w-5 h-5" />
                            Save to Papers
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200 w-full sm:w-auto"
                        onClick={downloadPdfFromServer}
                        disabled={downloading}
                        whileHover={{ scale: downloading ? 1 : 1.02 }}
                        whileTap={{ scale: downloading ? 1 : 0.98 }}
                      >
                        {downloading ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            Preparing PDF…
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download PDF
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 w-full sm:w-auto"
                        onClick={downloadWordFromServer}
                        disabled={downloading}
                        whileHover={{ scale: downloading ? 1 : 1.02 }}
                        whileTap={{ scale: downloading ? 1 : 0.98 }}
                      >
                        {downloading ? (
                          <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            Preparing Word…
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download Word
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                        onClick={openCreateExam}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <AcademicCapIcon className="w-5 h-5" />
                        Create Exam
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Paper Preview */}
              <AnimatePresence>
                {paperResult && (
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                          <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <h3 className="md:text-xl text-lg font-semibold text-gray-900">
                          Paper Preview
                        </h3>
                      </div>

                      <div className="max-h-[80vh] overflow-auto space-y-6">
                        {paperResult.sections.map((sec, si) => (
                          <motion.div
                            key={si}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: si * 0.1 }}
                            className="border border-gray-200 rounded-xl p-2 bg-gray-50/30"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {String.fromCharCode(65 + si)}
                              </div>
                              <h4 className="font-semibold text-gray-900">
                                {sec.title}
                              </h4>
                              {sec.instructions && (
                                <span className="text-sm text-gray-500">
                                  - {sec.instructions}
                                </span>
                              )}
                            </div>

                            <div className="space-y-4">
                              {sec.questions.map((q, qi) => (
                                <motion.div
                                  key={qi}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: si * 0.1 + qi * 0.05 }}
                                  className="p-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex gap-2">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                      {qi + 1}
                                    </span>
                                    <div className="flex-1 mt-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          {paperEditing.has(pqKey(si, qi)) ? (
                                            <textarea
                                              className="w-full border rounded-md p-2 text-xs mb-2"
                                              value={q.text}
                                              onChange={(e) =>
                                                updatePaperQuestion(si, qi, {
                                                  text: e.target.value,
                                                })
                                              }
                                            />
                                          ) : (
                                            <div className="text-gray-900 text-sm leading-relaxed mb-2 break-words whitespace-pre-wrap">
                                              {q.text}
                                            </div>
                                          )}
                                        </div>
                                        <div className="ml-2">
                                          <button
                                            onClick={() =>
                                              togglePaperEdit(si, qi)
                                            }
                                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                                          >
                                            {paperEditing.has(pqKey(si, qi))
                                              ? "Done"
                                              : "Edit"}
                                          </button>
                                        </div>
                                      </div>
                                      {q.diagramDataUrl &&
                                        (isDataUrl(q.diagramDataUrl) ? (
                                          <img
                                            src={q.diagramDataUrl}
                                            alt="Diagram"
                                            className="h-auto w-auto max-h-40 rounded border"
                                          />
                                        ) : (
                                          <Image
                                            src={q.diagramDataUrl}
                                            alt="Diagram"
                                            width={320}
                                            height={240}
                                            className="h-auto w-auto max-h-40 rounded border"
                                          />
                                        ))}

                                      {paperEditing.has(pqKey(si, qi)) && (
                                        <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                              handlePaperDiagram(
                                                si,
                                                qi,
                                                e.target.files?.[0] || null
                                              )
                                            }
                                          />
                                          Upload Diagram (optional)
                                        </label>
                                      )}

                                      {q.type === "mcq" && q.options && (
                                        <ol className="ml-4 space-y-1 text-sm text-gray-600">
                                          {q.options.map((o, oi) => (
                                            <li
                                              key={oi}
                                              className="flex items-start gap-2"
                                            >
                                              <span className="font-medium text-gray-400 mt-0.5">
                                                {String.fromCharCode(65 + oi)}.
                                              </span>
                                              {paperEditing.has(
                                                pqKey(si, qi)
                                              ) ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                  <input
                                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                                    value={o.text}
                                                    onChange={(e) =>
                                                      updatePaperQuestion(
                                                        si,
                                                        qi,
                                                        {
                                                          options:
                                                            q.options?.map(
                                                              (x, idx) =>
                                                                idx === oi
                                                                  ? {
                                                                      ...x,
                                                                      text: e
                                                                        .target
                                                                        .value,
                                                                    }
                                                                  : x
                                                            ),
                                                        }
                                                      )
                                                    }
                                                  />
                                                  <label className="text-xs text-gray-600 flex items-center gap-1">
                                                    <input
                                                      type="checkbox"
                                                      checked={!!o.isCorrect}
                                                      onChange={(e) =>
                                                        updatePaperQuestion(
                                                          si,
                                                          qi,
                                                          {
                                                            options:
                                                              q.options?.map(
                                                                (x, idx) =>
                                                                  idx === oi
                                                                    ? {
                                                                        ...x,
                                                                        isCorrect:
                                                                          e
                                                                            .target
                                                                            .checked,
                                                                      }
                                                                    : x
                                                              ),
                                                          }
                                                        )
                                                      }
                                                    />
                                                    Correct
                                                  </label>
                                                </div>
                                              ) : (
                                                <span
                                                  className={
                                                    o.isCorrect
                                                      ? "text-green-600 font-medium"
                                                      : ""
                                                  }
                                                >
                                                  {o.text}
                                                </span>
                                              )}
                                            </li>
                                          ))}
                                        </ol>
                                      )}

                                      {q.type === "assertionreason" && (
                                        <div className="ml-4 space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                          <div>
                                            <strong className="text-gray-700">
                                              Assertion (A):
                                            </strong>{" "}
                                            {paperEditing.has(pqKey(si, qi)) ? (
                                              <input
                                                className="border rounded px-2 py-1 text-sm w-full mt-1"
                                                value={q.assertion || ""}
                                                onChange={(e) =>
                                                  updatePaperQuestion(si, qi, {
                                                    assertion: e.target.value,
                                                  })
                                                }
                                              />
                                            ) : (
                                              <span>{q.assertion}</span>
                                            )}
                                          </div>
                                          <div>
                                            <strong className="text-gray-700">
                                              Reason (R):
                                            </strong>{" "}
                                            {paperEditing.has(pqKey(si, qi)) ? (
                                              <input
                                                className="border rounded px-2 py-1 text-sm w-full mt-1"
                                                value={q.reason || ""}
                                                onChange={(e) =>
                                                  updatePaperQuestion(si, qi, {
                                                    reason: e.target.value,
                                                  })
                                                }
                                              />
                                            ) : (
                                              <span>{q.reason}</span>
                                            )}
                                          </div>
                                          {/* Fixed options A–D per Assertion–Reason format */}
                                          <ol className="ml-5 list-[upper-alpha] space-y-0.5 mt-2">
                                            <li>
                                              Both A and R are true, and R is
                                              the correct explanation of A.
                                            </li>
                                            <li>
                                              Both A and R are true, but R is
                                              not the correct explanation of A.
                                            </li>
                                            <li>A is true, but R is false.</li>
                                            <li>A is false, but R is true.</li>
                                          </ol>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showPrintPreview && (
          <motion.div
            key="print-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 overflow-auto p-6 flex items-start justify-center"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mt-12">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Print Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closePrintPreview}
                    disabled={printing}
                    className="px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={doPrint}
                    disabled={printing}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {printing ? "Printing..." : "Print"}
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-auto print:p-0 print:overflow-visible">
                {printablePaper()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <BlueprintModal
        open={blueprintModalOpen}
        blueprints={blueprints as unknown as ModalBlueprint[]}
        loading={loadingBlueprints}
        newBlueprintName={newBlueprintName}
        onChangeBlueprintName={setNewBlueprintName}
        onSaveCurrent={saveCurrentBlueprint}
        saving={savingBlueprint}
        onApply={(bp) => applyBlueprint(bp as unknown as SavedBlueprint)}
        onDelete={deleteBlueprint}
        onClose={() => setBlueprintModalOpen(false)}
      />
      <CreateExamFromPaperModal
        open={createExamOpen}
        examTitle={examTitle}
        classLevel={classLevel}
        batch={batch}
        timerMins={timerMins}
        autoPublish={autoPublish}
        creating={creatingExam}
        onChangeExamTitle={setExamTitle}
        onChangeClass={setClassLevel}
        onChangeBatch={setBatch}
        onChangeTimer={setTimerMins}
        onChangeAutoPublish={setAutoPublish}
        onCancel={() => setCreateExamOpen(false)}
        onCreate={createExamFromPaper}
      />
      <BankExamModal
        open={bankExamOpen}
        onClose={() => setBankExamOpen(false)}
        bankExamTitle={bankExamTitle}
        onChangeTitle={setBankExamTitle}
        classLevel={classLevel}
        onChangeClass={setClassLevel}
        batch={batch}
        onChangeBatch={setBatch}
        timerMins={bankTimerMins}
        onChangeTimer={setBankTimerMins}
        questions={bankQuestionsList}
        loading={bankLoading}
        selected={bankSelectedQuestions}
        toggleSelect={(id: string) =>
          setBankSelectedQuestions((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
        creating={bankExamCreating}
        onCreate={createExamFromBank}
      />
      <GenExamModal
        open={genExamOpen}
        title={genExamTitle}
        onChangeTitle={setGenExamTitle}
        classLevel={classLevel}
        onChangeClass={setClassLevel}
        batch={batch}
        onChangeBatch={setBatch}
        timerMins={genTimerMins}
        onChangeTimer={setGenTimerMins}
        autoPublish={autoPublish}
        onChangeAutoPublish={setAutoPublish}
        creating={genExamCreating}
        onCancel={() => setGenExamOpen(false)}
        onCreate={createExamFromGenerated}
      />

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          /* Use zero/controlled page margins so content can align to top-left
             Note: many browsers still render user-agent headers/footers (date, URL)
             in the page margin area. Those cannot be reliably removed from CSS.
             To remove them, disable "Headers and footers" in the print dialog
             (or generate the PDF server-side with a headless browser that
             controls headers/footers).
          */
          @page {
            margin: 10mm;
          }

          /* Hide everything by default when printing; we'll reveal only the paper */
          body.print-paper-only * {
            visibility: hidden !important;
          }
          /* Reveal the printable paper and its children */
          body.print-paper-only .printable-paper,
          body.print-paper-only .printable-paper * {
            visibility: visible !important;
          }

          /* Put the printable content at the very top-left of the printable area */
          body.print-paper-only .printable-paper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
          }

          /* Ensure headings are black and centered as intended */
          body.print-paper-only .printable-paper h1,
          body.print-paper-only .printable-paper h2,
          body.print-paper-only .printable-paper h3 {
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* Helpful page-break utility */
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
