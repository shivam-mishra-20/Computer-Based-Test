export type ExamStatus = "draft" | "scheduled" | "live" | "completed";

const STYLES: Record<ExamStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-amber-50 text-amber-700 border border-amber-200",
  live: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  completed: "bg-slate-100 text-slate-500",
};

const LABELS: Record<ExamStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
};

// Server-derived (Exam.status from cbt-exam-be's deriveExamStatus) — never
// re-computed client-side, so this always agrees with what the backend
// actually enforces for start-window access.
export default function ExamStatusBadge({ status }: { status: ExamStatus | string }) {
  const s = (STYLES[status as ExamStatus] && status) as ExamStatus | undefined;
  const key = s || "draft";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[key]}`}>
      {LABELS[key]}
    </span>
  );
}
