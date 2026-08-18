/**
 * What each part of the application needs, in one table.
 *
 * ── Why a registry and not gates scattered through components ───────────────
 * Every navigation entry, tab and admin section is gated on a module and a
 * permission. Written inline, those two facts would be spread across a dozen
 * files, and the answer to "what does a Front Desk role actually see?" would
 * only be discoverable by reading all of them. Here it is one file that can be
 * read in a sitting and asserted against in a test.
 *
 * ── Two deliberate rules ────────────────────────────────────────────────────
 *
 * 1. A missing `module` means "no module governs this". Several screens —
 *    leaves, EOD reports — have permissions in the vocabulary but no
 *    corresponding module in the registry. Inventing a plausible-looking module
 *    key would produce a gate that never matches anything the server issues,
 *    which fails silently and hides the screen forever. Gating on the
 *    permission alone is the honest encoding of what actually exists.
 *
 * 2. `anyPermission`, not `allPermissions`. A section is worth showing if the
 *    user can do ANY of what lives inside it. Requiring all of them would hide
 *    Operations from someone who can mark attendance but cannot approve leave.
 *
 * The permission strings are the server's closed vocabulary
 * (`core/rbac/permissions.ts`, 71 of them) and the module keys are the server's
 * registry (`core/entitlements/moduleRegistry.ts`, 34 of them). Neither is
 * invented here; a typo becomes a permanently hidden screen, so both lists are
 * checked against the live server by `scripts/tenant-access.test.ts`.
 */

import type { Gated } from "./access";

export interface NavGate extends Gated {
  /** Matches the `href` of the navigation entry this gate governs. */
  href: string;
}

/** Admin top-navigation. */
export const ADMIN_NAV_GATES: NavGate[] = [
  { href: "/dashboard/admin", module: undefined },
  { href: "/dashboard/admin?tab=users", module: "users", anyPermission: ["users.read"] },
  { href: "/dashboard/admin?tab=exams", module: "exams", anyPermission: ["exams.read"] },
  {
    href: "/dashboard/admin?tab=questions",
    module: "questionBank",
    anyPermission: ["questions.read"],
  },
  {
    href: "/dashboard/admin?tab=create-paper",
    module: "questionBank",
    anyPermission: ["questions.create"],
  },
  { href: "/dashboard/admin?tab=papers", module: "questionBank", anyPermission: ["questions.read"] },
  {
    href: "/dashboard/admin?tab=smart-import",
    module: "questionImport",
    anyPermission: ["questions.import"],
  },
];

/** Teacher top-navigation. */
export const TEACHER_NAV_GATES: NavGate[] = [
  { href: "/dashboard/teacher" },
  {
    href: "/dashboard/teacher?tab=create-paper",
    module: "questionBank",
    anyPermission: ["questions.create"],
  },
  { href: "/dashboard/teacher?tab=exams", module: "exams", anyPermission: ["exams.read"] },
  { href: "/dashboard/teacher?tab=ai", module: "ai", anyPermission: ["ai.generate"] },
  {
    href: "/dashboard/teacher?tab=papers",
    module: "questionBank",
    anyPermission: ["questions.read"],
  },
  {
    href: "/dashboard/teacher?tab=import",
    module: "questionImport",
    anyPermission: ["questions.import"],
  },
  {
    href: "/dashboard/teacher/reviews",
    module: "evaluation",
    anyPermission: ["attempts.grade", "results.override"],
  },
];

/**
 * Student top-navigation.
 *
 * Gated on the student's OWN records rather than on the analytics module:
 * a student looking at their own progress is `attempts.read`, and requiring
 * `analytics.read` — which no student role holds — would hide the tab from
 * every student in every organization.
 */
