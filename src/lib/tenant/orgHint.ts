/**
 * Which organization is this browser talking to, before it has a token?
 *
 * ── The problem ─────────────────────────────────────────────────────────────
 * `GET /api/me/context` needs a token, and the token's `orgId` claim is what
 * tells the server which tenant a request belongs to. That covers everything
 * after login. It does not cover the login screen itself, which has to be
 * painted in the institute's colours before the credential exists.
 *
 * ── The rule this file exists to keep ───────────────────────────────────────
 * The hint is never compiled in. One build serves every organization; a
 * `NEXT_PUBLIC_ORG` baked at build time would quietly turn that into one build
 * per tenant, which is the thing this phase is meant to eliminate.
 *
 * So the hint is only ever LEARNED at runtime, from three runtime sources, in
 * descending authority:
 *
 *   1. `?org=<slug>` — explicit, and how the end-to-end suite drives two
 *      tenants through one deployment without DNS for either.
 *   2. the remembered slug from the last resolved context in this browser —
 *      which is what brands the login page on a return visit.
 *   3. nothing, and the server falls back to the request's Host, which is the
 *      production path and needs no client involvement at all.
 *
 * It is a ROUTING hint and grants nothing. The server treats it as a lookup
 * key, rejects it outright when it disagrees with a signed token, and
 * re-derives the organization from the claim on every authenticated request.
 */

const STORAGE_KEY = 'orgHint';

export function rememberOrgHint(slugOrId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (slugOrId) localStorage.setItem(STORAGE_KEY, String(slugOrId));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode storage refusal. The Host still resolves in production.
  }
}

export function getOrgHint(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('org');
    if (fromQuery && fromQuery.trim()) {
      // Persist it, so the hint survives the navigation away from the URL that
      // carried it — otherwise branding would vanish on the first click.
      rememberOrgHint(fromQuery.trim());
      return fromQuery.trim();
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Cleared on logout: the next person at this browser may be a different tenant. */
export function forgetOrgHint(): void {
  rememberOrgHint(null);
}
