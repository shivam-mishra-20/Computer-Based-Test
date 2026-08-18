/**
 * The shape of `GET /api/me/context` — the one call this client makes to learn
 * everything about the organization it is currently serving.
 *
 * These types are a transcription of what the server actually returns
 * (`src/routes/api/meContextRoutes.ts` in platform-core), not an aspiration.
 * Every field is optional at the edges because a pinned api-legacy deployment
 * answers with nulls and empty objects, and that answer is legitimate — see
 * `context.tsx` for why "unknown" and "denied" must never be conflated.
 */

export interface TenantBranding {
  primaryColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  splashUrl?: string;
  appName?: string;
  emailFromName?: string;
  tagline?: string;
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

export interface TenantContextPayload {
  organization: TenantOrganization | null;
  user: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    classLevel?: string;
    batch?: string;
  } | null;
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
  organization: Pick<TenantOrganization, 'id' | 'name' | 'slug' | 'status' | 'branding' | 'locale'> | null;
}
