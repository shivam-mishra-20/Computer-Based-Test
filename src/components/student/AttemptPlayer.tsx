"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, API_BASE } from "../../lib/api";
import Protected from "../Protected";
import ElegantLoader, { InlineLoader } from "../ElegantLoader";
import { MathText } from "../ui/MathText";
import { getAnswerSync, syncStatusLabel, type SyncStatus } from "../../lib/answerSync";
import { useTenant } from "@/lib/tenant/context";

type PrimitiveResponse = string | number | string[] | undefined;

interface AttemptCore {
  _id: string;
  examId: string;
  userId: string;
  startedAt?: string;
  submittedAt?: string;
  status: string;
  totalScore?: number;
  maxScore?: number;
  resultPublished?: boolean;
  answers: {
    questionId: string;
    chosenOptionId?: string;
    textAnswer?: string;
    isMarkedForReview?: boolean;
    scoreAwarded?: number;
    rubricScore?: number;
    aiFeedback?: string;
  }[];
  snapshot: {
    sectionOrder: string[];
    questionOrderBySection: Record<string, string[]>;
    optionOrderByQuestion?: Record<string, string[]>;
  };
}

interface QuestionView {
  _id: string;
  text: string;
  type: string;
  options?: { _id: string; text: string }[];
  assertion?: string;
  reason?: string;
  diagramUrl?: string;
  subject?: string;
  tags?: { subject?: string; topic?: string; chapter?: string };
}

interface AttemptViewResponse {
  attempt: AttemptCore;
  exam: {
    _id: string;
    title: string;
    totalDurationMins?: number;
    schedule?: { startAt?: string; endAt?: string };
    antiCheat?: boolean;
    instructions?: string;
  };
  sections: { _id: string; title: string; questionIds: string[] }[];
  questions: Record<string, QuestionView>;
  serverNow?: string;
  deadlineAt?: string | null;
  submitUnlockAt?: string | null;
}

interface Props {
  attemptId: string;
  mode?: "attempt" | "review";
}

// Canonical question kind — mirrors the backend's normalizeQuestionType() so the
// player renders + stores answers for EVERY type the teacher's "Add Questions"
// flow can save (mcq / truefalse / fill / integer / assertion-reason / subjective)
// plus their aliases. Unknown/mislabeled types degrade gracefully (options →
// single-choice, otherwise a text input) instead of showing "Unsupported".
type QKind =
  | "single"
  | "multi"
  | "assertion"
  | "truefalse"
  | "integer"
  | "fill"
  | "subjective";

const normType = (t?: string): string =>
  (t || "").toLowerCase().replace(/[\s_-]+/g, "");

const SINGLE_TYPES = new Set(["mcq", "mcqsingle", "singlechoice", "multiplechoice"]);
const MULTI_TYPES = new Set(["mcqmulti", "multiselect", "multipleselect", "msq"]);
const TRUEFALSE_TYPES = new Set(["truefalse"]);
const INTEGER_TYPES = new Set(["integer", "numerical", "numeric", "number"]);
const FILL_TYPES = new Set(["fill", "fillblank", "fillintheblank", "fillups"]);
const SUBJECTIVE_TYPES = new Set(["short", "long", "subjective", "text", "essay", "descriptive"]);

function questionKind(q?: { type?: string; options?: { _id: string }[] }): QKind {
  if (!q) return "fill";
  const t = normType(q.type);
  const hasOptions = !!(q.options && q.options.length > 0);
  if (t === "assertionreason") return "assertion";
  if (MULTI_TYPES.has(t)) return "multi";
  if (TRUEFALSE_TYPES.has(t)) return "truefalse";
  if (SINGLE_TYPES.has(t)) return "single";
  if (INTEGER_TYPES.has(t)) return "integer";
  if (FILL_TYPES.has(t)) return "fill";
  if (SUBJECTIVE_TYPES.has(t)) return "subjective";
  // Unknown type: infer from the data shape so it still renders.
  return hasOptions ? "single" : "fill";
}

