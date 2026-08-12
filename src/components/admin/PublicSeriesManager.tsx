"use client";
import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notify } from "../ui/toast";
import { Modal } from "../ui/modal";
import { InlineLoader } from "../ElegantLoader";
import { Field, inputClass } from "./publicTestUi";
import {
  createPublicSeries,
  deletePublicSeries,
  listPublicSeries,
  updatePublicSeries,
  type PublicSeries,
  type PublicTestStatus,
} from "@/lib/publicTests";

/**
 * Test series — an ordered programme of papers.
 *
 * ── Publishing a series is gated on its papers ───────────────────────────────
 * The server refuses to publish a series with no published paper in it, because
 * to a learner that is an empty shelf with a title. The paper's own membership
 * and position are set in the paper's builder, not here: a series is a
 * container, and editing membership from both ends is how the two views drift.
 *
 * ── Deleting detaches, it does not cascade ───────────────────────────────────
 * The papers are real content that learners may have already sat. Deleting the
 * shelf keeps the books: they become standalone tests, and the server reports
 * how many were detached.
 */

const STATUS_STYLES: Record<PublicTestStatus, { chip: string; label: string }> = {
  draft: { chip: "bg-slate-100 text-slate-700", label: "Draft" },
  published: { chip: "bg-emerald-100 text-emerald-800", label: "Live" },
  archived: { chip: "bg-amber-100 text-amber-800", label: "Archived" },
};

export default function PublicSeriesManager({
  openCreateToken = 0,
}: {
  /**
   * Bumped by the parent's "New series" button to open the create form.
   * A counter rather than a boolean, so the action works every time it is
   * pressed rather than only on the first transition to true.
   */
  openCreateToken?: number;
}) {
  const [series, setSeries] = useState<PublicSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicSeries | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await listPublicSeries();
      setSeries(items);
    } catch (error) {
      setSeries([]);
      notify.error((error as Error).message || "Failed to load series");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Opens on request from the parent header. Guarded on > 0 so the initial
  // render does not pop the form open.
  useEffect(() => {
    if (openCreateToken > 0) setCreating(true);
  }, [openCreateToken]);

  async function changeStatus(row: PublicSeries, status: PublicTestStatus) {
    setBusyId(row._id);
    try {
      const updated = await updatePublicSeries(row._id, { status });
      setSeries((arr) => arr.map((s) => (s._id === row._id ? updated : s)));
      notify.success(status === "published" ? "Series is live" : "Series updated");
    } catch (error) {
      // The "publish at least one paper first" refusal is the common case and
      // reads as guidance, so the server's own message is shown verbatim.
      notify.error((error as Error).message || "Couldn't change the status");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: PublicSeries) {
    if (
      !confirm(
        `Delete "${row.title}"?\n\nIts ${row.paperCount} paper${row.paperCount === 1 ? "" : "s"} will be kept as standalone tests — only the series itself is removed.`,
      )
    )
      return;

    setBusyId(row._id);
    try {
      const { detached } = await deletePublicSeries(row._id);
      setSeries((arr) => arr.filter((s) => s._id !== row._id));
      notify.success(
        detached > 0
          ? `Series deleted. ${detached} paper${detached === 1 ? "" : "s"} kept as standalone tests.`
          : "Series deleted",
      );
    } catch (error) {
      notify.error((error as Error).message || "Couldn't delete this series");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          A series is a set of papers taken in order. Add papers to one from the paper&apos;s own
          builder, where its position in the series is set.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
        >
          New series
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <InlineLoader />
        </div>
      ) : series.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No series yet</h3>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">
            Create one to group papers into a programme learners work through in order.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {series.map((row) => (
              <motion.div
                key={row._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status].chip}`}
                      >
                        {STATUS_STYLES[row.status].label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.paperCount} {row.paperCount === 1 ? "paper" : "papers"}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-base font-semibold text-slate-900">{row.title}</h3>

                    {row.description && (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{row.description}</p>
                    )}

                    <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      {row.subject && <span>{row.subject}</span>}
                      {row.exam && <span>· {row.exam}</span>}
                      {row.classLevel && <span>· Class {row.classLevel}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(row)}
                      disabled={busyId === row._id}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Edit
                    </button>

                    {row.status === "published" ? (
                      <button
                        onClick={() => changeStatus(row, "draft")}
                        disabled={busyId === row._id}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus(row, "published")}
                        disabled={busyId === row._id}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === row._id ? "…" : "Publish"}
                      </button>
                    )}

                    <button
                      onClick={() => remove(row)}
                      disabled={busyId === row._id}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                      title="Delete — papers are kept"
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
            ))}
          </AnimatePresence>
        </div>
      )}

      <SeriesFormModal
        open={creating || !!editing}
        series={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={(saved) => {
          setSeries((arr) => {
            const exists = arr.some((s) => s._id === saved._id);
            return exists ? arr.map((s) => (s._id === saved._id ? saved : s)) : [saved, ...arr];
          });
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function SeriesFormModal({
  open,
  series,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  series: PublicSeries | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (series: PublicSeries) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [saving, setSaving] = useState(false);

  // Seeded when the modal opens, so editing one series then another does not
  // show the previous one's values.
  useEffect(() => {
    if (!open) return;
    setTitle(series?.title ?? "");
    setDescription(series?.description ?? "");
    setSubject(series?.subject ?? "");
    setExam(series?.exam ?? "");
    setClassLevel(series?.classLevel ?? "");
  }, [open, series]);

  async function submit() {
    if (!title.trim()) return notify.error("A title is required");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim() || undefined,
        exam: exam.trim() || undefined,
        classLevel: classLevel || undefined,
      };
      const saved = series
        ? await updatePublicSeries(series._id, payload)
        : await createPublicSeries(payload);
      notify.success(series ? "Series updated" : "Series created");
      onSaved(saved);
    } catch (error) {
      notify.error((error as Error).message || "Couldn't save this series");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={series ? "Edit series" : "New series"}
      description={
        series ? undefined : "Creates a draft. Add papers to it from each paper's builder."
      }
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
            {saving ? "Saving…" : series ? "Save changes" : "Create series"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. JEE Main 2026 — Full Syllabus Mock Series"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="Description" hint="Optional">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What this programme covers and who it is for."
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject" hint="Optional">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
              className={inputClass}
            />
          </Field>
          <Field label="Target exam" hint="Optional">
            <input
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              placeholder="e.g. JEE Main"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Class" hint="Optional">
          <select
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">Any class</option>
            {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
