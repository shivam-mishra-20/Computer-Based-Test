/**
 * Module and permission resolution — the decision layer, with no React and no
 * React Native in it.
 *
 * Kept separate so the rules that decide whether a tab exists and whether a
 * button is live can be tested without a simulator, a bundler or a device.
 * `scripts/verify.ts` in this package drives it directly, and each client's
 * own suite re-checks the rules it depends on.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE RULE THAT MATTERS: unknown is not denied
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Three states, and collapsing the third into the second is the single most
 * damaging mistake this layer can make:
 *
 *   ALLOWED    the org has the module / the user holds the permission
 *   DENIED     context resolved, and it does not include this
 *   UNKNOWN    no context at all — a pinned api-legacy deployment, a
 *              pre-migration database, a failed request, or — and this one is
 *              specific to mobile — a cold start with no connectivity
 *
 * UNKNOWN resolves to ALLOWED. On a phone that last case is not hypothetical:
 * an app that treated "I could not reach the server" as "you have no modules"
 * would show a returning user an empty shell every time they opened it on a
 * train. The same reasoning that protects an api-legacy deployment protects a
 * commuter.
 *
 *     A safe default for the NEW model is not a safe default for BEHAVIOUR.
 *     Absent context must mean "as before", never "nothing".
 *
 * ── Why permissive is not a security hole ───────────────────────────────────
 * Because this is not the security boundary. `requirePermission` on the server
 * fails CLOSED; a permission this client wrongly believes the user has buys
 * them a 403, not access. What this layer controls is whether the user is shown
 * a door they cannot open.
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
 * Anything that lets you change a resource lets you look at it, mirroring the
 * server's capability implication so a role granted `results.publish` is not
 * also required to carry `results.read` before the client shows the list.
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
 * A navigable thing — a tab, a card, an action — and what it needs.
 *
 * `anyPermission` rather than `permissions` for navigation on purpose: a
 * destination is worth showing if the user can do ANY of what lives inside it.
 */
export interface Gated {
  module?: string;
  anyPermission?: string[];
  /**
   * Roles this destination is for, when it is genuinely role-shaped rather
   * than permission-shaped. A student's "my results" and a teacher's "grade
   * attempts" are different screens behind similar permissions, and the app
   * decides which to show by role. Empty or absent means "any role".
   */
  roles?: string[];
}

export function gateDecision(
  ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined,
  gate: Gated | undefined,
  role?: string | null,
): AccessDecision {
  if (!gate) return 'allowed';

  // Role is known locally from the session, so an absent role is genuinely
  // absent rather than merely unresolved — it is checked first and strictly.
  if (gate.roles && gate.roles.length > 0) {
    if (!role || !gate.roles.includes(role)) return 'denied';
  }

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
  return moduleSide === 'unknown' || permissionSide === 'unknown' ? 'unknown' : 'allowed';
}

/** Convenience for tab construction: keep what is not denied. */
export function visible<T extends Gated>(
  ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined,
  items: T[],
  role?: string | null,
): T[] {
  return items.filter((item) => permits(gateDecision(ctx, item, role)));
}

/**
 * Is the organization allowed to write at all?
 *
 * `writable: false` is a suspended or past-due subscription — not the same as
 * lacking a permission, and presented differently: the role is fine, the
 * account is not.
 */
export function isWritable(
  ctx: Pick<TenantContextPayload, 'writable'> | null | undefined,
): boolean {
  return ctx?.writable !== false;
}
