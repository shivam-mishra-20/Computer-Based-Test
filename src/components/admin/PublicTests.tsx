"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { notify } from "../ui/toast";
import { Modal } from "../ui/modal";
import { InlineLoader } from "../ElegantLoader";
import PublicSeriesManager from "./PublicSeriesManager";
import { Field, inputClass } from "./publicTestUi";
import {
  KIND_LABELS,
  createPublicTest,
  deletePublicTest,
  duplicatePublicTest,
  formatMarking,
  isHasAttempts,
  listPublicTests,
  promoteExam,
  publishProblems,
  setPublicTestStatus,
  type PublicTest,
  type PublicTestKind,
  type PublicTestStatus,
} from "@/lib/publicTests";

/**
 * Public test catalogue — the authoring surface for the public learning app.
 *
 * ── This is NOT the exam manager ─────────────────────────────────────────────
 * Institute exams are assigned to a class and a batch and are visible only to
 * enrolled students. These are published to the open internet and can be taken
 * by anyone, including signed-out visitors browsing the catalogue. Keeping the
 * two screens separate is deliberate: a UI that could flip a paper between
 * "my batch" and "the whole world" with one control is exactly the mistake the
 * separate-collections architecture exists to make impossible.
 *
 * ── Publishing is a gate, not a toggle ───────────────────────────────────────
 * The server refuses to publish a paper that is empty, has no duration, has an
 * inverted schedule window, or has lost its questions from the bank — and it
 * returns EVERY blocker at once so an author fixes them in one pass. This
 * screen surfaces that list verbatim; collapsing it to "publish failed" would
 * throw away the whole point.
 *
 * ── Deleting versus archiving ────────────────────────────────────────────────
 * Once a learner has sat a paper, deleting it would orphan their result. The
 * server refuses (409), and this screen offers archiving instead — which
 * removes it from discovery while every result stays readable.
 */

type Tab = "tests" | "series";
type StatusFilter = "" | PublicTestStatus;

interface InstituteExam {
  _id: string;
  title: string;
  classLevel?: string;
  sections?: { questionIds: string[] }[];
}

