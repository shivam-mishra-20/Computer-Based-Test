"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";
import ElegantLoader, { InlineLoader } from "../ElegantLoader";
import { MathText } from "../ui/MathText";

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
}

interface AttemptViewResponse {
  attempt: AttemptCore;
  exam: {
    _id: string;
    title: string;
    totalDurationMins?: number;
    schedule?: { startAt?: string; endAt?: string };
  };
  sections: { _id: string; title: string; questionIds: string[] }[];
  questions: Record<string, QuestionView>;
}

interface Props {
  attemptId: string;
  mode?: "attempt" | "review";
}

export default function AttemptPlayer({ attemptId, mode = "attempt" }: Props) {
  const [view, setView] = useState<AttemptViewResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [violations, setViolations] = useState(0);
  const [violationMessage, setViolationMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const attemptEndRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

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

  const load = useCallback(async () => {
    try {
      const data = (await apiFetch(
        `/attempts/${attemptId}`
      )) as AttemptViewResponse;
      setView(data);
      if (!data.attempt.submittedAt) {
        const maybeAttemptEnd = (
          data as unknown as { attempt?: { endAt?: string } }
        )?.attempt?.endAt;
        const durMs = (data.exam.totalDurationMins || 0) * 60 * 1000;
        const startedMs = data.attempt.startedAt
          ? new Date(data.attempt.startedAt).getTime()
          : undefined;
        const scheduleEndMs = data.exam.schedule?.endAt
          ? new Date(data.exam.schedule.endAt).getTime()
          : undefined;
        const candidates: number[] = [];
        if (maybeAttemptEnd)
          candidates.push(new Date(maybeAttemptEnd).getTime());
        if (startedMs && durMs) candidates.push(startedMs + durMs);
        if (scheduleEndMs) candidates.push(scheduleEndMs);
        if (candidates.length) {
          const end = Math.min(...candidates);
          attemptEndRef.current = end;
          updateTimeLeft(end);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attempt");
    }
  }, [attemptId, updateTimeLeft]);

  const submitAttempt = useCallback(
    async (opts?: { silent?: boolean; reason?: string }) => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        const ok = confirm("Submit attempt? This cannot be undone.");
        if (!ok) return;
      }
      try {
        await apiFetch(`/attempts/${attemptId}/submit`, {
          method: "POST",
          body: JSON.stringify({ auto: silent, reason: opts?.reason }),
        });
        await load();
      } catch {
        if (!silent) alert("Submit failed");
      }
    },
    [attemptId, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
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
    const VIOLATION_THRESHOLD = 6;
    const handleViolation = (why: string) => {
      if (view?.attempt.submittedAt) return;
      if (isPaused) return; // ignore violations while paused/offline
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
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
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
  }, [attemptId, view, mode, violations, submitAttempt, isPaused]);

  // Pause/resume exam on network disconnect/reconnect
  useEffect(() => {
    if (mode === "review") return;
    const onOffline = () => {
      if (view?.attempt.submittedAt) return;
      setIsPaused(true);
      setOfflineMessage(
        "Network disconnected — exam paused. Reconnect to resume."
      );
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      pausedAtRef.current = Date.now();
    };
    const onOnline = () => {
      if (!isPaused) return;
      const pausedAt = pausedAtRef.current;
      const endAt = attemptEndRef.current;
      if (pausedAt && endAt) {
        const pauseDuration = Date.now() - pausedAt;
        attemptEndRef.current = endAt + pauseDuration;
        updateTimeLeft(attemptEndRef.current);
      }
      setIsPaused(false);
      setOfflineMessage(null);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [mode, view, isPaused, updateTimeLeft]);

  const orderedQuestionIds = view
    ? view.sections.flatMap((sec) => sec.questionIds)
    : [];
  const currentQid = orderedQuestionIds[index];
  const currentQuestion = currentQid ? view?.questions[currentQid] : undefined;
  const existingAnswer = view?.attempt.answers.find(
    (a) => a.questionId === currentQid
  );

  function onChangeResponse(val: PrimitiveResponse) {
    if (!view || !currentQuestion || !currentQid) return;
    const cloned: AttemptViewResponse = JSON.parse(JSON.stringify(view));
    const idx = cloned.attempt.answers.findIndex(
      (a) => a.questionId === currentQid
    );
    if (idx >= 0) {
      if (Array.isArray(val)) {
        cloned.attempt.answers[idx].textAnswer = JSON.stringify(val);
      } else if (typeof val === "string") {
        if (["mcq", "mcq-single"].includes(currentQuestion.type)) {
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
        if (["mcq", "mcq-single"].includes(currentQuestion.type))
          base.chosenOptionId = val;
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
    if (idx >= 0) {
      cloned.attempt.answers[idx].isMarkedForReview = !Boolean(
        cloned.attempt.answers[idx].isMarkedForReview
      );
    } else {
      const newAns: AttemptCore["answers"][number] = {
        questionId: currentQid,
        isMarkedForReview: true,
      };
      cloned.attempt.answers.push(newAns);
    }
    setView(cloned);
    apiFetch(`/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: currentQid,
        isMarkedForReview: cloned.attempt.answers.find(
          (a) => a.questionId === currentQid
        )?.isMarkedForReview,
      }),
    }).catch(() => {});
  }

  function scheduleAutosave(qid: string, response: PrimitiveResponse) {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => saveAnswer(qid, response), 800);
  }

  async function saveAnswer(questionId: string, response: PrimitiveResponse) {
    if (mode === "review") return;
    setSaving(true);
    try {
      const payload: {
        questionId: string;
        chosenOptionId?: string;
        textAnswer?: string;
        isMarkedForReview?: boolean;
      } = { questionId };
      if (Array.isArray(response))
        payload.textAnswer = JSON.stringify(response);
      else if (typeof response === "string") {
        if (["mcq", "mcq-single"].includes(currentQuestion?.type || ""))
          payload.chosenOptionId = response;
        else payload.textAnswer = response;
      }
      const currentMark = view?.attempt.answers.find(
        (a) => a.questionId === questionId
      )?.isMarkedForReview;
      if (typeof currentMark !== "undefined")
        payload.isMarkedForReview = currentMark;
      await apiFetch(`/attempts/${attemptId}/answer`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  }

  function renderResponseInput() {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const ans = existingAnswer;
    const disabled =
      mode === "review" || Boolean(view?.attempt.submittedAt) || isPaused;

    switch (q.type) {
      case "mcq":
      case "mcq-single":
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
                <span className="text-slate-700 leading-relaxed">
                  <MathText text={opt.text} inline />
                </span>
              </motion.label>
            ))}
          </div>
        );

      case "mcq-multi": {
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
                <span className="text-slate-700 leading-relaxed">
                  <MathText text={opt.text} inline />
                </span>
              </motion.label>
            ))}
          </div>
        );
      }

      case "assertionreason":
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

      case "true-false":
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
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
            placeholder="Enter your answer..."
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={disabled}
          />
        );

      case "subjective":
      case "short":
      case "long":
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
        return (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <span className="text-amber-700">
              Unsupported question type: {q.type}
            </span>
          </div>
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
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 lg:p-8">
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
                      {view.attempt.submittedAt && (
                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-xl font-medium">
                          Submitted
                        </div>
                      )}
                      {saving && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <InlineLoader />
                          <span className="text-sm">Saving...</span>
                        </div>
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
                          Violations: {violations}/6
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Offline/Paused Banner */}
                  {offlineMessage && !view.attempt.submittedAt && (
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
                          {offlineMessage}
                        </p>
                        <p className="text-blue-700 text-sm mt-1">
                          Your time won&apos;t count down while disconnected.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Question Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 lg:p-8 space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-500 mb-2">
                            Question {index + 1}
                          </div>
                          <div className="text-lg text-slate-900 leading-relaxed whitespace-pre-wrap">
                            <MathText text={currentQuestion?.text || ""} />
                          </div>
                          {/* Diagram Image */}
                          {currentQuestion?.diagramUrl && (
                            <div className="mt-3">
                              <img
                                src={currentQuestion.diagramUrl}
                                alt="Diagram"
                                className="max-w-sm h-auto max-h-48 object-contain rounded"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
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
                        {!view.attempt.submittedAt && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => submitAttempt()}
                            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200"
                          >
                            Submit Exam
                          </motion.button>
                        )}
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
                <div className="grid grid-cols-5 gap-2">
                  {orderedQuestionIds.map((qid, i) => {
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
                      <div className="grid grid-cols-4 gap-2">
                        {orderedQuestionIds.map((qid, i) => {
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
