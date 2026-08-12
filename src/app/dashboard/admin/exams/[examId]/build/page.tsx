"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftIcon, PrinterIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import MathText from "@/components/ui/MathText";
import SchedulePublishPanel from "@/components/teacher/SchedulePublishPanel";
import ExamStatusBadge, { type ExamStatus } from "@/components/teacher/ExamStatusBadge";
import QuestionBankPicker from "@/components/teacher/QuestionBankPicker";
import StudentAssignmentPicker from "@/components/teacher/StudentAssignmentPicker";

interface Question {
  _id: string;
  text: string;
  type: string;
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  diagramUrl?: string;
  options?: Array<{ text: string; isCorrect?: boolean }>;
}

interface Exam {
  _id: string;
  title: string;
  classLevel?: string;
  batch?: string;
  totalDurationMins?: number;
  sections?: { title: string; questionIds: string[]; sectionDurationMins?: number; shuffleQuestions?: boolean; shuffleOptions?: boolean }[];
  markingScheme?: { correct?: number; incorrect?: number; unattempted?: number };
  schedule?: { startAt?: string; endAt?: string; timezone?: string };
  instructions?: string;
  antiCheat?: boolean;
  lateEntryMins?: number;
  isPublished?: boolean;
  status?: ExamStatus;
  assignedTo?: { users?: string[]; groups?: string[] };
  meta?: { subject?: string };
}

type Tab = "questions" | "settings" | "students" | "review";
const TABS: { key: Tab; label: string }[] = [
  { key: "questions", label: "Questions" },
  { key: "settings", label: "Settings" },
  { key: "students", label: "Students" },
  { key: "review", label: "Review" },
];

const DURATION_PRESETS = [30, 60, 90, 120];
const MARKING_PRESETS = [
  { label: "+4 / -1 / 0", correct: 4, incorrect: -1, unattempted: 0 },
  { label: "+1 / 0 / 0", correct: 1, incorrect: 0, unattempted: 0 },
  { label: "+2 / -0.5 / 0", correct: 2, incorrect: -0.5, unattempted: 0 },
];

const getImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${url}`;
};

export default function ExamBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("questions");

  // Builder content is a single "Section A" — the old per-section
  // duration/shuffle model is folded into exam-wide Settings. An exam with
  // multiple LEGACY sections gets its questions merged into one on load; the
  // combined content is what gets saved back.
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]); // unfiltered, for print/review lookups
  const [durationMins, setDurationMins] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [markCorrect, setMarkCorrect] = useState(1);
  const [markIncorrect, setMarkIncorrect] = useState(0);
  const [markUnattempted, setMarkUnattempted] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [antiCheat, setAntiCheat] = useState(true);
  const [assignedTo, setAssignedTo] = useState<{ users?: string[]; groups?: string[] }>({});

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutosaveRef = useRef(true);

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const data = (await apiFetch(`/exams/${examId}`)) as Exam;
        if (!data?._id) return;
        setExam(data);
        setQuestionIds(data.sections?.flatMap((s) => s.questionIds) || []);
        setDurationMins(data.totalDurationMins || 60);
        setMarkCorrect(data.markingScheme?.correct ?? 1);
        setMarkIncorrect(data.markingScheme?.incorrect ?? 0);
        setMarkUnattempted(data.markingScheme?.unattempted ?? 0);
        setShuffleQuestions(data.sections?.[0]?.shuffleQuestions ?? true);
        setShuffleOptions(data.sections?.[0]?.shuffleOptions ?? false);
        setAntiCheat(data.antiCheat ?? true);
        setAssignedTo(data.assignedTo || {});
      } catch (err) {
        console.error("Failed to load exam:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  // Unfiltered class question list, purely for print/review to resolve full
  // question objects for ids that may currently be filtered out of the
  // QuestionBankPicker's own (narrower) result set.
  useEffect(() => {
    if (!exam?.classLevel) return;
    (async () => {
      try {
        const res = (await apiFetch(`/ai/questions/class/${exam.classLevel}?limit=500`)) as {
          success: boolean;
          data: { questions: Question[] };
        };
        if (res.success) setAllQuestions(res.data.questions || []);
      } catch (err) {
        console.error("Failed to load class questions:", err);
      }
    })();
  }, [exam?.classLevel]);

  // Autosave: content + settings only (never assignment, schedule, or
  // isPublished — those are StudentAssignmentPicker's and
  // SchedulePublishPanel's own write paths). Skipped once right after load so
  // hydrating state from the server doesn't immediately re-save it.
  useEffect(() => {
    if (!exam) return;
    if (skipAutosaveRef.current) {
      const t = setTimeout(() => {
        skipAutosaveRef.current = false;
      }, 0);
      return () => clearTimeout(t);
    }
    setSaveStatus("saving");
    const handle = setTimeout(async () => {
      try {
        await apiFetch(`/exams/${examId}`, {
          method: "PUT",
          body: JSON.stringify({
            sections: [
              {
                title: "Section A",
                questionIds,
                sectionDurationMins: effectiveDuration(),
                shuffleQuestions,
                shuffleOptions,
              },
            ],
            totalDurationMins: effectiveDuration(),
            markingScheme: { correct: markCorrect, incorrect: markIncorrect, unattempted: markUnattempted },
            antiCheat,
          }),
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave failed:", err);
        setSaveStatus("error");
      }
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIds, durationMins, customDuration, markCorrect, markIncorrect, markUnattempted, shuffleQuestions, shuffleOptions, antiCheat]);

  function effectiveDuration() {
    return customDuration.trim() ? Number(customDuration) || 0 : durationMins;
  }

  const questionsById: Record<string, Question> = {};
  for (const q of allQuestions) questionsById[q._id] = q;

  const handlePrint = () => {
    if (questionIds.length === 0) return;
    setShowPrintPreview(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Exam not found</p>
          <button onClick={() => router.push("/dashboard/admin?tab=exams")} className="text-emerald-600 font-medium">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const checklist = [
    { label: "Questions added", ok: questionIds.length > 0 },
    { label: "Duration configured", ok: effectiveDuration() > 0 },
    { label: "Marking configured", ok: markCorrect > 0 },
    { label: "Students assigned", ok: !!(assignedTo.users?.length || assignedTo.groups?.length) },
    { label: "Schedule configured", ok: !!(exam.schedule?.startAt && exam.schedule?.endAt) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.push("/dashboard/admin?tab=exams")} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900 truncate">{exam.title}</h1>
                  <ExamStatusBadge status={exam.status || (exam.isPublished ? "live" : "draft")} />
                </div>
                <p className="text-xs text-gray-500">
                  Class {exam.classLevel || "—"} · {questionIds.length} questions · {effectiveDuration()} min
                  {saveStatus !== "idle" && (
                    <span className="ml-2">
                      {saveStatus === "saving" && "· Saving..."}
                      {saveStatus === "saved" && "· Saved"}
                      {saveStatus === "error" && <span className="text-red-500">· Unable to save — retry by editing again</span>}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              disabled={questionIds.length === 0}
              className="px-3 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <PrinterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>

          {/* Step tabs */}
          <div className="flex gap-1 mt-3 -mb-px overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap ${
                  tab === t.key ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {t.key === "questions" && questionIds.length > 0 && (
                  <span className="ml-1.5 text-xs text-gray-400">({questionIds.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-16">
        {tab === "questions" && (
          <QuestionBankPicker
            classLevel={exam.classLevel || ""}
            selectedIds={questionIds}
            onChange={setQuestionIds}
            marksPerQuestion={markCorrect}
          />
        )}

        {tab === "settings" && (
          <div className="bg-white rounded-xl border p-5 space-y-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDurationMins(d); setCustomDuration(""); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${
                      !customDuration && durationMins === d ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {d} min
                  </button>
                ))}
                <input
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Custom"
                  className="w-20 px-3 py-1.5 border rounded-full text-sm text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Marking Scheme</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {MARKING_PRESETS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => { setMarkCorrect(m.correct); setMarkIncorrect(m.incorrect); setMarkUnattempted(m.unattempted); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 ${
                      markCorrect === m.correct && markIncorrect === m.incorrect ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <label className="block">
                  <span className="text-xs text-gray-500">Correct</span>
                  <input type="number" value={markCorrect} onChange={(e) => setMarkCorrect(Number(e.target.value))} className="w-full px-2 py-1.5 border rounded" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Incorrect</span>
                  <input type="number" value={markIncorrect} onChange={(e) => setMarkIncorrect(Number(e.target.value))} className="w-full px-2 py-1.5 border rounded" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Unattempted</span>
                  <input type="number" value={markUnattempted} onChange={(e) => setMarkUnattempted(Number(e.target.value))} className="w-full px-2 py-1.5 border rounded" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                <span className="text-sm text-gray-700">Shuffle question order per student</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                <span className="text-sm text-gray-700">Shuffle option order per student</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={antiCheat} onChange={(e) => setAntiCheat(e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                <span className="text-sm text-gray-700">Enable proctoring (tab-switch/fullscreen detection, auto-submit)</span>
              </label>
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="bg-white rounded-xl border p-5">
            {exam.classLevel ? (
              <StudentAssignmentPicker
                examId={examId}
                classLevel={exam.classLevel}
                initialAssignedTo={assignedTo}
                onSaved={(a) => setAssignedTo(a)}
              />
            ) : (
              <p className="text-sm text-amber-600">Set a class for this exam first.</p>
            )}
          </div>
        )}

        {tab === "review" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Class</dt>
                <dd className="text-gray-900 font-medium">{exam.classLevel || "—"}</dd>
                <dt className="text-gray-500">Subject</dt>
                <dd className="text-gray-900 font-medium">{exam.meta?.subject || "—"}</dd>
                <dt className="text-gray-500">Questions</dt>
                <dd className="text-gray-900 font-medium">{questionIds.length}</dd>
                <dt className="text-gray-500">Total Marks</dt>
                <dd className="text-gray-900 font-medium">{questionIds.length * markCorrect}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd className="text-gray-900 font-medium">{effectiveDuration()} minutes</dd>
                <dt className="text-gray-500">Assignment</dt>
                <dd className="text-gray-900 font-medium">
                  {assignedTo.users?.length
                    ? `${assignedTo.users.length} students`
                    : assignedTo.groups?.length
                    ? assignedTo.groups.join(", ")
                    : "Not assigned yet"}
                </dd>
              </dl>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Ready to publish?</h3>
              <ul className="space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className={`text-sm flex items-center gap-2 ${c.ok ? "text-emerald-700" : "text-gray-500"}`}>
                    <span>{c.ok ? "✓" : "✕"}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>

            <SchedulePublishPanel
              exam={exam}
              totalQuestions={questionIds.length}
              sections={[{ title: "Section A", questionIds, sectionDurationMins: effectiveDuration(), shuffleQuestions, shuffleOptions }]}
              onPublished={() => router.push("/dashboard/admin?tab=exams")}
            />
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewingImage} alt="Diagram" className="max-w-full max-h-[90vh] rounded-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div id="print-modal-overlay" className="fixed inset-0 z-50 bg-black/60 overflow-auto">
          <div className="sticky top-0 z-10 bg-white shadow-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="font-bold text-gray-900 text-lg">Print Preview</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  document.documentElement.classList.add("print-mode");
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => document.documentElement.classList.remove("print-mode"), 500);
                  }, 100);
                }}
                className="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <PrinterIcon className="w-5 h-5" />
                Print Paper
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="py-8 px-2 sm:px-4 flex justify-center bg-gray-100 min-h-screen print:bg-white print:p-0 print:m-0 print:min-h-0">
            <div id="print-wrapper" className="transform origin-top scale-[0.45] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 transition-transform duration-200 print:transform-none print:scale-100 print:m-0 print:p-0">
              <div
                id="print-content"
                className="bg-white shadow-2xl rounded-sm print:shadow-none print:rounded-none"
                style={{ width: "210mm", minHeight: "297mm", padding: "20mm", fontFamily: "Times New Roman, serif", fontSize: "12pt", lineHeight: "1.6", color: "#1a1a1a", margin: "0 auto" }}
              >
                <div style={{ border: "3px double #333", padding: "20px", textAlign: "center", marginBottom: "24px" }}>
                  <h1 style={{ fontSize: "22pt", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {exam.title}
                  </h1>
                  <div style={{ borderTop: "2px solid #047857", borderBottom: "2px solid #047857", padding: "10px 0", margin: "12px 0" }}>
                    <span style={{ fontSize: "11pt", color: "#444" }}>
                      <strong>Duration:</strong> {effectiveDuration()} minutes &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong>Total Questions:</strong> {questionIds.length} &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong>Max Marks:</strong> {questionIds.length * markCorrect}
                    </span>
                  </div>
                </div>

                <div style={{ border: "2px solid #666", borderRadius: "8px", padding: "16px", marginBottom: "24px", backgroundColor: "#fafafa" }}>
                  <h3 style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt", marginBottom: "10px", textTransform: "uppercase" }}>
                    General Instructions
                  </h3>
                  <ul style={{ marginLeft: "20px", fontSize: "11pt" }}>
                    <li style={{ marginBottom: "6px" }}>Read all questions carefully before answering.</li>
                    <li style={{ marginBottom: "6px" }}>All questions are compulsory.</li>
                    <li style={{ marginBottom: "6px" }}>Write your answers neatly and legibly.</li>
                  </ul>
                </div>

                <div>
                  {questionIds.map((qId, qIdx) => {
                    const q = questionsById[qId];
                    if (!q) return null;
                    return (
                      <div key={qId} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <span style={{ fontWeight: "bold", minWidth: "42px", flexShrink: 0 }}>Q{qIdx + 1}.</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: "8px" }}>
                              <MathText text={q.text} />
                            </div>
                            {q.options && q.options.length > 0 && (
                              <div style={{ marginLeft: "16px", marginTop: "8px" }}>
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} style={{ marginBottom: "4px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                    <span style={{ fontWeight: "600" }}>({String.fromCharCode(97 + optIdx)})</span>
                                    <span>
                                      <MathText text={opt.text} inline />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.diagramUrl && (
                              <div style={{ marginTop: "12px", marginLeft: "16px", pageBreakInside: "avoid" }}>
                                <Image
                                  src={getImageUrl(q.diagramUrl)}
                                  alt="Diagram"
                                  width={200}
                                  height={150}
                                  style={{ maxWidth: "200px", maxHeight: "150px", objectFit: "contain", border: "1px solid #ddd", borderRadius: "4px", padding: "4px", backgroundColor: "#fff", width: "auto", height: "auto" }}
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: "2px solid #333", paddingTop: "16px", marginTop: "32px", textAlign: "center" }}>
                  <p style={{ fontWeight: "bold", fontSize: "12pt" }}>*** End of Question Paper ***</p>
                  <p style={{ fontStyle: "italic", marginTop: "8px", color: "#666" }}>Best of Luck!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          html.print-mode body * {
            visibility: hidden;
          }
          html.print-mode #print-content,
          html.print-mode #print-content *,
          html.print-mode #print-wrapper,
          html.print-mode #print-modal-overlay,
          html.print-mode .print-visible {
            visibility: visible !important;
          }
          html.print-mode #print-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            overflow: visible !important;
            z-index: 9999 !important;
            display: block !important;
          }
          html.print-mode #print-wrapper {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          html.print-mode #print-content {
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }
          html.print-mode {
            height: auto !important;
            overflow: visible !important;
          }
          html.print-mode body {
            height: auto !important;
            overflow: visible !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