const STATUS_STYLES: Record<PublicTestStatus, { chip: string; dot: string; label: string }> = {
  draft: { chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400", label: "Draft" },
  published: { chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", label: "Live" },
  archived: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500", label: "Archived" },
};

export default function PublicTests() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("tests");
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [blockers, setBlockers] = useState<{ title: string; problems: string[] } | null>(null);
  /** Bumped to ask PublicSeriesManager to open its create form. A counter
   *  rather than a boolean so pressing "New series" twice works. */
  const [createSeriesToken, setCreateSeriesToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listPublicTests({
        q: search.trim().length >= 2 ? search.trim() : undefined,
        status: statusFilter,
        limit: 100,
      });
      setTests(page.items);
    } catch (error) {
      setTests([]);
      notify.error((error as Error).message || "Failed to load public tests");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    // Debounced so typing a search does not fire a request per keystroke.
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function changeStatus(test: PublicTest, status: PublicTestStatus) {
    setBusyId(test._id);
    try {
      await setPublicTestStatus(test._id, status);
      setTests((arr) => arr.map((t) => (t._id === test._id ? { ...t, status } : t)));
      notify.success(
        status === "published"
          ? `"${test.title}" is now live to the public`
          : status === "archived"
            ? `"${test.title}" archived — results stay readable`
            : `"${test.title}" moved back to draft`,
      );
    } catch (error) {
      // The gate returns every blocker at once; show them all.
      const problems = publishProblems(error);
      if (problems.length > 0) {
        setBlockers({ title: test.title, problems });
      } else {
        notify.error((error as Error).message || "Couldn't change the status");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(test: PublicTest) {
    setBusyId(test._id);
    try {
      const copy = await duplicatePublicTest(test._id);
      notify.success("Duplicated as a new draft");
      router.push(`/dashboard/admin/public-tests/${copy._id}/build`);
    } catch (error) {
      notify.error((error as Error).message || "Couldn't duplicate this test");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(test: PublicTest) {
    if (!confirm(`Delete "${test.title}"? This cannot be undone.`)) return;
    setBusyId(test._id);
    try {
      await deletePublicTest(test._id);
      setTests((arr) => arr.filter((t) => t._id !== test._id));
      notify.success("Test deleted");
    } catch (error) {
      if (isHasAttempts(error)) {
        // Not really a failure — it means archiving is the right action.
        if (
          confirm(
            `${(error as Error).message}\n\nArchive it instead? It disappears from the public catalogue and every learner keeps their result.`,
          )
        ) {
          await changeStatus(test, "archived");
        }
      } else {
        notify.error((error as Error).message || "Couldn't delete this test");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 lg:p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Public Tests</h1>
              <p className="text-slate-600 max-w-2xl">
                Practice papers, quizzes and mock test <strong>series</strong> for learners who
                are <strong>not</strong> enrolled at Abhigyan Gurukul — anyone using the app,
                including signed-out visitors. Both admins and teachers can create and publish
                these. Exams for enrolled students are managed separately under Exams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={load}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPromote(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Promote an exam
            </motion.button>

            {/* Creating a SERIES used to be reachable only after noticing the
                Series tab, so on landing the only visible create action was
                "New test". Both live here now. */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTab("series");
                setCreateSeriesToken((n) => n + 1);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              New series
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New test
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {(["tests", "series"] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {key === "tests" ? "Tests" : "Series"}
            </button>
          ))}
        </div>

        {tab === "series" ? (
          <PublicSeriesManager openCreateToken={createSeriesToken} />
        ) : (
          <>
            {/* Query row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests by title or description"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="published">Live</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <InlineLoader />
              </div>
            ) : tests.length === 0 ? (
              <EmptyCatalogue
                narrowed={search.trim().length >= 2 || statusFilter !== ""}
                onCreate={() => setShowCreate(true)}
                onPromote={() => setShowPromote(true)}
              />
            ) : (
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {tests.map((test) => (
                    <TestRow
                      key={test._id}
                      test={test}
                      busy={busyId === test._id}
                      onOpen={() => router.push(`/dashboard/admin/public-tests/${test._id}/build`)}
                      onStatus={(status) => changeStatus(test, status)}
                      onDuplicate={() => duplicate(test)}
                      onDelete={() => remove(test)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <CreateTestModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => router.push(`/dashboard/admin/public-tests/${id}/build`)}
      />

      <PromoteExamModal
        open={showPromote}
        onOpenChange={setShowPromote}
        onPromoted={(id) => router.push(`/dashboard/admin/public-tests/${id}/build`)}
      />

      {/* Every blocker at once, verbatim from the server's gate. */}
      <Modal
        open={!!blockers}
        onOpenChange={(open) => !open && setBlockers(null)}
        title="Not ready to publish"
        description={blockers ? `"${blockers.title}" needs these fixed first:` : undefined}
      >
        <ul className="space-y-2">
          {(blockers?.problems ?? []).map((problem, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{problem}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Nothing was published. Fix these in the builder and try again.
        </p>
      </Modal>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function TestRow({
  test,
  busy,
  onOpen,
  onStatus,
  onDuplicate,
  onDelete,
}: {
  test: PublicTest;
  busy: boolean;
  onOpen: () => void;
  onStatus: (status: PublicTestStatus) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const style = STATUS_STYLES[test.status];
  const marking = formatMarking(test.markingScheme);
  const attempts = test.attemptCount ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {KIND_LABELS[test.kind]}
            </span>
            {attempts > 0 && (
              <span className="text-xs text-slate-500">
                {attempts} {attempts === 1 ? "attempt" : "attempts"}
              </span>
            )}
          </div>

          <button
            onClick={onOpen}
            className="mt-1.5 text-left text-base font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
          >
            {test.title}
          </button>

          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-slate-500">
            <span>{test.questionCount} questions</span>
            <span>·</span>
            <span>{test.durationMins} min</span>
            <span>·</span>
            <span>{test.totalMarks} marks</span>
            {marking && (
              <>
                <span>·</span>
                <span className="text-red-600 font-medium">{marking}</span>
              </>
            )}
            {test.subject && (
              <>
                <span>·</span>
                <span>{test.subject}</span>
              </>
            )}
            {test.classLevel && (
              <>
                <span>·</span>
                <span>Class {test.classLevel}</span>
              </>
            )}
            {test.duplicatedFrom && (
              <>
                <span>·</span>
                <span className="italic">copied</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpen}
            disabled={busy}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Edit
          </button>

          {test.status === "published" ? (
            <button
              onClick={() => onStatus("draft")}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
              title="Remove from the public catalogue and return to draft"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => onStatus("published")}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {busy ? "…" : "Publish"}
            </button>
          )}

          <button
            onClick={onDuplicate}
            disabled={busy}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Duplicate as a new draft"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Archiving is offered directly for live papers: it is the correct
              action once anyone has sat them, and burying it behind a failed
              delete would be a worse discovery path. */}
          {test.status !== "archived" && attempts > 0 && (
            <button
              onClick={() => onStatus("archived")}
              disabled={busy}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Archive — hides it from learners, keeps every result"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </button>
          )}

          <button
            onClick={onDelete}
            disabled={busy}
            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={attempts > 0 ? "Has attempts — archive instead" : "Delete"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyCatalogue({
  narrowed,
  onCreate,
  onPromote,
}: {
  narrowed: boolean;
  onCreate: () => void;
  onPromote: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">
        {narrowed ? "No tests match that" : "No public tests yet"}
      </h3>
      <p className="mt-2 text-slate-600 max-w-md mx-auto">
        {narrowed
          ? "Try a different search or clear the status filter."
          : "Build one from the question bank, or promote an exam you have already written for the institute."}
      </p>
      {!narrowed && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onCreate}
            className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            New test
          </button>
          <button
            onClick={onPromote}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Promote an exam
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Just enough to create the draft; everything else is the builder's job.
 *
 * A long form here would be a second builder that has to stay in sync with the
 * real one. The only required field is a title.
 */
function CreateTestModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PublicTestKind>("TEST");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return notify.error("A title is required");
    setSaving(true);
    try {
      const created = await createPublicTest({
        title: title.trim(),
        kind,
        classLevel: classLevel || undefined,
        subject: subject.trim() || undefined,
      });
      notify.success("Draft created");
      onOpenChange(false);
      setTitle("");
      setSubject("");
      onCreated(created._id);
    } catch (error) {
      notify.error((error as Error).message || "Couldn't create this test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New public test"
      description="Creates a draft. Nothing is visible to learners until you publish it."
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create and add questions"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Motion in a Straight Line — Practice Test 1"
            className={inputClass}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as PublicTestKind)} className={inputClass}>
              {(Object.keys(KIND_LABELS) as PublicTestKind[])
                .filter((k) => k !== "SERIES_PAPER")
                .map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Class" hint="Optional">
            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className={inputClass}>
              <option value="">Any class</option>
              {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Subject" hint="Optional">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Physics"
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Promote ─────────────────────────────────────────────────────────────────

/**
 * Copy an institute exam into a public draft.
 *
 * The wording is careful on purpose. Authors need to understand that this is a
 * COPY and that the original exam is untouched — otherwise the reasonable fear
 * is that promoting a Class 10 exam exposes it to their students differently,
 * or that later edits to the exam will leak to the public.
 */
function PromoteExamModal({
  open,
  onOpenChange,
  onPromoted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromoted: (id: string) => void;
}) {
  const [exams, setExams] = useState<InstituteExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = (await apiFetch("/exams")) as { items?: InstituteExam[] };
        if (!cancelled) setExams(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setExams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      const { test } = await promoteExam(selected);
      notify.success("Promoted as a draft — review it before publishing");
      onOpenChange(false);
      setSelected("");
      onPromoted(test._id);
    } catch (error) {
      notify.error((error as Error).message || "Couldn't promote this exam");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Promote an institute exam"
      description="Makes a public copy. The original exam is not changed and stays private to its class."
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !selected}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Promoting…" : "Promote as draft"}
          </button>
        </div>
      }
    >
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
        <p className="text-sm text-amber-900">
          The copy is independent from the moment it is made. Later edits to the institute exam
          will <strong>not</strong> reach the public version, and editing the public version will
          not touch the exam.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <InlineLoader />
        </div>
      ) : exams.length === 0 ? (
        <p className="py-6 text-center text-slate-500 text-sm">No institute exams found.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-2">
          {exams.map((exam) => {
            const count = exam.sections?.reduce((n, s) => n + (s.questionIds?.length || 0), 0) ?? 0;
            const active = selected === exam._id;
            return (
              <button
                key={exam._id}
                onClick={() => setSelected(exam._id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  active
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-900">{exam.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {count} {count === 1 ? "question" : "questions"}
                  {exam.classLevel ? ` · ${exam.classLevel}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