export default function AttemptPlayer({ attemptId, mode = "attempt" }: Props) {
  const { policy } = useTenant();
  const examPolicy = policy?.exam;
  const [view, setView] = useState<AttemptViewResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [violationMessage, setViolationMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitUnlockAt, setSubmitUnlockAt] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const attemptEndRef = useRef<number | null>(null);
  const submitGuardRef = useRef(false);
  const answerSyncRef = useRef<ReturnType<typeof getAnswerSync> | null>(null);

  const updateTimeLeft = useCallback((end: number) => {
    function tick() {
      const diff = end - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
      if (diff <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    tick();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, 1000);
  }, []);

  // One offline-answer-queue engine per attempt, subscribed for its lifetime.
  useEffect(() => {
    const engine = getAnswerSync(attemptId);
    answerSyncRef.current = engine;
    return engine.onStatusChange(setSyncStatus);
  }, [attemptId]);

  const load = useCallback(async () => {
    try {
      const data = (await apiFetch(
        `/attempts/${attemptId}`
      )) as AttemptViewResponse;

      // Recovery: overlay any locally-queued (not-yet-synced) answers onto the
      // server view. Covers refresh / crash / offline recovery — an answer the
      // student made never "disappears" just because it hadn't reached the
      // server yet. These local records stay authoritative until synced.
      const engine = getAnswerSync(attemptId);
      const pending = await engine.listPending();
      for (const rec of pending) {
        const idx = data.attempt.answers.findIndex((a) => a.questionId === rec.questionId);
        const merged = {
          questionId: rec.questionId,
          ...(idx >= 0 ? data.attempt.answers[idx] : {}),
          ...rec.payload,
        };
        if (idx >= 0) data.attempt.answers[idx] = merged as AttemptCore["answers"][number];
        else data.attempt.answers.push(merged as AttemptCore["answers"][number]);
      }

      setView(data);
      setSubmitUnlockAt(data.submitUnlockAt ? new Date(data.submitUnlockAt).getTime() : null);
      if (!data.attempt.submittedAt) {
        const durMs = (data.exam.totalDurationMins || 0) * 60 * 1000;
        const startedMs = data.attempt.startedAt
          ? new Date(data.attempt.startedAt).getTime()
          : undefined;
        const scheduleEndMs = data.exam.schedule?.endAt
          ? new Date(data.exam.schedule.endAt).getTime()
          : undefined;
        const candidates: number[] = [];
        if (data.deadlineAt) candidates.push(new Date(data.deadlineAt).getTime());
        if (startedMs && durMs) candidates.push(startedMs + durMs);
        if (scheduleEndMs) candidates.push(scheduleEndMs);
        if (candidates.length) {
          const end = Math.min(...candidates);
          attemptEndRef.current = end;
          updateTimeLeft(end);
        }
        if (pending.length) void engine.drain({ reconnect: true });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attempt");
    }
  }, [attemptId, updateTimeLeft]);

  const submitAttempt = useCallback(
    async (opts?: { silent?: boolean; reason?: string }) => {
      const silent = opts?.silent ?? false;
      const lockedUntil = submitUnlockAt;
      if (!silent && lockedUntil !== null && Date.now() < lockedUntil) {
        alert(
          "You may submit your exam after completing the first half of the examination duration."
        );
        return;
      }
      if (!silent) {
        const ok = confirm("Submit attempt? This cannot be undone.");
        if (!ok) return;
      }
      // Guard against concurrent submits (manual click racing an auto-submit).
      if (submitGuardRef.current) return;
      submitGuardRef.current = true;
      setSubmitting(true);
      try {
        // Best-effort flush of any still-queued answers BEFORE the server
        // grades the attempt; whatever's still unsynced after the budget rides
        // along inline on the submit call itself so nothing queued is lost.
        const engine = answerSyncRef.current ?? getAnswerSync(attemptId);
        const remaining = await engine.flushAll(3000);
        const inlineAnswers = remaining.map((r) => ({
          questionId: r.questionId,
          ...r.payload,
          clientSeq: r.clientSeq,
          clientTs: r.clientTs,
        }));

        // Retry-with-backoff until the server acknowledges the submit — covers
        // "connection lost right at exam end". Only network-level failures are
        // retried; a definitive server response (including SUBMIT_LOCKED) is
        // surfaced immediately instead of looping forever.
        let attemptNo = 0;
        for (;;) {
          try {
            setSubmitStatus(attemptNo > 0 ? "Reconnecting — retrying submission..." : null);
            await apiFetch(`/attempts/${attemptId}/submit`, {
              method: "POST",
              body: JSON.stringify({ auto: silent, reason: opts?.reason, answers: inlineAnswers }),
            });
            await engine.clearAll();
            break;
          } catch (e: unknown) {
            const err = e as { status?: number; data?: { code?: string; message?: string } };
            if (err?.status === 403 && err.data?.code === "SUBMIT_LOCKED") {
              if (!silent) alert(err.data.message || "You may submit after completing the first half of the exam.");
              break;
            }
            if (typeof err?.status === "number") {
              // Definitive server rejection — retrying won't help.
              if (!silent) alert(err.data?.message || "Submit failed");
              break;
            }
            attemptNo += 1;
            if (attemptNo > 20) {
              if (!silent) alert("Submit failed — please check your connection and try again.");
              break;
            }
            await new Promise((r) => setTimeout(r, Math.min(1000 * attemptNo, 8000)));
          }
        }
        setSubmitStatus(null);
        await load();
      } finally {
        submitGuardRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, load, submitUnlockAt]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    },
    []
  );

  const autoSubmitRef = useRef(false);
  useEffect(() => {
    if (
      timeLeft === 0 &&
      view &&
      !view.attempt.submittedAt &&
      !autoSubmitRef.current
    ) {
      autoSubmitRef.current = true;
      submitAttempt({ silent: true, reason: "timeup" });
    }
  }, [timeLeft, view, submitAttempt]);

  useEffect(() => {
    if (!view || view.attempt.submittedAt) return;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      apiFetch(`/attempts/${attemptId}/heartbeat`, {
        method: "POST",
      }).catch(() => {});
    }, 30000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [view, attemptId]);

  useEffect(() => {
    if (mode === "review") return;
    // The organization's own tolerance, falling back to the 10 this player has
    // always used. An institute running high-stakes selection tests sets it
    // lower; one running practice tests sets it higher. Server-side the same
    // policy field governs `exam.violationThreshold`, so the two agree.
    const VIOLATION_THRESHOLD = examPolicy?.violationThreshold ?? 10;
    const handleViolation = (why: string) => {
      if (view?.attempt.submittedAt) return;
      // Tab-switching/blurring is a violation regardless of connectivity — an
      // offline period must never be a way to dodge anti-cheat detection.
      setViolations((v) => v + 1);
      setViolationMessage(
        "Exam security warning: Leaving or hiding the tab is not allowed."
      );
      const nextCount = violations + 1;
      if (nextCount >= VIOLATION_THRESHOLD) {
        submitAttempt({ silent: true, reason: `violation:${why}` });
      }
    };
    const onVisibility = () => {
      if (document.hidden) handleViolation("hidden");
    };
    const onBlur = () => handleViolation("blur");
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (view?.attempt.submittedAt) return;
      try {
        const base = API_BASE;
        navigator.sendBeacon?.(
          `${base}/attempts/${attemptId}/submit`,
          new Blob([JSON.stringify({ auto: true, reason: "unload" })], {
            type: "application/json",
          })
        );
      } catch {}
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [attemptId, view, mode, violations, submitAttempt, examPolicy]);

  // Track connectivity for the sync-status banner ONLY — the exam timer keeps
  // running off the server-anchored deadline regardless (see `load`), and
  // inputs stay enabled while offline so answers queue locally instead of
  // being blocked (see `disabled` below). Deliberately does NOT pause the
  // clock: an offline period must never buy a student extra time.
  useEffect(() => {
    if (mode === "review") return;
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [mode]);

  const orderedQuestionIds = view
    ? view.sections.flatMap((sec) => sec.questionIds)
    : [];
  // Recomputed on every render, which happens every second while the timer
  // ticks — good enough resolution for a countdown without a second interval.
  const submitLocked =
    !view?.attempt.submittedAt &&
    submitUnlockAt !== null &&
    Date.now() < submitUnlockAt;
  const currentQid = orderedQuestionIds[index];
  const currentQuestion = currentQid ? view?.questions[currentQid] : undefined;

  // ── Subject-wise organisation ──────────────────────────────────────────────
  // Questions are grouped by their subject tag (chosen at exam-creation time and
  // carried on the question). Falls back to the containing section's title, then
  // "General". This drives the subject tabs + the per-subject question palette;
  // the underlying flat order (and all grading/submission logic) is unchanged.
  const subjectOf = (qid: string): string => {
    const q = view?.questions[qid];
    // Class-specific questions store a flat `subject`; the generic bank uses
    // `tags.subject`. Fall back to the containing section's title, then General.
    const sub = q?.subject || q?.tags?.subject;
    if (sub && sub.trim()) return sub.trim();
    const sec = view?.sections.find((s) => s.questionIds.includes(qid));
    return sec?.title?.trim() || "General";
  };
  const subjects: string[] = [];
  for (const qid of orderedQuestionIds) {
    const s = subjectOf(qid);
    if (!subjects.includes(s)) subjects.push(s);
  }
  const hasMultipleSubjects = subjects.length > 1;
  const activeSubject = currentQid ? subjectOf(currentQid) : subjects[0];
  // Global-indexed questions belonging to a subject (preserves numbering).
  const questionsInSubject = (subject: string) =>
    orderedQuestionIds
      .map((qid, i) => ({ qid, i }))
      .filter(({ qid }) => subjectOf(qid) === subject);
  const subjectStats = (subject: string) => {
    const items = questionsInSubject(subject);
    const answered = items.filter(({ qid }) => {
      const a = view?.attempt.answers.find((x) => x.questionId === qid);
      return a && (a.chosenOptionId || a.textAnswer);
    }).length;
    return { total: items.length, answered };
  };
  // Switch to a subject: jump to its first unanswered question (else its first).
  const goToSubject = (subject: string) => {
    const items = questionsInSubject(subject);
    if (!items.length) return;
    const firstUnanswered = items.find(({ qid }) => {
      const a = view?.attempt.answers.find((x) => x.questionId === qid);
      return !(a && (a.chosenOptionId || a.textAnswer));
    });
    setIndex((firstUnanswered || items[0]).i);
    setSidebarOpen(false);
  };
  const existingAnswer = view?.attempt.answers.find(
    (a) => a.questionId === currentQid
  );

  function onChangeResponse(val: PrimitiveResponse) {
    if (!view || !currentQuestion || !currentQid) return;
    const cloned: AttemptViewResponse = JSON.parse(JSON.stringify(view));
    const idx = cloned.attempt.answers.findIndex(
      (a) => a.questionId === currentQid
    );
    const single = questionKind(currentQuestion) === "single";
    if (idx >= 0) {
      if (Array.isArray(val)) {
        cloned.attempt.answers[idx].textAnswer = JSON.stringify(val);
      } else if (typeof val === "string") {
        if (single) {
          cloned.attempt.answers[idx].chosenOptionId = val as unknown as string;
          (
            cloned.attempt.answers[idx] as unknown as Record<string, unknown>
          ).textAnswer = undefined;
        } else {
          cloned.attempt.answers[idx].textAnswer = val;
        }
      }
    } else {
      const base: {
        questionId: string;
        chosenOptionId?: string;
        textAnswer?: string;
      } = { questionId: currentQid };
      if (Array.isArray(val)) base.textAnswer = JSON.stringify(val);
      else if (typeof val === "string") {
        if (single) base.chosenOptionId = val;
        else base.textAnswer = val;
      }
      cloned.attempt.answers.push(base);
    }
    setView(cloned);
    scheduleAutosave(currentQid, val);
  }

  function toggleMarkForReview() {
    if (!view || !currentQid) return;
    const cloned: AttemptViewResponse = JSON.parse(JSON.stringify(view));
    const idx = cloned.attempt.answers.findIndex(
      (a) => a.questionId === currentQid
    );
    let nextMarked = true;
    if (idx >= 0) {
      nextMarked = !Boolean(cloned.attempt.answers[idx].isMarkedForReview);
      cloned.attempt.answers[idx].isMarkedForReview = nextMarked;
    } else {
      const newAns: AttemptCore["answers"][number] = {
        questionId: currentQid,
        isMarkedForReview: true,
      };
      cloned.attempt.answers.push(newAns);
    }
    setView(cloned);
    // Use the dedicated /mark endpoint. Posting the review flag through /answer
    // used to ship undefined chosenOptionId/textAnswer, which the server merged
    // over the saved answer and erased it. /mark only touches the review flag.
    apiFetch(`/attempts/${attemptId}/mark`, {
      method: "POST",
      body: JSON.stringify({ questionId: currentQid, marked: nextMarked }),
    }).catch(() => {});
  }

  // Deselect / clear the current answer. The mark-for-review flag is preserved
  // server-side, so clearing the response never touches the review flag.
  function clearResponse() {
    if (!view || !currentQid) return;
    const cloned: AttemptViewResponse = JSON.parse(JSON.stringify(view));
    const idx = cloned.attempt.answers.findIndex(
      (a) => a.questionId === currentQid
    );
    if (idx >= 0) {
      cloned.attempt.answers[idx].chosenOptionId = undefined;
      cloned.attempt.answers[idx].textAnswer = undefined;
    }
    setView(cloned);
    // Drop any locally-queued (not-yet-synced) write for this question so it
    // can't resurrect the cleared value once it syncs.
    const engine = answerSyncRef.current ?? getAnswerSync(attemptId);
    void engine.clearQuestion(currentQid);
    apiFetch(`/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId: currentQid, clear: true }),
    }).catch(() => {});
  }

  // Write-through: persists to IndexedDB immediately, then the engine
  // opportunistically syncs to the server (debounced while online, queued
  // while offline, retried on reconnect). Never blocks on the network.
  function scheduleAutosave(qid: string, response: PrimitiveResponse) {
    if (mode === "review") return;
    const single = questionKind(view?.questions[qid]) === "single";
    const payload: {
      chosenOptionId?: string;
      textAnswer?: string;
      isMarkedForReview?: boolean;
    } = {};
    if (Array.isArray(response)) payload.textAnswer = JSON.stringify(response);
    else if (typeof response === "string") {
      if (single) payload.chosenOptionId = response;
      else payload.textAnswer = response;
    }
    const currentMark = view?.attempt.answers.find(
      (a) => a.questionId === qid
    )?.isMarkedForReview;
    if (typeof currentMark !== "undefined") payload.isMarkedForReview = currentMark;
    const engine = answerSyncRef.current ?? getAnswerSync(attemptId);
    void engine.queueAnswer(qid, payload);
  }

  function renderResponseInput() {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const ans = existingAnswer;
    const disabled = mode === "review" || Boolean(view?.attempt.submittedAt);

    switch (questionKind(q)) {
      case "single":
        return (
          <div className="space-y-3">
            {q.options?.map((opt, idx) => (
              <motion.label
                key={opt._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  ans?.chosenOptionId === opt._id
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${q._id}`}
                  checked={ans?.chosenOptionId === opt._id}
                  onChange={() => onChangeResponse(opt._id)}
                  disabled={disabled}
                  className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-slate-700 leading-relaxed min-w-0 flex-1 break-words">
                  <MathText text={opt.text} inline />
                </span>
              </motion.label>
            ))}
          </div>
        );

      case "multi": {
        const selected: string[] = ans?.textAnswer
          ? (() => {
              try {
                const parsed = JSON.parse(ans.textAnswer);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [];
        const toggle = (id: string) => {
          const next = selected.includes(id)
            ? selected.filter((x) => x !== id)
            : [...selected, id];
          onChangeResponse(next as unknown as PrimitiveResponse);
        };
        return (
          <div className="space-y-3">
            {q.options?.map((opt, idx) => (
              <motion.label
                key={opt._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selected.includes(opt._id)
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt._id)}
                  onChange={() => toggle(opt._id)}
                  disabled={disabled}
                  className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-slate-700 leading-relaxed min-w-0 flex-1 break-words">
                  <MathText text={opt.text} inline />
                </span>
              </motion.label>
            ))}
          </div>
        );
      }

      case "assertion":
        return (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-slate-900">
                    Assertion (A):
                  </span>
                  <p className="text-slate-700 mt-1">
                    <MathText text={q.assertion || "—"} />
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">
                    Reason (R):
                  </span>
                  <p className="text-slate-700 mt-1">
                    <MathText text={q.reason || "—"} />
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                {
                  code: "A",
                  text: "Both A and R are true, and R is the correct explanation of A.",
                },
                {
                  code: "B",
                  text: "Both A and R are true, but R is not the correct explanation of A.",
                },
                { code: "C", text: "A is true, but R is false." },
                { code: "D", text: "A is false, but R is true." },
              ].map((option, idx) => (
                <motion.label
                  key={option.code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    (ans?.textAnswer || "") === option.code
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="radio"
                    name={`q-${q._id}`}
                    checked={(ans?.textAnswer || "") === option.code}
                    onChange={() => onChangeResponse(option.code)}
                    disabled={disabled}
                    className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-medium text-emerald-700">
                      ({option.code})
                    </span>
                    <span className="text-slate-700 ml-2">{option.text}</span>
                  </div>
                </motion.label>
              ))}
            </div>
          </div>
        );

      case "truefalse":
        return (
          <div className="flex flex-col sm:flex-row gap-3">
            {["True", "False"].map((value) => (
              <motion.label
                key={value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex-1 ${
                  ans?.textAnswer === value
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${q._id}`}
                  checked={ans?.textAnswer === value}
                  onChange={() => onChangeResponse(value)}
                  disabled={disabled}
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">{value}</span>
              </motion.label>
            ))}
          </div>
        );

      case "integer":
        return (
          <input
            type="number"
            inputMode="numeric"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
            placeholder="Enter your numeric answer..."
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={disabled}
          />
        );

      case "fill":
        return (
          <input
            type="text"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
            placeholder="Type your answer..."
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={disabled}
          />
        );

      case "subjective":
        return (
          <textarea
            className="w-full min-h-[160px] px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 resize-vertical disabled:bg-slate-50 disabled:cursor-not-allowed"
            placeholder="Type your answer here..."
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={disabled}
          />
        );

      default:
        // questionKind() never returns anything outside the cases above, but
        // keep a safe text input so a question can always be answered.
        return (
          <input
            type="text"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
            placeholder="Type your answer..."
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={disabled}
          />
        );
    }
  }

  function formatTime(ms: number) {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  const answeredCount = orderedQuestionIds.filter((qid) => {
    const ans = view?.attempt.answers.find((a) => a.questionId === qid);
    return ans && (ans.chosenOptionId || ans.textAnswer);
  }).length;

  const markedCount = orderedQuestionIds.filter((qid) => {
    const ans = view?.attempt.answers.find((a) => a.questionId === qid);
    return ans?.isMarkedForReview;
  }).length;

  return (
    <Protected requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30">
        <div className="lg:flex lg:h-screen">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="font-semibold text-slate-900 truncate">
                    {view?.exam.title}
                  </h1>
                  <p className="text-xs text-slate-500">
                    Q{index + 1} of {orderedQuestionIds.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {timeLeft !== null && !view?.attempt.submittedAt && (
                  <div
                    className={`px-3 py-1.5 rounded-full text-sm font-mono ${
                      timeLeft < 300000
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </div>
                )}
                {!view?.attempt.submittedAt && (
                  <button
                    onClick={() => submitAttempt()}
                    disabled={submitting || submitLocked}
                    title={submitLocked ? "Available after the first half of the exam" : undefined}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold rounded-full shadow-sm disabled:opacity-60"
                  >
                    {submitting ? "..." : submitLocked ? "Locked" : "Submit"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:overflow-y-auto">
            <div className="max-w-7xl mx-auto p-2 lg:p-4">
              {!view && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-12"
                >
                  <ElegantLoader size="lg" text="Loading exam..." />
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3"
                >
                  <svg
                    className="w-6 h-6 text-red-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </motion.div>
              )}

              {view && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Desktop Header */}
                  <div className="hidden lg:flex items-center justify-between bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        {view.exam.title}
                      </h1>
                      <p className="text-slate-600">
                        Question {index + 1} of {orderedQuestionIds.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {syncStatus !== "synced" && (
                        <div className="flex items-center gap-2 text-slate-600">
                          {(syncStatus === "saving" || syncStatus === "syncing") && (
                            <InlineLoader />
                          )}
                          <span className="text-sm">{syncStatusLabel[syncStatus]}</span>
                        </div>
                      )}
                      {timeLeft !== null && !view.attempt.submittedAt && (
                        <div
                          className={`px-4 py-2 rounded-xl font-mono text-lg font-bold ${
                            timeLeft < 300000
                              ? "bg-red-100 text-red-700 border-2 border-red-200"
                              : "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                          }`}
                        >
                          {formatTime(timeLeft)}
                        </div>
                      )}
                      {view.attempt.submittedAt ? (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-xl font-medium">
                          Submitted
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => submitAttempt()}
                          disabled={submitting || submitLocked}
                          title={
                            submitLocked
                              ? "You may submit after completing the first half of the exam duration"
                              : undefined
                          }
                          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {submitting
                            ? submitStatus || "Submitting..."
                            : submitLocked
                            ? `Submit available in ${formatTime(
                                Math.max(0, (submitUnlockAt ?? 0) - Date.now())
                              )}`
                            : "Submit Exam"}
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Violation Warning */}
                  {violationMessage && !view.attempt.submittedAt && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3"
                    >
                      <svg
                        className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                        />
                      </svg>
                      <div>
                        <p className="text-amber-800 font-medium">
                          {violationMessage}
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Violations: {violations}/10
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Offline Banner — answers keep saving locally; the exam
                      clock keeps running regardless of connectivity. */}
                  {isOffline && !view.attempt.submittedAt && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3"
                    >
                      <svg
                        className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.5v15m-7.5-7.5h15"
                        />
                      </svg>
                      <div>
                        <p className="text-blue-800 font-medium">
                          Offline – Answers Stored Locally
                        </p>
                        <p className="text-blue-700 text-sm mt-1">
                          Your answers are being saved on this device and will sync
                          automatically once you&apos;re back online. The exam timer
                          keeps running.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Submission-lock Banner */}
                  {submitLocked && !view.attempt.submittedAt && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex items-start gap-3"
                    >
                      <svg
                        className="w-6 h-6 text-slate-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-slate-800 font-medium">
                          You may submit your exam after completing the first half of
                          the examination duration.
                        </p>
                        <p className="text-slate-600 text-sm mt-1">
                          Submission available in{" "}
                          {formatTime(Math.max(0, (submitUnlockAt ?? 0) - Date.now()))}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Subject tabs — switch between the subjects chosen when the
                      exam was created. Only shown for multi-subject exams. */}
                  {hasMultipleSubjects && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {subjects.map((subject) => {
                        const { answered, total } = subjectStats(subject);
                        const active = subject === activeSubject;
                        return (
                          <button
                            key={subject}
                            onClick={() => goToSubject(subject)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                              active
                                ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                            }`}
                          >
                            {subject}
                            <span
                              className={`ml-2 text-xs font-medium ${
                                active ? "text-emerald-100" : "text-slate-400"
                              }`}
                            >
                              {answered}/{total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 lg:p-8 space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* min-w-0: without it, a flex item refuses to shrink
                            below its content's intrinsic width, so a wide math
                            formula expands this column past the card and the
                            card's overflow-hidden clips it. */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-500 mb-2">
                            Question {index + 1}
                            {hasMultipleSubjects && currentQid && (
                              <span className="ml-2 text-emerald-600">
                                • {subjectOf(currentQid)}
                              </span>
                            )}
                          </div>
                          <div className="text-lg text-slate-900 leading-relaxed whitespace-pre-wrap break-words">
                            <MathText text={currentQuestion?.text || ""} />
                          </div>
                          {/* Diagram Image */}
                          {currentQuestion?.diagramUrl && (
                            <div className="mt-3">
                              <Image
                                src={currentQuestion.diagramUrl}
                                alt="Diagram"
                                width={384}
                                height={192}
                                className="max-w-full h-auto max-h-48 object-contain rounded"
                                referrerPolicy="no-referrer"
                                sizes="(max-width: 790px) 100vw, 384px"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                        {!view.attempt.submittedAt &&
                          mode !== "review" &&
                          (existingAnswer?.chosenOptionId ||
                            existingAnswer?.textAnswer) && (
                            <button
                              type="button"
                              onClick={clearResponse}
                              className="px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Deselect / clear your answer"
                            >
                              Clear
                            </button>
                          )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={toggleMarkForReview}
                          disabled={
                            mode === "review" ||
                            Boolean(view.attempt.submittedAt)
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium transition-all duration-200 ${
                            existingAnswer?.isMarkedForReview
                              ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={
                                existingAnswer?.isMarkedForReview
                                  ? "M5 13l4 4L19 7"
                                  : "M5 5v14l7-4 7 4V5a2 2 0 00-2-2H7a2 2 0 00-2 2z"
                              }
                            />
                          </svg>
                          <span className="hidden sm:inline">
                            {existingAnswer?.isMarkedForReview
                              ? "Marked"
                              : "Mark for Review"}
                          </span>
                        </motion.button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-6">
                        {renderResponseInput()}
                      </div>

                      {/* AI Feedback (Review Mode) */}
                      {view.attempt.submittedAt &&
                        existingAnswer?.aiFeedback && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border-t border-slate-100 pt-6"
                          >
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <svg
                                  className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="flex-1">
                                  <h4 className="font-medium text-blue-900 mb-2">
                                    AI Feedback
                                  </h4>
                                  <p className="text-blue-800 text-sm leading-relaxed">
                                    {existingAnswer.aiFeedback}
                                  </p>
                                  {typeof existingAnswer.rubricScore ===
                                    "number" && (
                                    <div className="mt-3 text-sm">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        Score: {existingAnswer.rubricScore}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                    </div>

                    {/* Navigation Controls */}
                    <div className="bg-slate-50 border-t border-slate-200 p-4 lg:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={index === 0}
                            onClick={() => setIndex((i) => i - 1)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                              />
                            </svg>
                            <span className="hidden sm:inline">Previous</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={index === orderedQuestionIds.length - 1}
                            onClick={() => setIndex((i) => i + 1)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </motion.button>
                        </div>
                        <span className="text-xs text-slate-400 hidden sm:inline">
                          Use “Submit Exam” at the top when you&apos;re done
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">
                  Progress Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {answeredCount}
                    </div>
                    <div className="text-xs text-emerald-600">Answered</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {markedCount}
                    </div>
                    <div className="text-xs text-amber-600">Marked</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">
                  Question Navigation
                </h3>
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <div key={subject}>
                      {hasMultipleSubjects && (
                        <button
                          onClick={() => goToSubject(subject)}
                          className={`flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 ${
                            subject === activeSubject
                              ? "text-emerald-700"
                              : "text-slate-500 hover:text-emerald-600"
                          }`}
                        >
                          <span>{subject}</span>
                          <span className="font-medium normal-case">
                            {subjectStats(subject).answered}/
                            {subjectStats(subject).total}
                          </span>
                        </button>
                      )}
                      <div className="grid grid-cols-5 gap-2">
                        {questionsInSubject(subject).map(({ qid, i }) => {
                          const ans = view?.attempt.answers.find(
                            (a) => a.questionId === qid
                          );
                          const answered =
                            ans && (ans.chosenOptionId || ans.textAnswer);
                          const marked = Boolean(ans?.isMarkedForReview);
                          const current = i === index;

                          return (
                            <motion.button
                              key={qid}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setIndex(i)}
                              className={`relative h-12 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                                current
                                  ? "border-emerald-500 bg-emerald-600 text-white shadow-md"
                                  : answered
                                  ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                              }`}
                            >
                              {i + 1}
                              {marked && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white"></span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {view?.attempt.submittedAt && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Submission Status
                  </h3>
                  <div className="text-center">
                    <div className="text-sm text-slate-700">
                      Your submission has been received.
                    </div>
                    {view.attempt.resultPublished ? (
                      <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2">
                        Results Published — check your results page.
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2">
                        Marks will be published later.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={() => setSidebarOpen(false)}
              >
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-80 h-full bg-white shadow-xl overflow-y-auto"
                >
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">
                        Navigation
                      </h3>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-700">
                          {answeredCount}
                        </div>
                        <div className="text-xs text-emerald-600">Answered</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-amber-700">
                          {markedCount}
                        </div>
                        <div className="text-xs text-amber-600">Marked</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">
                        Questions
                      </h4>
                      <div className="space-y-4">
                        {subjects.map((subject) => (
                          <div key={subject}>
                            {hasMultipleSubjects && (
                              <button
                                onClick={() => goToSubject(subject)}
                                className={`flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wide mb-2 ${
                                  subject === activeSubject
                                    ? "text-emerald-700"
                                    : "text-slate-500"
                                }`}
                              >
                                <span>{subject}</span>
                                <span className="font-medium normal-case">
                                  {subjectStats(subject).answered}/
                                  {subjectStats(subject).total}
                                </span>
                              </button>
                            )}
                            <div className="grid grid-cols-4 gap-2">
                              {questionsInSubject(subject).map(({ qid, i }) => {
                                const ans = view?.attempt.answers.find(
                                  (a) => a.questionId === qid
                                );
                                const answered =
                                  ans && (ans.chosenOptionId || ans.textAnswer);
                                const marked = Boolean(ans?.isMarkedForReview);
                                const current = i === index;

                                return (
                                  <button
                                    key={qid}
                                    onClick={() => {
                                      setIndex(i);
                                      setSidebarOpen(false);
                                    }}
                                    className={`relative h-12 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                                      current
                                        ? "border-emerald-500 bg-emerald-600 text-white"
                                        : answered
                                        ? "border-green-300 bg-green-50 text-green-800"
                                        : "border-slate-200 bg-white text-slate-700"
                                    }`}
                                  >
                                    {i + 1}
                                    {marked && (
                                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white"></span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Protected>
  );
}
