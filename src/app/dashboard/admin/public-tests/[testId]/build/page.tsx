"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Protected from "@/components/Protected";
import QuestionBankPicker from "@/components/teacher/QuestionBankPicker";
import { InlineLoader } from "@/components/ElegantLoader";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/components/ui/toast";
import { Field, inputClass } from "@/components/admin/publicTestUi";
import {
  KIND_LABELS,
  getPublicTest,
  listPublicSeries,
  publishProblems,
  setPublicTestStatus,
  toLocalInput,
  updatePublicTest,
  type PublicSeries,
  type PublicTest,
  type PublicTestDifficulty,
  type PublicTestDraft,
  type PublicTestKind,
} from "@/lib/publicTests";

/**
 * Public test builder.
 *
 * ── One section, on purpose ──────────────────────────────────────────────────
 * The data model supports several sections, but this builder writes exactly
 * one. Multi-section authoring is a genuinely different UI (per-section timers,
 * per-section shuffling, ordering between them) and half of it would be worse
 * than none. A promoted exam whose sections were merged keeps all its
 * questions; only the divisions are folded, which is what the institute exam
 * builder already does.
 *
 * ── Editing a paper people have already sat ──────────────────────────────────
 * Allowed, and reported. Every in-flight attempt froze its own question list at
 * start, so existing results stay internally consistent while new attempts get
 * the edited paper. The alternative — locking the paper forever after one
 * attempt — makes a typo permanent.
 *
 * ── Two different "class" fields ─────────────────────────────────────────────
 * The question bank is organised by class, so browsing it needs one. The test's
 * OWN class is a discovery tag and may legitimately be empty ("any class").
 * They are separate controls here because conflating them would force every
 * paper to be tagged just to pick questions.
 *
 * ── Access ───────────────────────────────────────────────────────────────────
 * `Protected` requires a session; the admin/teacher gate is enforced by the
 * backend router (`requireRole('admin','teacher')` on /api/admin-assessments),
 * which is where it has to hold anyway. `Protected` takes a single role, and
 * this page needs two — widening that shared institute component to express an
 * OR is not worth the blast radius for a client-side convenience.
 */

type Tab = "questions" | "settings" | "review";

