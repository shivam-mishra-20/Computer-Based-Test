"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import Protected from "../Protected";

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
}
interface AttemptViewResponse {
  attempt: AttemptCore;
  exam: { _id: string; title: string; totalDurationMins?: number };
  sections: { _id: string; title: string; questionIds: string[] }[];
  questions: Record<string, QuestionView>;
}

interface Props {
  attemptId: string;
  mode?: "attempt" | "review";
}

// autosave handled via manual timeout (800ms debounce)

export default function AttemptPlayer({ attemptId, mode = "attempt" }: Props) {
  const [view, setView] = useState<AttemptViewResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);

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
        `/api/attempts/${attemptId}`
      )) as AttemptViewResponse;
      setView(data);
      if (
        data?.exam?.totalDurationMins &&
        data.attempt.startedAt &&
        !data.attempt.submittedAt
      ) {
        const durationMs = data.exam.totalDurationMins * 60 * 1000;
        const end = new Date(data.attempt.startedAt).getTime() + durationMs;
        updateTimeLeft(end);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attempt");
    }
  }, [attemptId, updateTimeLeft]);

  const submitAttempt = useCallback(async () => {
    if (!confirm("Submit attempt? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      await load();
    } catch {
      alert("Submit failed");
    }
  }, [attemptId, load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
    },
    []
  );

  // Auto-submit when timer hits zero
  const autoSubmitRef = useRef(false);
  useEffect(() => {
    if (
      timeLeft === 0 &&
      view &&
      !view.attempt.submittedAt &&
      !autoSubmitRef.current
    ) {
      autoSubmitRef.current = true;
      apiFetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ auto: true }),
      })
        .then(() => load())
        .catch(() => {})
        .finally(() => {
          // keep flag set to avoid duplicate submissions
        });
    }
  }, [timeLeft, view, attemptId, load]);

  // Flatten ordered question ids from sections
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
    // local optimistic update: map chosenOption/textAnswer for backend schema
    const cloned: AttemptViewResponse = JSON.parse(JSON.stringify(view));
    const idx = cloned.attempt.answers.findIndex(
      (a) => a.questionId === currentQid
    );
    if (idx >= 0) {
      if (Array.isArray(val)) {
        cloned.attempt.answers[idx].textAnswer = JSON.stringify(val);
      } else if (typeof val === "string") {
        // For MCQ single, treat val as chosen option id if question is mcq
        if (["mcq", "mcq-single"].includes(currentQuestion.type)) {
          cloned.attempt.answers[idx].chosenOptionId = val as unknown as string;
          // remove textAnswer if present
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

  function scheduleAutosave(qid: string, response: PrimitiveResponse) {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => saveAnswer(qid, response), 800);
  }

  async function saveAnswer(questionId: string, response: PrimitiveResponse) {
    if (mode === "review") return;
    setSaving(true);
    try {
      // adapt to backend expected fields (textAnswer or chosenOptionId)
      const payload: {
        questionId: string;
        chosenOptionId?: string;
        textAnswer?: string;
      } = { questionId };
      if (Array.isArray(response))
        payload.textAnswer = JSON.stringify(response);
      else if (typeof response === "string") {
        if (["mcq", "mcq-single"].includes(currentQuestion?.type || ""))
          payload.chosenOptionId = response;
        else payload.textAnswer = response;
      }
      await apiFetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      // swallow for now; could show toast
    } finally {
      setSaving(false);
    }
  }

  // submitAttempt replaced by useCallback above

  function renderResponseInput() {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const ans = existingAnswer;
    switch (q.type) {
      case "mcq": // backend's generic MCQ
      case "mcq-single":
        return (
          <div className="space-y-2">
            {q.options?.map((opt) => (
              <label
                key={opt._id}
                className="flex gap-2 text-sm items-start cursor-pointer"
              >
                <input
                  type="radio"
                  name={`q-${q._id}`}
                  checked={ans?.chosenOptionId === opt._id}
                  onChange={() => onChangeResponse(opt._id)}
                  disabled={
                    mode === "review" || Boolean(view?.attempt.submittedAt)
                  }
                />
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        );
      case "mcq-multi":
        // Simplified multi-select placeholder (store JSON array in textAnswer)
        return (
          <div className="text-xs text-gray-500">
            Multi-select UI not yet implemented.
          </div>
        );
      case "assertionreason":
      case "true-false":
      case "truefalse":
        return (
          <div className="flex gap-4">
            {["True", "False"].map((v) => (
              <label
                key={v}
                className="flex gap-2 items-center text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name={`q-${q._id}`}
                  checked={ans?.textAnswer === v}
                  onChange={() => onChangeResponse(v)}
                  disabled={
                    mode === "review" || Boolean(view?.attempt.submittedAt)
                  }
                />
                <span>{v}</span>
              </label>
            ))}
          </div>
        );
      case "integer":
        return (
          <input
            type="number"
            className="border rounded px-2 py-1 text-sm"
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={mode === "review" || Boolean(view?.attempt.submittedAt)}
          />
        );
      case "subjective":
      case "short":
      case "long":
        return (
          <textarea
            className="border rounded w-full min-h-[140px] p-2 text-sm"
            value={ans?.textAnswer ?? ""}
            onChange={(e) => onChangeResponse(e.target.value)}
            disabled={mode === "review" || Boolean(view?.attempt.submittedAt)}
          />
        );
      default:
        return (
          <div className="text-xs text-gray-500">
            Unsupported question type: {q.type}
          </div>
        );
    }
  }

  function formatTime(ms: number) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <Protected requiredRole="student">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-4">
          {!view && !error && <div>Loading attempt...</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {view && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold">{view.exam.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                  {timeLeft !== null &&
                    view?.attempt &&
                    !view.attempt.submittedAt && (
                      <span
                        className={`font-mono ${
                          timeLeft < 60000 ? "text-red-600" : ""
                        }`}
                      >
                        Time Left: {formatTime(timeLeft)}
                      </span>
                    )}
                  {view.attempt.submittedAt && (
                    <span className="text-green-600">Submitted</span>
                  )}
                  {saving && (
                    <span className="text-xs text-gray-500">Saving...</span>
                  )}
                </div>
              </div>
              <div className="border rounded p-4 space-y-3 bg-white">
                <div className="text-sm font-medium">
                  Question {index + 1} of {orderedQuestionIds.length}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {currentQuestion?.text}
                </div>
                {renderResponseInput()}
                {view.attempt.submittedAt && existingAnswer?.aiFeedback && (
                  <div className="mt-3 p-3 rounded bg-gray-50 border text-xs">
                    <div className="font-semibold mb-1">AI Feedback</div>
                    <div>{existingAnswer.aiFeedback}</div>
                    {typeof existingAnswer.rubricScore === "number" && (
                      <div className="mt-1">
                        Rubric Score: {existingAnswer.rubricScore}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    disabled={index === 0}
                    onClick={() => setIndex((i) => i - 1)}
                    className="px-3 py-1.5 border rounded disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={index === orderedQuestionIds.length - 1}
                    onClick={() => setIndex((i) => i + 1)}
                    className="px-3 py-1.5 border rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                {!view.attempt.submittedAt && (
                  <button
                    onClick={submitAttempt}
                    className="px-4 py-1.5 rounded bg-primary text-white"
                  >
                    Submit
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {view && (
          <div className="w-full lg:w-64 shrink-0 space-y-3">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm font-semibold mb-2">Questions</div>
              <div className="grid grid-cols-6 gap-2">
                {orderedQuestionIds.map((qid, i) => {
                  const ans = view.attempt.answers.find(
                    (a) => a.questionId === qid
                  );
                  const answered =
                    ans && (ans.chosenOptionId || ans.textAnswer);
                  return (
                    <button
                      key={qid}
                      onClick={() => setIndex(i)}
                      className={`h-8 text-xs rounded border flex items-center justify-center ${
                        i === index
                          ? "bg-primary text-white border-primary"
                          : answered
                          ? "bg-green-100 border-green-300"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            {view.attempt.submittedAt && (
              <div className="border rounded p-3 bg-white text-xs space-y-1">
                <div>
                  <span className="font-semibold">Score:</span>{" "}
                  {view.attempt.totalScore} / {view.attempt.maxScore}
                </div>
                {view.attempt.resultPublished ? (
                  <div className="text-green-600">Result Published</div>
                ) : (
                  <div className="text-amber-600">
                    Awaiting Teacher Approval
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Protected>
  );
}
