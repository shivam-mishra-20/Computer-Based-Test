"use client";

/**
 * The tenant context provider — one fetch, and everything downstream knows
 * which organization it is serving.
 *
 * ── One endpoint, not five ──────────────────────────────────────────────────
 * `GET /api/me/context` returns organization, branding, modules, permissions,
 * limits, class levels, subjects, rooms, batches and policy in a single
 * payload with a single `version`. Assembling the same picture from five calls
 * guarantees a torn read eventually — modules from before a configuration
 * change, branding from after — and gives nothing to invalidate against.
 *
 * ── Behaviour when there is no context ──────────────────────────────────────
 * A pinned api-legacy deployment answers `organization: null`. That is not an
 * error and is not handled as one: `hasModule` and `can` both return true,
 * every fallback list stays in place, and the application behaves exactly as it
 * does today. See `access.ts` for why "unknown" must never collapse into
 * "denied".
 *
 * ── Why the payload is cached in sessionStorage ─────────────────────────────
 * Not for the request count — it is one request. For the FLASH. Without a cache
 * every navigation that remounts the provider paints the default palette and
 * the unfiltered menu for as long as the round trip takes, and the user watches
 * their institute's branding arrive late on every page. The cache is keyed by
 * token, so it cannot survive a change of user, and it is refreshed in the
 * background on every mount so a stale copy is never more than one paint old.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "../api";
import { applyBranding } from "./branding";
import { forgetOrgHint, rememberOrgHint } from "./orgHint";
import {
  gateDecision,
  isWritable,
  moduleDecision,
  permissionDecision,
  permits,
  type AccessDecision,
  type Gated,
} from "./access";
import type {
  ClassLevel,
  OrgBatch,
  OrgPolicy,
  OrgRoom,
  PublicBrandingPayload,
  TenantBranding,
  TenantContextPayload,
  TenantOrganization,
} from "./types";

const CACHE_PREFIX = "tenantContext:";

/** Fired by `login()` / `logout()` so the provider refetches without a reload. */
export const AUTH_CHANGED_EVENT = "tenant:auth-changed";

export interface TenantContextValue {
  /** Null until the first resolution completes, and on deployments with no tenancy. */
  context: TenantContextPayload | null;
  loading: boolean;
  error: string | null;
  /** Re-read `/api/me/context`. Call after anything that changes configuration. */
  refresh: () => Promise<void>;

  organizationName: string | null;
  /** Branding in force, from the context or — before login — from /api/org/branding. */
  branding: TenantBranding;
  /** True once a real organization has been resolved — as opposed to api-legacy. */
  isTenantResolved: boolean;

  hasModule: (key: string) => boolean;
  moduleState: (key: string) => AccessDecision;
  can: (permission: string) => boolean;
  permissionState: (permission: string) => AccessDecision;
  gate: (gate: Gated | undefined) => AccessDecision;
  allows: (gate: Gated | undefined) => boolean;
  /** False only when a subscription is suspended or past due. */
  writable: boolean;

  classLevels: ClassLevel[] | null;
  subjects: string[] | null;
  rooms: OrgRoom[] | null;
  batches: OrgBatch[] | null;
  policy: OrgPolicy | null;
  locale: { timezone: string; currency: string; language: string };
}

const TenantCtx = createContext<TenantContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("accessToken");
    if (!raw || raw === "null" || raw === "undefined" || !raw.trim()) return null;
    return raw;
  } catch {
    return null;
  }
}

/** A short, stable key for a token — the whole JWT is long and needless here. */
function cacheKey(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) | 0;
  return `${CACHE_PREFIX}${hash}`;
}

function readCache(token: string): TenantContextPayload | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(token));
    return raw ? (JSON.parse(raw) as TenantContextPayload) : null;
  } catch {
    return null;
  }
}

