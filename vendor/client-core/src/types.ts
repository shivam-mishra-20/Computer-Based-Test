/**
 * The shape of `GET /api/me/context` — the one call this app makes to learn
 * everything about the organization it is serving.
 *
 * Transcribed from what platform-core actually returns
 * (`src/routes/api/meContextRoutes.ts`), not from an aspiration.
 *
 * ── One definition, two clients ────────────────────────────────────────────
 * These types were duplicated in client-platform-web and client-platform-app.
 * They are a transcription of ONE server contract, so two copies is two things
 * that can drift from the same source — and the drift would be silent, because
 * a field renamed on the server fails at runtime in whichever client was not
 * updated.
 *
 * This package is the resolution. It carries ONLY what is genuinely shared:
 * the payload shapes, the access rules, and the colour mathematics. It contains
 * no React, no React Native, no navigation and no components, because those are
 * not shared — the web paints branding with CSS custom properties and the
 * mobile client builds a theme object, and pretending otherwise would produce a
 * package that neither could use without a shim.
 */

export interface TenantBranding {
  primaryColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  splashUrl?: string;
  splashBackgroundColor?: string;
  appName?: string;
  tagline?: string;
  emailFromName?: string;
}

export interface TenantLocale {
  timezone?: string;
  currency?: string;
  language?: string;
}

export interface TenantOrganization {
  id: string;
  name?: string;
  slug?: string;
  status?: string;
  branding?: TenantBranding;
  locale?: TenantLocale;
}

export interface ClassLevel {
  key: string;
  label: string;
  aliases?: string[];
  order?: number;
}

export interface OrgRoom {
  name: string;
  capacity: number;
}

export interface OrgBatch {
  name: string;
  classLevels: string[];
}

export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unattempted: number;
}

export interface ExamPolicy {
  markingScheme: MarkingScheme;
  submitLockPercent: number;
  defaultDurationMins: number;
  lateEntryMins: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  antiCheat: boolean;
  violationThreshold: number;
}

export interface GradingPolicy {
  passPercentage: number;
  gradeBands: { grade: string; minPercent: number }[];
}

export interface OrgPolicy {
  exam: ExamPolicy;
  grading: GradingPolicy;
  attendance: Record<string, unknown>;
  leave: Record<string, unknown>;
  batch: { mergeRules: { merge: string[]; into: string }[] };
  locale: Required<TenantLocale>;
  configured: string[];
}

export interface OrgConfiguration {
  classLevels?: ClassLevel[];
  subjects?: string[];
  rooms?: OrgRoom[];
  batches?: OrgBatch[];
  usingDefaults?: { classLevels: boolean; subjects: boolean; rooms: boolean };
  policy?: OrgPolicy;
}

export interface TenantUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  classLevel?: string;
  batch?: string;
}

export interface TenantContextPayload {
  organization: TenantOrganization | null;
  user: TenantUser | null;
  permissions: string[];
  permissionSource?: 'roles' | 'legacy-role' | 'none';
  roleNames?: string[];
  modules: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  configuration: OrgConfiguration;
  subscriptionStatus?: string;
  writable?: boolean;
  version: number;
}

/** `GET /api/org/branding` — everything a login screen may know pre-auth. */
export interface PublicBrandingPayload {
  organization: Pick<
    TenantOrganization,
    'id' | 'name' | 'slug' | 'status' | 'branding' | 'locale'
  > | null;
}
