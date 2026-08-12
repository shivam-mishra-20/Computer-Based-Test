"use client";
import Protected from "@/components/Protected";
import PublicTests from "@/components/admin/PublicTests";

/**
 * Public tests and test series, inside App Management.
 *
 * ── Why this route exists as well as the dashboard tab ───────────────────────
 * The same surface is reachable at /dashboard/admin?tab=public-tests. This is
 * not a duplicate feature — it is the same component mounted where people
 * actually look for it.
 *
 * App Management is the section for everything the PUBLIC-FACING app serves:
 * Courses, Resources, Registrations. Public test series belong to exactly that
 * audience — learners who are not enrolled at Abhigyan Gurukul — so an admin
 * hunting for them starts here, not on the exam-and-question-bank dashboard.
 *
 * ── Access ───────────────────────────────────────────────────────────────────
 * `Protected` requires a session. The admin/teacher gate is enforced by the
 * backend router (`requireRole('admin','teacher')` on /api/admin-assessments),
 * which is where it has to hold regardless of which route reached the UI.
 */
export default function AppManagementPublicTestsPage() {
  return (
    <Protected>
      <PublicTests />
    </Protected>
  );
}
