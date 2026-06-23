"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";
import { MathText } from "../ui/MathText";

// ── Types (mirror /api/exam-review/* responses) ──────────────────────────────
type ReviewState = "draft" | "under_review" | "published" | "republished";

interface ReviewTestRow {
  examId: string;
  title: string;
  classLevel?: string;
  batch?: string;
  reviewState: ReviewState;
  totalMarks: number | null;
  totalAttempts: number;
  pendingReviews: number;
  avgPercentage: number;
  lastRecomputedAt?: string;
  publishedAt?: string;
}

interface QuestionMarks {
  correct: number;
  incorrect: number;
  unattempted: number;
}

interface QuestionPerf {
  questionId: string;
  text?: string;
  type?: string;
  isSubjective: boolean;
  hasAnswerKeyOverride: boolean;
  marks?: QuestionMarks;
  hasMarksOverride?: boolean;
  answered: number;
  correct: number;
  incorrect: number;
  pctCorrect: number;
  avgScore: number;
}

// Convert a LaTeX / math-markup string into compact human-readable text for the
// question-wise table (where rendering full math would bloat every row).
function latexToReadable(input?: string): string {
  if (!input) return "";
  let s = input;
  s = s.replace(/\$\$?/g, " ").replace(/\\\(|\\\)|\\\[|\\\]/g, " ");
  // commands that wrap their argument as plain text
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|operatorname|boxed|left|right)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  const sym: Record<string, string> = {
    "\\times": "×", "\\div": "÷", "\\pm": "±", "\\mp": "∓", "\\cdot": "·",
    "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\approx": "≈", "\\equiv": "≡",
    "\\infty": "∞", "\\rightarrow": "→", "\\to": "→", "\\leftarrow": "←",
    "\\Rightarrow": "⇒", "\\leftrightarrow": "↔",
    "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ", "\\theta": "θ",
    "\\lambda": "λ", "\\mu": "μ", "\\pi": "π", "\\rho": "ρ", "\\sigma": "σ",
    "\\phi": "φ", "\\omega": "ω", "\\Delta": "Δ", "\\Omega": "Ω", "\\Sigma": "Σ",
    "\\circ": "°", "\\degree": "°", "\\partial": "∂", "\\in": "∈", "\\cup": "∪", "\\cap": "∩",
    "\\ldots": "…", "\\cdots": "…", "\\dots": "…", "\\,": " ", "\\;": " ", "\\:": " ", "\\!": "",
  };
  for (const [k, v] of Object.entries(sym)) s = s.split(k).join(v);
  const sup: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", n: "ⁿ" };
  s = s.replace(/\^\{([^{}]*)\}/g, (_m, g1: string) => (/^[-+0-9n]+$/.test(g1) ? g1.split("").map((c) => sup[c] || c).join("") : `^(${g1})`));
  s = s.replace(/\^([-+0-9n])/g, (_m, g1: string) => sup[g1] || `^${g1}`);
  const sub: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "-": "₋", "+": "₊" };
  s = s.replace(/_\{([^{}]*)\}/g, (_m, g1: string) => (/^[-+0-9]+$/.test(g1) ? g1.split("").map((c) => sub[c] || c).join("") : `_(${g1})`));
  s = s.replace(/_([-+0-9])/g, (_m, g1: string) => sub[g1] || `_${g1}`);
  s = s.replace(/\\ /g, " ").replace(/\\([a-zA-Z]+)/g, "$1").replace(/[{}]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

interface AttemptRow {
  _id: string;
  student?: { _id?: string; name?: string; email?: string; classLevel?: string; batch?: string };
  submittedAt?: string;
  status: string;
  resultPublished?: boolean;
  rawTotalScore?: number;
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  rankInTest?: number;
  percentile?: number;
  hasManualOverride?: boolean;
  hasSubjectivePending?: boolean;
}

interface ReviewSummary {
  exam: { _id: string; title: string; classLevel?: string; batch?: string; totalDurationMins?: number; questionCount: number };
  evaluation: {
    reviewState: ReviewState;
    totalMarks: number;
    baseTotalMarks: number;
    overrideActive: boolean;
    overrideMode: "scale" | "denominator";
    markingScheme: QuestionMarks;
    pendingRepublish: boolean;
    publishedAt?: string;
    versionsCount: number;
  };
  stats: {
    totalAttempts: number;
    pendingReviews: number;
    gradedAttempts: number;
    avgScore: number;
    avgPercentage: number;
    highest: number;
    lowest: number;
    distribution: Record<string, number>;
    lastRecomputedAt?: string;
  };
  questionPerformance: QuestionPerf[];
  attempts: AttemptRow[];
}

const STATE_META: Record<ReviewState, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-700 border-gray-200" },
  under_review: { label: "Under Review", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  published: { label: "Published", cls: "bg-green-100 text-green-700 border-green-200" },
  republished: { label: "Republished", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

function StateBadge({ state }: { state: ReviewState }) {
  const m = STATE_META[state] || STATE_META.draft;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${m.cls}`}>{m.label}</span>;
}

function useNotice() {
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const show = useCallback((kind: "ok" | "err", msg: string) => {
    setNotice({ kind, msg });
    setTimeout(() => setNotice(null), 4000);
  }, []);
  const node = notice ? (
    <div
      className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
        notice.kind === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {notice.msg}
    </div>
  ) : null;
  return { show, node };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherReviewDashboard() {
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const { show, node } = useNotice();

  return (
    <Protected requiredRole="teacher">
      <div className="max-w-7xl mx-auto">
        {activeExamId ? (
          <TestDetailView examId={activeExamId} onBack={() => setActiveExamId(null)} notify={show} />
        ) : (
          <TestListView onOpen={setActiveExamId} notify={show} />
        )}
      </div>
      {node}
    </Protected>
  );
}

// ── Test list (dashboard) ────────────────────────────────────────────────────
function TestListView({ onOpen, notify }: { onOpen: (id: string) => void; notify: (k: "ok" | "err", m: string) => void }) {
  const [rows, setRows] = useState<ReviewTestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch("/exam-review/tests")) as ReviewTestRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = async (kind: "publish" | "recompute") => {
    if (selected.size === 0) return;
    if (kind === "publish" && !confirm(`Publish results for ${selected.size} test(s)? Students will see their scores.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/exam-review/bulk/${kind}`, {
        method: "POST",
        body: JSON.stringify({ examIds: Array.from(selected) }),
      });
      notify("ok", `Bulk ${kind} complete for ${selected.size} test(s)`);
      setSelected(new Set());
      await load();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : `Bulk ${kind} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Review</h1>
          <p className="text-sm text-gray-600">Evaluate, mark and publish results by test</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3"
          >
            <span className="text-sm font-medium text-indigo-900">{selected.size} test(s) selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => bulk("recompute")}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                Reprocess results
              </button>
              <button
                onClick={() => bulk("publish")}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Publish selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-semibold">Test</th>
                <th className="text-center px-4 py-3 font-semibold">State</th>
                <th className="text-center px-4 py-3 font-semibold">Total Marks</th>
                <th className="text-center px-4 py-3 font-semibold">Attempts</th>
                <th className="text-center px-4 py-3 font-semibold">Pending</th>
                <th className="text-center px-4 py-3 font-semibold">Avg %</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.examId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={selected.has(r.examId)} onChange={() => toggle(r.examId)} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(r.examId)} className="text-left">
                      <div className="font-medium text-gray-900 hover:text-indigo-600">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        {[r.classLevel, r.batch].filter(Boolean).join(" • ") || "—"}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StateBadge state={r.reviewState} />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">{r.totalMarks ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{r.totalAttempts}</td>
                  <td className="px-4 py-3 text-center">
                    {r.pendingReviews > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        {r.pendingReviews}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-900">{r.avgPercentage}%</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onOpen(r.examId)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 hover:bg-indigo-50"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <div className="text-center py-12 text-gray-500">No tests with submissions yet.</div>
        )}
        {loading && <div className="text-center py-12 text-gray-500">Loading…</div>}
      </div>
    </div>
  );
}