export const STUDENT_NAV_GATES: NavGate[] = [
  { href: "/dashboard/student?tab=exams", module: "cbt", anyPermission: ["exams.read"] },
  { href: "/dashboard/student?tab=progress", module: "results", anyPermission: ["attempts.read"] },
  { href: "/dashboard/student?tab=practice", module: "cbt", anyPermission: ["exams.read"] },
  { href: "/dashboard/student?tab=results", module: "results", anyPermission: ["results.read"] },
];

/** The app-management sidebar, keyed by the same `href` its entries carry. */
export const APP_MANAGEMENT_GATES: NavGate[] = [
  { href: "/dashboard/admin/app-management" },

  {
    href: "/dashboard/admin/app-management/users",
    module: "users",
    anyPermission: ["users.read", "students.read", "teachers.read"],
  },
  {
    href: "/dashboard/admin/app-management/registrations",
    module: "users",
    anyPermission: ["users.create", "students.create"],
  },

  {
    href: "/dashboard/admin/app-management/courses",
    module: "courses",
    anyPermission: ["courses.read"],
  },
  {
    href: "/dashboard/admin/app-management/batches",
    module: "classes",
    anyPermission: ["batches.read", "classes.read"],
  },
  {
    href: "/dashboard/admin/app-management/resources",
    module: "materials",
    anyPermission: ["materials.read"],
  },

  {
    href: "/dashboard/admin/app-management/public-tests",
    module: "exams",
    anyPermission: ["exams.read"],
  },

  {
    href: "/dashboard/admin/app-management/attendance",
    module: "attendance",
    anyPermission: ["attendance.read"],
  },
  {
    href: "/dashboard/admin/app-management/schedule",
    module: "scheduling",
    anyPermission: ["schedule.read"],
  },
  // No `leaves` module exists in the registry — permission only. See rule 1.
  { href: "/dashboard/admin/app-management/leaves", anyPermission: ["leaves.read"] },
  {
    href: "/dashboard/admin/app-management/holidays",
    module: "scheduling",
    anyPermission: ["schedule.read"],
  },
  // Likewise: EOD reporting has no module of its own.
  { href: "/dashboard/admin/app-management/eod", anyPermission: ["reports.read"] },

  {
    href: "/dashboard/admin/app-management/sync",
    module: "integrations",
    anyPermission: ["org.integrations"],
  },
];

const BY_HREF = new Map<string, NavGate>(
  [...ADMIN_NAV_GATES, ...TEACHER_NAV_GATES, ...STUDENT_NAV_GATES, ...APP_MANAGEMENT_GATES].map(
    (gate) => [gate.href, gate],
  ),
);

/** The gate for a navigation href, or undefined when nothing governs it. */
export function gateForHref(href: string): Gated | undefined {
  const found = BY_HREF.get(href);
  if (!found) return undefined;
  return { module: found.module, anyPermission: found.anyPermission };
}

/**
 * Feature gates used by components rather than by navigation.
 *
 * Named rather than inlined for the same reason as the nav table: so the set of
 * things that can be switched off is enumerable.
 */
export const FEATURE_GATES = {
  aiGeneration: { module: "ai", anyPermission: ["ai.generate"] },
  smartImport: { module: "questionImport", anyPermission: ["questions.import"] },
  roomAllocation: { module: "scheduling", anyPermission: ["rooms.read"] },
  examPublish: { module: "exams", anyPermission: ["exams.publish"] },
  resultPublish: { module: "results", anyPermission: ["results.publish"] },
  resultOverride: { module: "evaluation", anyPermission: ["results.override"] },
  offlineTests: { module: "offlineTests", anyPermission: ["results.read"] },
  rankings: { module: "rankings", anyPermission: ["results.read"] },
  analytics: { module: "analytics", anyPermission: ["analytics.read"] },
  branding: { module: "whiteLabel", anyPermission: ["org.branding"] },
  batchManagement: { module: "classes", anyPermission: ["batches.manage"] },
  userManagement: { module: "users", anyPermission: ["users.create", "users.update"] },
} as const satisfies Record<string, Gated>;

export type FeatureKey = keyof typeof FEATURE_GATES;