const TABS: { key: Tab; label: string }[] = [
  { key: "questions", label: "Questions" },
  { key: "settings", label: "Settings" },
  { key: "review", label: "Review & publish" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180];

const MARKING_PRESETS = [
  { label: "+1 / 0", correct: 1, incorrect: 0, unattempted: 0 },
  { label: "+4 / −1", correct: 4, incorrect: -1, unattempted: 0 },
  { label: "+2 / −0.5", correct: 2, incorrect: -0.5, unattempted: 0 },
  { label: "+3 / −1", correct: 3, incorrect: -1, unattempted: 0 },
];

const CLASSES = ["6", "7", "8", "9", "10", "11", "12"];
const BOARDS = ["CBSE", "GSEB", "ICSE", "State Board"];
const DIFFICULTIES: PublicTestDifficulty[] = ["easy", "medium", "hard", "mixed"];

/** How long after the last edit before the draft is saved. */
const AUTOSAVE_MS = 1200;

export default function PublicTestBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.testId as string;

  const [test, setTest] = useState<PublicTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("questions");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const [attemptWarning, setAttemptWarning] = useState<string | null>(null);

  // ── Draft state ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<PublicTestKind>("TEST");
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [durationMins, setDurationMins] = useState(60);
  const [marking, setMarking] = useState({ correct: 1, incorrect: 0, unattempted: 0 });
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [examType, setExamType] = useState("");
  const [difficulty, setDifficulty] = useState<PublicTestDifficulty>("mixed");
  const [board, setBoard] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [orderInSeries, setOrderInSeries] = useState("");

  /** Which class's bank to browse. Independent of the test's own class tag. */
  const [bankClass, setBankClass] = useState("");

  const [series, setSeries] = useState<PublicSeries[]>([]);

  /** Suppresses autosave until the first load has populated state. */
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!testId) return;
    let cancelled = false;

    (async () => {
      try {
        const loaded = await getPublicTest(testId);
        if (cancelled) return;

        setTest(loaded);
        setTitle(loaded.title ?? "");
        setDescription(loaded.description ?? "");
        setKind(loaded.kind ?? "TEST");
        // Sections are merged into one list — see the note at the top.
        setQuestionIds((loaded.sections ?? []).flatMap((s) => s.questionIds ?? []));
        setDurationMins(loaded.durationMins ?? 60);
        setMarking({
          correct: loaded.markingScheme?.correct ?? 1,
          incorrect: loaded.markingScheme?.incorrect ?? 0,
          unattempted: loaded.markingScheme?.unattempted ?? 0,
        });
        setShuffleQuestions(!!loaded.sections?.[0]?.shuffleQuestions);
        setShuffleOptions(!!loaded.sections?.[0]?.shuffleOptions);
        setClassLevel(loaded.classLevel ?? "");
        // The bank the questions actually came from. Falls back to the
        // discovery class only for papers saved before questionBank existed.
        setBankClass(loaded.questionBank ?? loaded.classLevel ?? "");
        setSubject(loaded.subject ?? "");
        setExam(loaded.exam ?? "");
        setExamType(loaded.examType ?? "");
        setDifficulty(loaded.difficulty ?? "mixed");
        setBoard(loaded.board ?? []);
        setInstructions(loaded.instructions ?? "");
        setStartAt(toLocalInput(loaded.schedule?.startAt));
        setEndAt(toLocalInput(loaded.schedule?.endAt));
        setSeriesId(loaded.seriesId ?? "");
        setOrderInSeries(loaded.orderInSeries ? String(loaded.orderInSeries) : "");

        hydrated.current = true;
      } catch (error) {
        if (!cancelled) notify.error((error as Error).message || "Couldn't load this test");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  useEffect(() => {
    listPublicSeries()
      .then(({ items }) => setSeries(items))
      .catch(() => {
        // Non-fatal: the series picker just shows nothing to attach to.
      });
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const buildDraft = useCallback((): PublicTestDraft => {
    const schedule: { startAt?: string; endAt?: string } = {};
    if (startAt) schedule.startAt = new Date(startAt).toISOString();
    if (endAt) schedule.endAt = new Date(endAt).toISOString();

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      sections: [
        {
          title: "Section A",
          questionIds,
          shuffleQuestions,
          shuffleOptions,
        },
      ],
      markingScheme: marking,
      durationMins,
      classLevel: classLevel || undefined,
      // WHICH collection the chosen ids live in. Questions are stored per class,
      // so without this the attempt player looks them up in the wrong place and
      // serves an empty paper.
      questionBank: bankClass || undefined,
      subject: subject.trim() || undefined,
      exam: exam.trim() || undefined,
      examType: examType.trim() || undefined,
      difficulty,
      board,
      instructions: instructions.trim() || undefined,
      schedule,
      seriesId: seriesId || undefined,
      orderInSeries: orderInSeries ? Number(orderInSeries) : undefined,
    };
  }, [
    title,
    description,
    kind,
    questionIds,
    bankClass,
    shuffleQuestions,
    shuffleOptions,
    marking,
    durationMins,
    classLevel,
    subject,
    exam,
    examType,
    difficulty,
    board,
    instructions,
    startAt,
    endAt,
    seriesId,
    orderInSeries,
  ]);

  const save = useCallback(async () => {
    if (!testId || !hydrated.current) return;
    setSaveStatus("saving");
    try {
      const { test: updated, warning } = await updatePublicTest(testId, buildDraft());
      setTest(updated);
      // Surfaced, never swallowed: the author must know that existing attempts
      // keep the paper they started with.
      if (warning) setAttemptWarning(warning);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1800);
    } catch (error) {
      setSaveStatus("error");
      notify.error((error as Error).message || "Couldn't save");
    }
  }, [testId, buildDraft]);

  // Debounced autosave. Skipped entirely before hydration so the load itself
  // cannot trigger a write.
  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [save]);

  // ── Publish ────────────────────────────────────────────────────────────────

  async function publish() {
    if (!testId) return;
    setPublishing(true);
    try {
      // Flush the draft first: publishing a paper whose last edit is still
      // sitting in a debounce timer would gate against stale content.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await save();
      await setPublicTestStatus(testId, "published");
      setTest((t) => (t ? { ...t, status: "published" } : t));
      notify.success("Published — this test is now live to the public");
    } catch (error) {
      const problems = publishProblems(error);
      if (problems.length > 0) setBlockers(problems);
      else notify.error((error as Error).message || "Couldn't publish");
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    if (!testId) return;
    setPublishing(true);
    try {
      await setPublicTestStatus(testId, "draft");
      setTest((t) => (t ? { ...t, status: "draft" } : t));
      notify.success("Back to draft — learners can no longer see it");
    } catch (error) {
      notify.error((error as Error).message || "Couldn't unpublish");
    } finally {
      setPublishing(false);
    }
  }

  const totalMarks = useMemo(
    () => questionIds.length * (marking.correct || 1),
    [questionIds.length, marking.correct],
  );

  const live = test?.status === "published";
  const attempts = test?.attemptCount ?? 0;

  if (loading) {
    return (
      <Protected>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <InlineLoader />
        </div>
      </Protected>
    );
  }

  if (!test) {
    return (
      <Protected>
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <p className="text-slate-600">This test could not be found.</p>
          <button
            onClick={() => router.push("/dashboard/admin?tab=public-tests")}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium"
          >
            Back to public tests
          </button>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
        {/* Sticky chrome: identity, save state, publish. */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-8xl mx-auto px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/admin?tab=public-tests")}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                title="Back to public tests"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      live ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {live ? "Live to the public" : "Draft"}
                  </span>
                  <span className="text-xs text-slate-500">{KIND_LABELS[kind]}</span>
                  <SaveIndicator status={saveStatus} />
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled test"
                  className="mt-0.5 w-full text-lg font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:block text-right mr-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {questionIds.length} questions
                  </div>
                  <div className="text-xs text-slate-500">
                    {totalMarks} marks · {durationMins} min
                  </div>
                </div>

                {live ? (
                  <button
                    onClick={unpublish}
                    disabled={publishing}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={publish}
                    disabled={publishing}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {publishing ? "Publishing…" : "Publish"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2 -mb-px">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-8xl mx-auto px-4 lg:px-6 py-6 space-y-5">
          {/* A live paper is being read by real people right now. */}
          {live && (
            <Banner tone="emerald">
              This test is live. Changes save immediately and affect what new learners see.
            </Banner>
          )}

          {attempts > 0 && (
            <Banner tone="amber">
              {attempts} {attempts === 1 ? "learner has" : "learners have"} attempted this paper.
              Their results keep the questions they were given — edits only affect new attempts.
            </Banner>
          )}

          {tab === "questions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <Field
                  label="Browse the question bank for"
                  hint="Separate from this test's own class tag, which is set in Settings"
                >
                  <select
                    value={bankClass}
                    onChange={(e) => setBankClass(e.target.value)}
                    className={`${inputClass} max-w-xs`}
                  >
                    <option value="">Choose a class…</option>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {bankClass ? (
                <QuestionBankPicker
                  classLevel={bankClass}
                  selectedIds={questionIds}
                  onChange={setQuestionIds}
                  marksPerQuestion={marking.correct}
                />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                  <h3 className="text-lg font-semibold text-slate-900">Pick a class to start</h3>
                  <p className="mt-2 text-slate-600 max-w-md mx-auto">
                    The question bank is organised by class. Choosing one here only decides what
                    you browse — it does not tag the test.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {tab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-2 gap-5">
              {/* ── Format ── */}
              <Card title="Format" description="How the paper is taken and scored.">
                <Field label="Type">
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as PublicTestKind)}
                    className={inputClass}
                  >
                    {(Object.keys(KIND_LABELS) as PublicTestKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Duration">
                  <div className="flex items-center gap-2 flex-wrap">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setDurationMins(mins)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          durationMins === mins
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Math.max(1, Number(e.target.value) || 1))}
                      className={`${inputClass} w-24`}
                    />
                  </div>
                </Field>

                <Field
                  label="Marking scheme"
                  hint="Negative marking is shown to learners before they start"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {MARKING_PRESETS.map((preset) => {
                      const active =
                        marking.correct === preset.correct && marking.incorrect === preset.incorrect;
                      return (
                        <button
                          key={preset.label}
                          onClick={() =>
                            setMarking({
                              correct: preset.correct,
                              incorrect: preset.incorrect,
                              unattempted: preset.unattempted,
                            })
                          }
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <NumberField
                      label="Correct"
                      value={marking.correct}
                      onChange={(v) => setMarking((m) => ({ ...m, correct: v }))}
                    />
                    <NumberField
                      label="Wrong"
                      value={marking.incorrect}
                      onChange={(v) => setMarking((m) => ({ ...m, incorrect: v }))}
                      hint="negative"
                    />
                    <NumberField
                      label="Skipped"
                      value={marking.unattempted}
                      onChange={(v) => setMarking((m) => ({ ...m, unattempted: v }))}
                    />
                  </div>
                </Field>

                <div className="space-y-2 pt-1">
                  <Toggle
                    checked={shuffleQuestions}
                    onChange={setShuffleQuestions}
                    label="Shuffle questions"
                    hint="Each learner gets their own order, fixed for the whole attempt"
                  />
                  <Toggle
                    checked={shuffleOptions}
                    onChange={setShuffleOptions}
                    label="Shuffle options"
                    hint="Also fixed per attempt, so resuming shows the same paper"
                  />
                </div>
              </Card>

              {/* ── Discovery ── */}
              <Card
                title="Discovery"
                description="How learners find this in the public catalogue. Everything is optional — a blank field just means the test is not filtered by it."
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Class">
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Any class</option>
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Difficulty">
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as PublicTestDifficulty)}
                      className={inputClass}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d[0].toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Subject">
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Physics"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Target exam">
                    <input
                      value={exam}
                      onChange={(e) => setExam(e.target.value)}
                      placeholder="JEE Main"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Exam type" hint="Optional">
                  <input
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    placeholder="e.g. Full syllabus, Chapter test"
                    className={inputClass}
                  />
                </Field>

                <Field label="Boards" hint="Leave empty to show to every board">
                  <div className="flex items-center gap-2 flex-wrap">
                    {BOARDS.map((b) => {
                      const active = board.includes(b);
                      return (
                        <button
                          key={b}
                          onClick={() =>
                            setBoard((arr) =>
                              active ? arr.filter((x) => x !== b) : [...arr, b],
                            )
                          }
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Description" hint="Optional">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What this paper covers."
                    className={inputClass}
                  />
                </Field>
              </Card>

              {/* ── Availability ── */}
              <Card
                title="Availability"
                description="Leave both empty and the test is takeable as soon as it is published. Inside a window it is discoverable before it opens, so learners can plan for it."
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Opens" hint="Optional">
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Closes" hint="Optional">
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                {startAt && endAt && new Date(startAt) >= new Date(endAt) && (
                  <p className="text-sm text-red-600">
                    The window ends before it starts — publishing will be refused.
                  </p>
                )}
              </Card>

              {/* ── Series ── */}
              <Card
                title="Series"
                description="Attach this paper to a programme learners work through in order."
              >
                <Field label="Series" hint="Optional">
                  <select
                    value={seriesId}
                    onChange={(e) => setSeriesId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Not part of a series</option>
                    {series.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </Field>

                {seriesId && (
                  <Field label="Position in the series" hint="1, 2, 3…">
                    <input
                      type="number"
                      min={1}
                      value={orderInSeries}
                      onChange={(e) => setOrderInSeries(e.target.value)}
                      className={`${inputClass} max-w-[8rem]`}
                    />
                  </Field>
                )}

                {seriesId && kind !== "SERIES_PAPER" && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Papers in a series are usually typed &ldquo;Series paper&rdquo;. Set that under
                    Format if that is what this is.
                  </p>
                )}

                <Field label="Instructions" hint="Shown before the learner starts">
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    placeholder="Anything a learner needs to know before starting."
                    className={inputClass}
                  />
                </Field>
              </Card>
            </motion.div>
          )}

          {tab === "review" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Card title="What learners will see" description="Exactly as it appears before they commit.">
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                  <Row label="Title" value={title || "Untitled test"} />
                  <Row label="Type" value={KIND_LABELS[kind]} />
                  <Row label="Questions" value={String(questionIds.length)} />
                  <Row label="Duration" value={`${durationMins} min`} />
                  <Row label="Total marks" value={String(totalMarks)} />
                  <Row
                    label="Marking"
                    value={
                      marking.correct === 1 && marking.incorrect === 0
                        ? "+1 per correct answer"
                        : `+${marking.correct} correct, ${marking.incorrect} wrong`
                    }
                  />
                  <Row label="Class" value={classLevel ? `Class ${classLevel}` : "Any class"} />
                  <Row label="Subject" value={subject || "—"} />
                  <Row label="Target exam" value={exam || "—"} />
                  <Row label="Difficulty" value={difficulty} />
                  <Row label="Boards" value={board.length ? board.join(", ") : "All boards"} />
                  <Row
                    label="Availability"
                    value={
                      startAt || endAt
                        ? `${startAt ? new Date(startAt).toLocaleString() : "now"} → ${endAt ? new Date(endAt).toLocaleString() : "no end"}`
                        : "Always open once published"
                    }
                  />
                </dl>
              </Card>

              <Card
                title="Before you publish"
                description="These are checked by the server. Anything unmet is reported all at once when you press Publish."
              >
                <ul className="space-y-2">
                  <Check ok={questionIds.length > 0} label="Has at least one question" />
                  <Check ok={durationMins > 0} label="Has a duration" />
                  <Check
                    ok={!(startAt && endAt) || new Date(startAt) < new Date(endAt)}
                    label="Availability window is the right way round"
                  />
                  <Check
                    ok={kind !== "SERIES_PAPER" || !!seriesId}
                    label="A series paper belongs to a series"
                  />
                </ul>

                <p className="text-sm text-slate-500 pt-2">
                  The server also verifies that every question still exists in the bank and that the
                  paper can actually be auto-graded.
                </p>

                {!live && (
                  <button
                    onClick={publish}
                    disabled={publishing}
                    className="mt-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {publishing ? "Publishing…" : "Publish to the public catalogue"}
                  </button>
                )}
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Every blocker at once, verbatim from the server's gate. */}
      <Modal
        open={!!blockers}
        onOpenChange={(open) => !open && setBlockers(null)}
        title="Not ready to publish"
        description="Nothing was published. Fix these and try again:"
      >
        <ul className="space-y-2">
          {(blockers ?? []).map((problem, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{problem}</span>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={!!attemptWarning}
        onOpenChange={(open) => !open && setAttemptWarning(null)}
        title="This paper already has attempts"
      >
        <p className="text-sm text-slate-700">{attemptWarning}</p>
        <p className="mt-3 text-sm text-slate-500">
          Existing results stay consistent because each attempt froze its question list when it
          started. Nothing already submitted has changed.
        </p>
      </Modal>
    </Protected>
  );
}

// ─── Bits ────────────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  const text =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Not saved — check your connection";
  const tone =
    status === "error" ? "text-red-600" : status === "saved" ? "text-emerald-600" : "text-slate-400";
  return <span className={`text-xs ${tone}`}>{text}</span>;
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Banner({ tone, children }: { tone: "emerald" | "amber"; children: React.ReactNode }) {
  const styles =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : "bg-amber-50 border-amber-200 text-amber-900";
  return <div className={`rounded-xl border p-3 text-sm ${styles}`}>{children}</div>;
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">
        {label}
        {hint && <span className="text-slate-400 font-normal ml-1">({hint})</span>}
      </span>
      <input
        type="number"
        step="0.25"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputClass}
      />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`mt-0.5 w-9 h-5 rounded-full transition-colors shrink-0 relative ${
          checked ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            checked ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <dt className="text-sm text-slate-500 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 truncate">{value}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {ok ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        )}
      </span>
      <span className={ok ? "text-slate-700" : "text-slate-500"}>{label}</span>
    </li>
  );
}