// ── Test detail (consolidated review) ────────────────────────────────────────
function TestDetailView({
  examId,
  onBack,
  notify,
}: {
  examId: string;
  onBack: () => void;
  notify: (k: "ok" | "err", m: string) => void;
}) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [marksInput, setMarksInput] = useState<string>("");
  const [mode, setMode] = useState<"scale" | "denominator">("scale");
  const [scheme, setScheme] = useState<QuestionMarks>({ correct: 1, incorrect: 0, unattempted: 0 });
  const [editingMarksQid, setEditingMarksQid] = useState<string | null>(null);
  const [marksDraft, setMarksDraft] = useState<QuestionMarks>({ correct: 0, incorrect: 0, unattempted: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [activeAttempt, setActiveAttempt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch(`/exam-review/${examId}/summary`)) as ReviewSummary;
      setSummary(data);
      setMarksInput(data.evaluation.overrideActive ? String(data.evaluation.totalMarks) : "");
      setMode(data.evaluation.overrideMode);
      if (data.evaluation.markingScheme) setScheme(data.evaluation.markingScheme);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  }, [examId, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      notify("ok", okMsg);
      await load();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const saveTotalMarks = () => {
    const val = marksInput.trim() === "" ? null : Number(marksInput);
    if (val !== null && (Number.isNaN(val) || val <= 0)) {
      notify("err", "Total marks must be a positive number");
      return;
    }
    const verb = val === null ? "clear the total-marks override" : `set total marks to ${val}`;
    if (!confirm(`This will ${verb} and recompute results for ALL students of this test. Continue?`)) return;
    run(
      () => apiFetch(`/exam-review/${examId}/total-marks`, { method: "PATCH", body: JSON.stringify({ totalMarks: val, mode }) }),
      "Total marks updated and propagated to all students"
    );
  };

  const saveScheme = () => {
    if ([scheme.correct, scheme.incorrect, scheme.unattempted].some((v) => Number.isNaN(Number(v)))) {
      notify("err", "Marking scheme values must be numbers");
      return;
    }
    if (!confirm("Apply this marking scheme and recompute scores for ALL students of this test?")) return;
    run(
      () =>
        apiFetch(`/exam-review/${examId}/marking-scheme`, {
          method: "PATCH",
          body: JSON.stringify({
            correct: Number(scheme.correct),
            incorrect: Number(scheme.incorrect),
            unattempted: Number(scheme.unattempted),
          }),
        }),
      "Marking scheme applied to all attempts"
    );
  };

  const startEditMarks = (q: QuestionPerf) => {
    setEditingMarksQid(q.questionId);
    setMarksDraft(q.marks ?? scheme);
  };

  const saveQuestionMarks = (qid: string) => {
    setEditingMarksQid(null);
    run(
      () =>
        apiFetch(`/exam-review/${examId}/question-marks`, {
          method: "PATCH",
          body: JSON.stringify({
            questionId: qid,
            correct: Number(marksDraft.correct),
            incorrect: Number(marksDraft.incorrect),
            unattempted: Number(marksDraft.unattempted),
          }),
        }),
      "Question marks updated"
    );
  };

  const clearQuestionMarks = (qid: string) => {
    setEditingMarksQid(null);
    run(
      () => apiFetch(`/exam-review/${examId}/question-marks`, { method: "PATCH", body: JSON.stringify({ questionId: qid, clear: true }) }),
      "Reverted to test marking scheme"
    );
  };

  const removeAttempt = (attemptId: string, name?: string) => {
    if (!confirm(`Delete this attempt${name ? ` by ${name}` : ""}? This permanently removes it and recomputes results.`)) return;
    run(() => apiFetch(`/exam-review/attempts/${attemptId}`, { method: "DELETE" }), "Attempt deleted");
  };

  const dedupe = () => {
    if (!confirm("Remove duplicate attempts? For each student the most complete attempt is kept and the extras are deleted, then results recompute.")) return;
    run(() => apiFetch(`/exam-review/${examId}/dedupe`, { method: "POST" }), "Duplicate attempts removed");
  };

  const transition = (state: ReviewState, label: string) => {
    const publishing = state === "published" || state === "republished";
    if (publishing && !confirm(`${label}? Students will see their results.`)) return;
    run(() => apiFetch(`/exam-review/${examId}/state`, { method: "POST", body: JSON.stringify({ state }) }), `${label} done`);
  };

  const actions = useMemo(() => {
    const s = summary?.evaluation.reviewState;
    const map: Record<ReviewState, { label: string; target: ReviewState; primary?: boolean; danger?: boolean }[]> = {
      draft: [
        { label: "Move to Under Review", target: "under_review" },
        { label: "Publish Results", target: "published", primary: true },
      ],
      under_review: [
        { label: "Back to Draft", target: "draft" },
        { label: "Publish Results", target: "published", primary: true },
      ],
      published: [
        { label: "Republish", target: "republished", primary: true },
        { label: "Unpublish", target: "draft", danger: true },
      ],
      republished: [{ label: "Unpublish", target: "draft", danger: true }],
    };
    return s ? map[s] : [];
  }, [summary]);

  if (loading && !summary) return <div className="text-center py-16 text-gray-500">Loading…</div>;
  if (!summary) return null;

  const { exam, evaluation, stats, questionPerformance, attempts } = summary;
  const distMax = Math.max(1, ...Object.values(stats.distribution || {}));

  // Flag students who have more than one attempt for this test (duplicates).
  const dupCounts: Record<string, number> = {};
  attempts.forEach((a) => {
    const id = a.student?._id;
    if (id) dupCounts[id] = (dupCounts[id] || 0) + 1;
  });
  const hasDuplicates = Object.values(dupCounts).some((n) => n > 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <StateBadge state={evaluation.reviewState} />
              {evaluation.pendingRepublish && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  changes not republished
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {[exam.classLevel, exam.batch].filter(Boolean).join(" • ")} · {exam.questionCount} questions ·{" "}
              {stats.totalAttempts} attempts
            </p>
          </div>
        </div>
        <button onClick={() => setShowHistory(true)} className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50">
          History ({evaluation.versionsCount})
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Marks" value={String(evaluation.totalMarks)} sub={evaluation.overrideActive ? `override · ${evaluation.overrideMode}` : `base ${evaluation.baseTotalMarks}`} />
        <StatCard label="Attempts" value={String(stats.totalAttempts)} />
        <StatCard label="Pending" value={String(stats.pendingReviews)} accent={stats.pendingReviews > 0 ? "amber" : undefined} />
        <StatCard label="Avg %" value={`${stats.avgPercentage}%`} />
        <StatCard label="High / Low" value={`${stats.highest} / ${stats.lowest}`} />
      </div>

      {/* Marking scheme */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-1">Marking Scheme</h3>
        <p className="text-xs text-gray-500 mb-3">
          Marks awarded per question. Applies to the whole test (override individual questions in the table below).
          Changing it recomputes every student&apos;s score.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Correct</span>
            <input
              type="number"
              value={scheme.correct}
              onChange={(e) => setScheme((s) => ({ ...s, correct: Number(e.target.value) }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Incorrect</span>
            <input
              type="number"
              value={scheme.incorrect}
              onChange={(e) => setScheme((s) => ({ ...s, incorrect: Number(e.target.value) }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Not attempted</span>
            <input
              type="number"
              value={scheme.unattempted}
              onChange={(e) => setScheme((s) => ({ ...s, unattempted: Number(e.target.value) }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
            />
          </label>
          <button
            onClick={saveScheme}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Apply scheme
          </button>
          <div className="text-xs text-gray-400">
            e.g. +4 / −1 / 0 (JEE/NEET style negative marking)
          </div>
        </div>
      </div>

      {/* Controls: total marks + state machine */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Total Marks</h3>
          <p className="text-xs text-gray-500 mb-3">
            Changing this recomputes scores, percentages and ranks for every student. “Scale” rescales each score
            proportionally; “Denominator” only changes what scores are out of.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              value={marksInput}
              onChange={(e) => setMarksInput(e.target.value)}
              placeholder={`base ${evaluation.baseTotalMarks}`}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "scale" | "denominator")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="scale">Scale proportionally</option>
              <option value="denominator">Denominator only</option>
            </select>
            <button
              onClick={saveTotalMarks}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply
            </button>
            {evaluation.overrideActive && (
              <button
                onClick={() => {
                  setMarksInput("");
                  run(
                    () => apiFetch(`/exam-review/${examId}/total-marks`, { method: "PATCH", body: JSON.stringify({ totalMarks: null }) }),
                    "Override cleared"
                  );
                }}
                disabled={busy}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Reset to base
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Publishing</h3>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.target}
                onClick={() => transition(a.target, a.label)}
                disabled={busy}
                className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${
                  a.primary
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : a.danger
                    ? "border border-red-300 text-red-700 hover:bg-red-50"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={() => run(() => apiFetch(`/exam-review/${examId}/recompute`, { method: "POST" }), "Results reprocessed")}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reprocess
            </button>
            <button
              onClick={() =>
                run(() => apiFetch(`/exam-review/${examId}/approve-subjective`, { method: "POST" }), "Pending subjective answers approved")
              }
              disabled={busy}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
            >
              Approve subjective
            </button>
          </div>
          {evaluation.publishedAt && (
            <p className="text-xs text-gray-500 mt-3">Last published {new Date(evaluation.publishedAt).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Marks distribution */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Marks Distribution (%)</h3>
        <div className="flex items-end gap-1.5 h-32">
          {Object.entries(stats.distribution || {}).map(([band, count]) => (
            <div key={band} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="text-xs text-gray-500">{count}</div>
              <div
                className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t"
                style={{ height: `${(count / distMax) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
              />
              <div className="text-[10px] text-gray-400 rotate-0">{band.split("-")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Question-wise performance */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <h3 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">Question-wise Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-semibold w-12">#</th>
                <th className="text-left px-4 py-2 font-semibold">Question</th>
                <th className="text-center px-4 py-2 font-semibold">Type</th>
                <th className="text-center px-4 py-2 font-semibold">Marks (C / I / U)</th>
                <th className="text-center px-4 py-2 font-semibold">Answered</th>
                <th className="text-center px-4 py-2 font-semibold">% Correct</th>
                <th className="text-center px-4 py-2 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionPerformance.map((q, i) => {
                const editing = editingMarksQid === q.questionId;
                const m = q.marks ?? scheme;
                return (
                  <tr key={q.questionId} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 max-w-md">
                      <span className="text-gray-800">{latexToReadable(q.text).slice(0, 160) || "—"}</span>
                      {q.hasAnswerKeyOverride && (
                        <span className="ml-2 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">key fixed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">{q.isSubjective ? "subjective" : q.type}</td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      {editing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={marksDraft.correct} onChange={(e) => setMarksDraft((d) => ({ ...d, correct: Number(e.target.value) }))} className="w-12 px-1 py-1 border border-gray-300 rounded text-center" />
                          <input type="number" value={marksDraft.incorrect} onChange={(e) => setMarksDraft((d) => ({ ...d, incorrect: Number(e.target.value) }))} className="w-12 px-1 py-1 border border-gray-300 rounded text-center" />
                          <input type="number" value={marksDraft.unattempted} onChange={(e) => setMarksDraft((d) => ({ ...d, unattempted: Number(e.target.value) }))} className="w-12 px-1 py-1 border border-gray-300 rounded text-center" />
                          <button onClick={() => saveQuestionMarks(q.questionId)} className="text-emerald-600 px-1 font-bold" title="Save">✓</button>
                          <button onClick={() => setEditingMarksQid(null)} className="text-gray-400 px-1" title="Cancel">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditMarks(q)}
                          className={`px-2 py-1 rounded ${q.hasMarksOverride ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-gray-700 hover:bg-gray-100"}`}
                          title="Edit marks for this question"
                        >
                          {m.correct >= 0 ? `+${m.correct}` : m.correct} / {m.incorrect} / {m.unattempted}
                        </button>
                      )}
                      {q.hasMarksOverride && !editing && (
                        <button onClick={() => clearQuestionMarks(q.questionId)} className="block mx-auto mt-1 text-[10px] text-gray-400 hover:text-gray-600">
                          reset
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{q.answered}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={q.pctCorrect >= 60 ? "text-green-600" : q.pctCorrect >= 35 ? "text-amber-600" : "text-red-600"}>{q.pctCorrect}%</span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-700">{q.avgScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attempts */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Student Attempts</h3>
          {hasDuplicates && (
            <button
              onClick={dedupe}
              disabled={busy}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 disabled:opacity-50"
            >
              Remove duplicate attempts
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-center px-4 py-2 font-semibold w-14">Rank</th>
                <th className="text-left px-4 py-2 font-semibold">Student</th>
                <th className="text-center px-4 py-2 font-semibold">Score</th>
                <th className="text-center px-4 py-2 font-semibold">%</th>
                <th className="text-center px-4 py-2 font-semibold">%ile</th>
                <th className="text-center px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attempts.map((a) => {
                const isDup = !!a.student?._id && dupCounts[a.student._id] > 1;
                return (
                  <tr key={a._id} className={`hover:bg-gray-50 ${isDup ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-2 text-center font-semibold text-gray-700">{a.rankInTest ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {a.student?.name || "Student"}
                        {isDup && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            duplicate
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{[a.student?.classLevel, a.student?.batch].filter(Boolean).join(" • ")}</div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-900">
                      {a.totalScore ?? 0} / {a.maxScore ?? 0}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-900">{a.percentage ?? 0}%</td>
                    <td className="px-4 py-2 text-center text-gray-700">{a.percentile != null ? `${a.percentile}%` : "—"}</td>
                    <td className="px-4 py-2 text-center">
                      {a.hasSubjectivePending ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">needs grading</span>
                      ) : a.resultPublished ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">published</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{a.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setActiveAttempt(a._id)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 hover:bg-indigo-50">
                        Open
                      </button>
                      <button
                        onClick={() => removeAttempt(a._id, a.student?.name)}
                        disabled={busy}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete this attempt"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {activeAttempt && (
          <AttemptReviewModal
            attemptId={activeAttempt}
            examId={examId}
            correctMark={scheme.correct}
            onClose={() => setActiveAttempt(null)}
            onChanged={load}
            notify={notify}
          />
        )}
        {showHistory && <HistoryModal examId={examId} onClose={() => setShowHistory(false)} notify={notify} />}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "amber" }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent === "amber" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Per-attempt drill-down: subjective re-marking + objective answer-key fix ──
interface TeacherAttemptView {
  attempt: {
    _id: string;
    userId?: { name?: string; classLevel?: string; batch?: string };
    answers: { questionId: string; chosenOptionId?: string; textAnswer?: string; scoreAwarded?: number; rubricScore?: number; aiFeedback?: string; isCorrect?: boolean; manualScore?: number; manualScoreAt?: string }[];
    totalScore?: number;
    maxScore?: number;
    percentage?: number;
    rankInTest?: number;
    percentile?: number;
    status: string;
  };
  exam: { _id: string; title: string };
  sections: { _id: string; title: string; questionIds: string[] }[];
  questions: Record<string, { _id: string; text: string; type: string; options?: { _id: string; text: string; isCorrect?: boolean }[]; subject?: string; tags?: { subject?: string; topic?: string } }>;
}

function AttemptReviewModal({
  attemptId,
  examId,
  correctMark,
  onClose,
  onChanged,
  notify,
}: {
  attemptId: string;
  examId: string;
  correctMark: number;
  onClose: () => void;
  onChanged: () => void;
  notify: (k: "ok" | "err", m: string) => void;
}) {
  const [view, setView] = useState<TeacherAttemptView | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setView((await apiFetch(`/attempts/${attemptId}/review`)) as TeacherAttemptView);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to load attempt");
    }
  }, [attemptId, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const isSubjective = (t: string) => ["short", "long", "subjective", "text", "essay", "descriptive"].includes((t || "").toLowerCase());

  const saveScore = async (questionId: string, score: number) => {
    setBusy(true);
    try {
      await apiFetch(`/exam-review/attempts/${attemptId}/score`, {
        method: "PATCH",
        body: JSON.stringify({ questionId, score }),
      });
      notify("ok", "Score saved and totals recomputed");
      await load();
      onChanged();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to save score");
    } finally {
      setBusy(false);
    }
  };

  // Manually set/clear ONE student's mark for ONE question (any type). A number
  // pins a persistent override (+4/+1/0/-1/custom) that survives recompute;
  // null reverts the question to automatic grading. Recompute updates this
  // student's score/rank/percentile and the whole cohort's ranking.
  const saveManualScore = async (questionId: string, score: number | null) => {
    setBusy(true);
    try {
      await apiFetch(`/exam-review/attempts/${attemptId}/manual-score`, {
        method: "PATCH",
        body: JSON.stringify({ questionId, score }),
      });
      notify("ok", score === null ? "Reverted to auto-grading; totals recomputed" : "Marks updated and totals recomputed");
      await load();
      onChanged();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to update marks");
    } finally {
      setBusy(false);
    }
  };

  const fixAnswerKey = async (questionId: string, optionId: string) => {
    if (!confirm("Set this option as the correct answer for ALL students? Every attempt will be re-graded.")) return;
    setBusy(true);
    try {
      await apiFetch(`/exam-review/${examId}/answer-key`, {
        method: "PATCH",
        body: JSON.stringify({ questionId, optionIds: [optionId] }),
      });
      notify("ok", "Answer key updated; all attempts re-graded");
      await load();
      onChanged();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed to update answer key");
    } finally {
      setBusy(false);
    }
  };

  const orderedQids = view ? view.sections.flatMap((s) => s.questionIds) : [];

  // Group the student's answers subject-wise (by question subject tag, falling
  // back to the section title) so the teacher reviews them the same way the
  // student saw them in the player. Numbering stays the exam-global order.
  const subjectOfQ = (qid: string): string => {
    const q = view?.questions[qid];
    const s = q?.subject || q?.tags?.subject;
    if (s && s.trim()) return s.trim();
    const sec = view?.sections.find((x) => x.questionIds.includes(qid));
    return sec?.title?.trim() || "General";
  };
  const subjectGroups: { subject: string; qids: string[] }[] = [];
  for (const qid of orderedQids) {
    const sub = subjectOfQ(qid);
    let g = subjectGroups.find((x) => x.subject === sub);
    if (!g) {
      g = { subject: sub, qids: [] };
      subjectGroups.push(g);
    }
    g.qids.push(qid);
  }
  const orderedBySubject = subjectGroups.flatMap((g) => g.qids);
  const multiSubject = subjectGroups.length > 1;
  const globalIndexOf = (qid: string) => orderedQids.indexOf(qid);

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold">{view?.attempt.userId?.name || "Student"}</h2>
            <p className="text-xs text-indigo-100">
              Score {view?.attempt.totalScore ?? "—"} / {view?.attempt.maxScore ?? "—"} · {view?.attempt.percentage ?? 0}% · Rank{" "}
              {view?.attempt.rankInTest ?? "—"}
              {view?.attempt.percentile != null && <> · {view.attempt.percentile}%ile</>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!view && <div className="text-center py-10 text-gray-500">Loading…</div>}
          {view &&
            orderedBySubject.map((qid, flatPos) => {
              const q = view.questions[qid];
              if (!q) return null;
              const idx = globalIndexOf(qid);
              const ans = view.attempt.answers.find((a) => a.questionId === qid);
              const subjective = isSubjective(q.type);
              const showHeader =
                multiSubject &&
                (flatPos === 0 ||
                  subjectOfQ(orderedBySubject[flatPos - 1]) !== subjectOfQ(qid));
              return (
                <div key={qid}>
                  {showHeader && (
                    <div className="mb-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <span className="text-sm font-bold text-indigo-700">{subjectOfQ(qid)}</span>
                    </div>
                  )}
                  <div className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 bg-indigo-600 text-white text-xs font-bold rounded-lg flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="text-gray-800">
                      <MathText text={q.text} />
                    </div>
                  </div>

                  {/* Objective: options + answer-key fix */}
                  {q.options && q.options.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {q.options.map((opt, oi) => {
                        const selected = ans?.chosenOptionId === opt._id;
                        return (
                          <div
                            key={opt._id}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm ${
                              opt.isCorrect
                                ? "bg-green-50 border-green-300"
                                : selected
                                ? "bg-red-50 border-red-300"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-gray-600">{String.fromCharCode(65 + oi)}.</span>
                              <span className="truncate">
                                <MathText text={opt.text} inline />
                              </span>
                              {opt.isCorrect && <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">key</span>}
                              {selected && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">chose</span>}
                            </div>
                            {!opt.isCorrect && (
                              <button
                                onClick={() => fixAnswerKey(qid, opt._id)}
                                disabled={busy}
                                className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-50 flex-shrink-0"
                              >
                                Make correct
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Objective: manually override THIS student's marks for THIS question.
                      "Make correct" above fixes the key for everyone; this awards a
                      specific mark to one student (+4/+1/0/-1/custom) and persists
                      through recompute. */}
                  {!subjective && (
                    <MarkScorer
                      label="Override marks for this student"
                      manualScore={ans?.manualScore}
                      autoScore={ans?.scoreAwarded}
                      correctMark={correctMark}
                      disabled={busy}
                      onSave={(v) => saveManualScore(qid, v)}
                      onReset={() => saveManualScore(qid, null)}
                    />
                  )}

                  {/* Subjective: student answer + AI + score input */}
                  {subjective && (
                    <div className="space-y-3">
                      {ans?.textAnswer && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-800 whitespace-pre-wrap">
                          {ans.textAnswer}
                        </div>
                      )}
                      {(ans?.aiFeedback || ans?.rubricScore !== undefined) && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                          {ans?.rubricScore !== undefined && <div>AI rubric: {ans.rubricScore}</div>}
                          {ans?.aiFeedback && <div className="italic">{ans.aiFeedback}</div>}
                        </div>
                      )}
                      <SubjectiveScorer
                        initial={ans?.scoreAwarded}
                        max={correctMark}
                        disabled={busy}
                        onSave={(v) => saveScore(qid, v)}
                      />
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Per-student, per-question manual mark override. Unlike SubjectiveScorer this
// allows negative values (e.g. -1) and a "Reset to auto" that clears the
// override. Presets default to the marking scheme (+correct / +1 / 0 / -1).
function MarkScorer({
  label,
  manualScore,
  autoScore,
  correctMark,
  disabled,
  onSave,
  onReset,
}: {
  label: string;
  manualScore?: number;
  autoScore?: number;
  correctMark: number;
  disabled?: boolean;
  onSave: (v: number) => void;
  onReset: () => void;
}) {
  const hasOverride = typeof manualScore === "number";
  const [val, setVal] = useState<string>(hasOverride ? String(manualScore) : "");
  useEffect(() => {
    setVal(hasOverride ? String(manualScore) : "");
  }, [manualScore, hasOverride]);
  const presets = Array.from(new Set([correctMark, 1, 0, -1])).filter((v) => Number.isFinite(v));
  return (
    <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-amber-800">{label}</span>
        {hasOverride ? (
          <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">Manually set: {manualScore}</span>
        ) : (
          <span className="text-[10px] text-gray-500">Auto: {autoScore ?? 0}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {presets.map((v) => (
            <button
              key={v}
              onClick={() => setVal(String(v))}
              className={`px-2 py-1 text-xs rounded border ${
                val === String(v) ? "bg-amber-600 text-white border-amber-600" : "border-amber-300 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {v > 0 ? `+${v}` : v}
            </button>
          ))}
        </div>
        <input
          type="number"
          step={0.5}
          value={val}
          placeholder="custom"
          onChange={(e) => setVal(e.target.value)}
          className="w-24 px-2 py-1.5 border border-amber-300 rounded-lg text-sm"
        />
        <button
          onClick={() => {
            const n = Number(val);
            if (val === "" || Number.isNaN(n)) return;
            onSave(n);
          }}
          disabled={disabled || val === ""}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Save
        </button>
        {hasOverride && (
          <button
            onClick={onReset}
            disabled={disabled}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to auto
          </button>
        )}
      </div>
    </div>
  );
}

function SubjectiveScorer({ initial, max, disabled, onSave }: { initial?: number; max: number; disabled?: boolean; onSave: (v: number) => void }) {
  const [val, setVal] = useState<string>(initial !== undefined ? String(initial) : "");
  const safeMax = max > 0 ? max : 1;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const quick = Array.from(new Set([0, round2(safeMax * 0.25), round2(safeMax * 0.5), round2(safeMax * 0.75), safeMax]));
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm font-medium text-gray-700">Marks (0–{safeMax}):</label>
      <div className="flex gap-1">
        {quick.map((v) => (
          <button
            key={v}
            onClick={() => setVal(String(v))}
            className={`px-2 py-1 text-xs rounded border ${
              val === String(v) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        max={safeMax}
        step={0.5}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
      />
      <button
        onClick={() => {
          const n = Number(val);
          if (Number.isNaN(n) || n < 0 || n > safeMax) return;
          onSave(n);
        }}
        disabled={disabled || val === ""}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}

// ── Version + audit history ──────────────────────────────────────────────────
function HistoryModal({ examId, onClose, notify }: { examId: string; onClose: () => void; notify: (k: "ok" | "err", m: string) => void }) {
  const [data, setData] = useState<{ versions: { version: number; event: string; reviewState: string; totalMarks?: number; at: string; note?: string }[]; audit: { _id: string; action: string; createdAt: string; actorName?: string; field?: string; oldValue?: unknown; newValue?: unknown }[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData((await apiFetch(`/exam-review/${examId}/history`)) as { versions: { version: number; event: string; reviewState: string; totalMarks?: number; at: string; note?: string }[]; audit: { _id: string; action: string; createdAt: string; actorName?: string; field?: string; oldValue?: unknown; newValue?: unknown }[] });
      } catch (e) {
        notify("err", e instanceof Error ? e.message : "Failed to load history");
      }
    })();
  }, [examId, notify]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Change History</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Publish versions</h3>
            <ol className="relative border-l border-gray-200 ml-2 space-y-3">
              {(data?.versions || []).slice().reverse().map((v) => (
                <li key={v.version} className="ml-4">
                  <div className="absolute -left-1.5 w-3 h-3 bg-indigo-500 rounded-full" />
                  <div className="text-sm font-medium text-gray-900">
                    v{v.version} · {v.event} <span className="text-gray-400">({v.reviewState})</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {v.totalMarks != null && `total ${v.totalMarks} · `}
                    {new Date(v.at).toLocaleString()}
                    {v.note && ` · ${v.note}`}
                  </div>
                </li>
              ))}
              {(!data?.versions || data.versions.length === 0) && <li className="ml-4 text-sm text-gray-400">No versions yet</li>}
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Audit log</h3>
            <div className="space-y-2">
              {(data?.audit || []).map((a) => (
                <div key={a._id} className="text-xs border border-gray-100 rounded-lg p-2.5">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">{a.action}</span>
                    <span className="text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-500">
                    {a.actorName && `by ${a.actorName} · `}
                    {a.field && `${a.field}: `}
                    {a.oldValue !== undefined && `${JSON.stringify(a.oldValue)} → `}
                    {a.newValue !== undefined && JSON.stringify(a.newValue)}
                  </div>
                </div>
              ))}
              {(!data?.audit || data.audit.length === 0) && <div className="text-sm text-gray-400">No changes recorded</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
