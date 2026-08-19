/**
 * Re-exported from `@platform/client-core`.
 *
 * These types were duplicated here and in client-platform-app. They transcribe
 * ONE server contract, so two copies meant two things that could drift from the
 * same source — silently, because a field renamed on the server fails at
 * runtime only in whichever client was not updated.
 *
 * Kept as a re-export rather than rewriting every import: the paths that
 * already say `lib/tenant/types` are correct about WHERE these belong, and only
 * wrong about who owns them.
 */

export type {
  TenantBranding,
  TenantLocale,
  TenantOrganization,
  ClassLevel,
  OrgRoom,
  OrgBatch,
  MarkingScheme,
  ExamPolicy,
  GradingPolicy,
  OrgPolicy,
  OrgConfiguration,
  TenantUser,
  TenantContextPayload,
  PublicBrandingPayload,
} from '@platform/client-core';