function writeCache(token: string, payload: TenantContextPayload): void {
  try {
    // Only this token's entry survives: a stale entry for a previous user is
    // exactly the copy that must never be read.
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(CACHE_PREFIX) && key !== cacheKey(token)) sessionStorage.removeItem(key);
    }
    sessionStorage.setItem(cacheKey(token), JSON.stringify(payload));
  } catch {
    // Quota or private mode — the provider simply refetches.
  }
}

function clearCache(): void {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

const DEFAULT_LOCALE = { timezone: "Asia/Kolkata", currency: "INR", language: "English" };

/**
 * Where the provider has got to, published on `documentElement`.
 *
 *   loading    no answer yet — gates are UNKNOWN and therefore permissive
 *   resolved   a real organization; modules and permissions are authoritative
 *   legacy     the server answered, and there is no organization (api-legacy)
 *
 * It exists because "the menu has rendered" and "the menu has been filtered"
 * are different moments, and anything that reads the navigation before the
 * second one — a test, a screenshot, an animation — sees the unfiltered list
 * and draws the wrong conclusion. Publishing the state makes the difference
 * observable instead of a race to be slept through.
 */
type TenantState = "loading" | "resolved" | "legacy";

function publishState(state: TenantState): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-tenant-state", state);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<TenantContextPayload | null>(null);
  // The pre-authentication organization, from `/api/org/branding`. Held apart
  // from `context` on purpose: it carries name, branding and locale and NOTHING
  // else, so a consumer that reads `context.permissions` can never accidentally
  // be reading a payload that has no permissions in it because nobody has
  // logged in yet.
  const [publicOrg, setPublicOrg] = useState<TenantOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authTick, setAuthTick] = useState(0);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = readToken();

    if (!token) {
      publishState("loading");
      // ── Pre-authentication ───────────────────────────────────────────────
      // No context to resolve, but a login screen still deserves its
      // institute's colours. `/api/org/branding` is the only thing readable
      // without a credential, and it answers `null` whenever the organization
      // cannot be determined — which is the ordinary case on api-legacy.
      clearCache();
      setContext(null);
      try {
        const res = (await apiFetch("/org/branding")) as PublicBrandingPayload;
        const org = (res?.organization ?? null) as TenantOrganization | null;
        setPublicOrg(org);
        applyBranding(org?.branding, org?.name);
        if (org?.slug) rememberOrgHint(org.slug);
        publishState(org ? "resolved" : "legacy");
      } catch {
        setPublicOrg(null);
        applyBranding(null);
        publishState("legacy");
      } finally {
        setLoading(false);
      }
      return;
    }

    publishState("loading");
    const cached = readCache(token);
    if (cached) {
      // Painted immediately to avoid a flash, but the state stays "loading"
      // until the network answers: a cached copy is a good guess, not an
      // authority, and anything waiting for the real answer should keep waiting.
      setContext(cached);
      applyBranding(cached.organization?.branding, cached.organization?.name);
      setLoading(false);
    }

    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const payload = (await apiFetch("/me/context")) as TenantContextPayload;
      setContext(payload);
      setPublicOrg(null);
      setError(null);
      writeCache(token, payload);
      applyBranding(payload.organization?.branding, payload.organization?.name);
      publishState(payload.organization?.id ? "resolved" : "legacy");
      // Remembered so the NEXT visit's login screen is branded before anyone
      // has typed anything.
      if (payload.organization?.slug) rememberOrgHint(payload.organization.slug);
    } catch (e) {
      // A failed context load must not break the application. Without a payload
      // every gate reads UNKNOWN and therefore permits, which is precisely the
      // pre-tenancy behaviour.
      setError(e instanceof Error ? e.message : "Failed to load organization context");
      if (!cached) applyBranding(null);
      // A failed load is indistinguishable from api-legacy as far as the gates
      // are concerned: nothing is known, so nothing is denied.
      publishState("legacy");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, authTick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setAuthTick((n) => n + 1);
    // Same tab: dispatched by login()/logout(). Other tabs: the storage event.
    window.addEventListener(AUTH_CHANGED_EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "accessToken") bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<TenantContextValue>(() => {
    const configuration = context?.configuration ?? {};
    // The authenticated organization when there is one, the pre-auth one
    // otherwise. Never both — a token replaces the public payload entirely.
    const org = context?.organization ?? publicOrg;
    const localeSource = org?.locale ?? configuration.policy?.locale ?? {};

    return {
      context,
      loading,
      error,
      refresh: load,

      organizationName: org?.branding?.appName || org?.name || null,
      branding: org?.branding ?? {},
      isTenantResolved: Boolean(org?.id),

      moduleState: (key) => moduleDecision(context?.modules, key),
      hasModule: (key) => permits(moduleDecision(context?.modules, key)),
      permissionState: (permission) => permissionDecision(context?.permissions, permission),
      can: (permission) => permits(permissionDecision(context?.permissions, permission)),
      gate: (g) => gateDecision(context, g),
      allows: (g) => permits(gateDecision(context, g)),
      writable: isWritable(context),

      // `null`, not `[]`, when unresolved. A consumer has to be able to tell
      // "this organization has no rooms" from "nobody has told me yet", because
      // only the second one may fall back to a built-in list.
      classLevels: configuration.classLevels?.length ? configuration.classLevels : null,
      subjects: configuration.subjects?.length ? configuration.subjects : null,
      rooms: configuration.rooms?.length ? configuration.rooms : null,
      batches: configuration.batches?.length ? configuration.batches : null,
      policy: configuration.policy ?? null,
      locale: {
        timezone: localeSource.timezone || DEFAULT_LOCALE.timezone,
        currency: localeSource.currency || DEFAULT_LOCALE.currency,
        language: localeSource.language || DEFAULT_LOCALE.language,
      },
    };
  }, [context, publicOrg, loading, error, load]);

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

/**
 * The hook every consumer uses.
 *
 * Returns a permissive, unbranded value when used outside the provider rather
 * than throwing. A thrown error here would take down whichever screen forgot
 * the provider, and the correct behaviour for "no tenant information" is
 * already "behave as before" — so that is what it does.
 */
export function useTenant(): TenantContextValue {
  const value = useContext(TenantCtx);
  if (value) return value;
  return {
    context: null,
    loading: false,
    error: null,
    refresh: async () => {},
    organizationName: null,
    branding: {},
    isTenantResolved: false,
    moduleState: () => "unknown",
    hasModule: () => true,
    permissionState: () => "unknown",
    can: () => true,
    gate: () => "unknown",
    allows: () => true,
    writable: true,
    classLevels: null,
    subjects: null,
    rooms: null,
    batches: null,
    policy: null,
    locale: DEFAULT_LOCALE,
  };
}

/** Class levels for this organization, or the caller's legacy list when unknown. */
export function useClassLevels(fallback: ClassLevel[]): ClassLevel[] {
  const { classLevels } = useTenant();
  return classLevels ?? fallback;
}

/** Class VALUES only, for the many pickers that deal in bare strings. */
export function useClassValues(fallback: string[]): string[] {
  const { classLevels } = useTenant();
  return classLevels ? classLevels.map((c) => c.key) : fallback;
}

export function useSubjects(fallback: string[]): string[] {
  const { subjects } = useTenant();
  return subjects ?? fallback;
}

export function useRooms(fallback: OrgRoom[]): OrgRoom[] {
  const { rooms } = useTenant();
  return rooms ?? fallback;
}

export function useBatchNames(fallback: string[] = []): string[] {
  const { batches } = useTenant();
  return batches ? batches.map((b) => b.name) : fallback;
}

/** Signal a login or logout so the provider refetches. */
export function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  clearCache();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** Called on logout: the next person here may belong to another organization. */
export function resetTenantState(): void {
  clearCache();
  forgetOrgHint();
  applyBranding(null);
  notifyAuthChanged();
}
