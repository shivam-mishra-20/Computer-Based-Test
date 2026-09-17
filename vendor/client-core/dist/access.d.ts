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
export declare function moduleDecision(modules: string[] | undefined | null, key: string | undefined | null): AccessDecision;
/**
 * Does the user hold this permission?
 *
 * Anything that lets you change a resource lets you look at it, mirroring the
 * server's capability implication so a role granted `results.publish` is not
 * also required to carry `results.read` before the client shows the list.
 */
export declare function permissionDecision(permissions: string[] | undefined | null, permission: string | undefined | null): AccessDecision;
/** Every listed permission must resolve non-denied. */
export declare function permissionsDecision(permissions: string[] | undefined | null, required: string[] | undefined | null): AccessDecision;
/** UNKNOWN counts as permitted. See the header. */
export declare function permits(decision: AccessDecision): boolean;
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
export declare function gateDecision(ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined, gate: Gated | undefined, role?: string | null): AccessDecision;
/** Convenience for tab construction: keep what is not denied. */
export declare function visible<T extends Gated>(ctx: Pick<TenantContextPayload, 'modules' | 'permissions'> | null | undefined, items: T[], role?: string | null): T[];
/**
 * Is the organization allowed to write at all?
 *
 * `writable: false` is a suspended or past-due subscription — not the same as
 * lacking a permission, and presented differently: the role is fine, the
 * account is not.
 */
export declare function isWritable(ctx: Pick<TenantContextPayload, 'writable'> | null | undefined): boolean;
//# sourceMappingURL=access.d.ts.map