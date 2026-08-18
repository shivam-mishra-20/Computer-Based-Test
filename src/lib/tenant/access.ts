/**
 * Module and permission resolution — the decision layer, with no React in it.
 *
 * Kept separate from `context.tsx` on purpose: these are the rules that decide
 * whether a menu entry exists and whether a button is live, and they need to be
 * testable without a browser, a DOM, or a running server. `scripts/tenant-access.test.ts`
 * drives this file directly.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE RULE THAT MATTERS: unknown is not denied
 * ══════════════════════════════════════════════════════════════════════════
 *
 * There are three states, and collapsing the third into the second is the
 * single most damaging mistake this layer can make:
 *
 *   ALLOWED    the org has the module / the user holds the permission
 *   DENIED     context resolved, and it does not include this
 *   UNKNOWN    no context at all — api-legacy (pinned, no orgId claim), a
 *              pre-migration database, an offline client, a failed request
 *
 * UNKNOWN resolves to ALLOWED here. Every Abhigyan user today is UNKNOWN: their
 * deployment is pinned, `/api/me/context` answers `organization: null`, and the
 * arrays come back empty. Treating empty as "no modules, no permissions" would
 * present them a blank application on the day this shipped — an outage produced
 * by a default chosen to look safe.
 *
 * This is the same lesson the server side has now learned five times over, in
 * the defaulted cron disable, the defaulted-pinned 503, the no-subscription
 * entitlement, and the empty configuration:
 *
 *     A safe default for the NEW model is not a safe default for BEHAVIOUR.
 *     Absent context must mean "as before", never "nothing".
 *
 * ── Why permissive is not a security hole ───────────────────────────────────
 * Because this is not the security boundary and never was. `requirePermission`
 * on the server fails CLOSED; a permission this client wrongly believes the
 * user has buys them a 403, not access. What this layer controls is whether the
 * user is shown a door they cannot open. Hiding it is a courtesy; the lock is
 * elsewhere. That asymmetry — client permissive, server strict — is deliberate
 * and mirrors `requireModule` (fails open) against `requirePermission` (fails
 * closed) on the other side of the wire.
 */

import type { TenantContextPayload } from './types';

export type AccessDecision = 'allowed' | 'denied' | 'unknown';

/**
 * Does the organization have this module?
 *
 * An empty module list means the server told us nothing — an unsubscribed
 * organization resolves to EVERY module server-side, so an empty array is never
 * a legitimate "none".
 */
export function moduleDecision(
  modules: string[] | undefined | null,
  key: string | undefined | null,
): AccessDecision {
  if (!key) return 'allowed';
  if (!modules || modules.length === 0) return 'unknown';
  return modules.includes(key) ? 'allowed' : 'denied';
}

/**
 * Does the user hold this permission?
 *
 * `x.manage` implies `x.read`, mirroring the server's capability implication so
 * a role granted `classes.manage` is not also required to carry `classes.read`
 * before the client will show the list it can edit.
 */
export function permissionDecision(
  permissions: string[] | undefined | null,
  permission: string | undefined | null,
): AccessDecision {
  if (!permission) return 'allowed';
  if (!permissions || permissions.length === 0) return 'unknown';
  if (permissions.includes(permission)) return 'allowed';

  const [resource, action] = permission.split('.');
  if (action === 'read' && resource) {
    // Anything that lets you change a resource lets you look at it. `manage` is
    // the common form; create/update/delete are the granular ones.
    const implying = ['manage', 'create', 'update', 'delete', 'publish', 'grade', 'respond'];
    if (implying.some((verb) => permissions.includes(`${resource}.${verb}`))) return 'allowed';
  }
  return 'denied';
}

/** Every listed permission must resolve non-denied. */
export function permissionsDecision(
  permissions: string[] | undefined | null,
  required: string[] | undefined | null,
): AccessDecision {
  if (!required || required.length === 0) return 'allowed';
  const decisions = required.map((p) => permissionDecision(permissions, p));
  if (decisions.some((d) => d === 'denied')) return 'denied';
  if (decisions.some((d) => d === 'unknown')) return 'unknown';
  return 'allowed';
}

/** UNKNOWN counts as permitted. See the header. */
export function permits(decision: AccessDecision): boolean {
  return decision !== 'denied';
}

/**
 * A navigable thing — a menu entry, a tab, a route — and what it needs.
 *
 * `anyPermission` rather than `permissions` for navigation on purpose: a
 * section is worth showing if the user can do ANY of what lives inside it.
 * Requiring all of them would hide Operations from someone who can mark
 * attendance but not approve leave.
 */
export interface Gated {
  module?: string;
  anyPermission?: string[];
}

export function gateDecision(
  ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined,
  gate: Gated | undefined,
): AccessDecision {
  if (!gate) return 'allowed';

  const moduleSide = moduleDecision(ctx?.modules, gate.module);
  if (moduleSide === 'denied') return 'denied';

  if (!gate.anyPermission || gate.anyPermission.length === 0) return moduleSide;

  const decisions = gate.anyPermission.map((p) => permissionDecision(ctx?.permissions, p));
  const permissionSide: AccessDecision = decisions.includes('allowed')
    ? 'allowed'
    : decisions.includes('unknown')
      ? 'unknown'
      : 'denied';

  if (permissionSide === 'denied') return 'denied';
  // Both sides must be known before the result is known.
  return moduleSide === 'unknown' || permissionSide === 'unknown' ? 'unknown' : 'allowed';
}

/** Convenience for menu construction: keep what is not denied. */
export function visible<T extends Gated>(
  ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined,
  items: T[],
): T[] {
  return items.filter((item) => permits(gateDecision(ctx, item)));
}

/**
 * Is the organization allowed to write at all?
 *
 * `writable: false` is a suspended or past-due subscription. It is not the same
 * as lacking a permission, and it is presented differently: the user's role is
 * fine, the account is not. Absent (undefined) is UNKNOWN and therefore
 * writable, for the same reason as everything else in this file.
 */
export function isWritable(ctx: Pick<TenantContextPayload, 'writable'> | null | undefined): boolean {
  return ctx?.writable !== false;
}
