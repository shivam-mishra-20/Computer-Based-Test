/**
 * The rules that decide whether an organization can become a mobile app.
 *
 * ── THIS FILE IS A MIRROR ───────────────────────────────────────────────────
 * The source of truth is `central-be/src/core/platform/mobileBuildRules.ts`.
 * Everything below the header is a byte-for-byte copy of that file, and
 * `npm run safety:mobile-rules` in central-be fails if the two ever differ.
 * Edit either one and copy it across; do not let them drift.
 *
 * ── Why a mirror and not a shared import ────────────────────────────────────
 * Two places need to answer "is this configuration buildable":
 *
 *   · `client-platform-app/config/resolve.js`, at BUILD time, where the answer
 *     decides whether `expo prebuild` produces a binary at all;
 *   · `central-be`, when the console asks whether an organization is ready,
 *     and when it generates that organization's build configuration.
 *
 * If those two disagree, the console reports READY for a build that then fails
 * — or worse, refuses one that would have succeeded, and somebody edits the
 * configuration until the console is happy and the app is wrong. The failure
 * is silent in both directions.
 *
 * The backend imported this package briefly, and that broke its production
 * container: this is a SIBLING GIT REPOSITORY, so `file:../platform-client-core`
 * resolves on a developer's machine and in no container, and the backend's
 * `esbuild --packages=external` deferred the failure to `node dist/server.js`.
 * A server must be installable from its own checkout alone, so it keeps its own
 * copy and the drift check holds the guarantee the import used to.
 *
 * The clients genuinely need it HERE — `config/resolve.js` runs inside the Expo
 * config loader, with no network and no server to ask.
 *
 * What does NOT live here is anything environmental: file existence needs `fs`
 * and a checkout, and the server has neither. That check stays in the app,
 * alongside the native-project guard, and the server checks that an asset URL
 * is RECORDED rather than that a file is present.
 *
 * No Node APIs, no React, no fetch — this module has to load in the Expo
 * config loader, in Express, and in a plain `tsc` test run.
 */
/** Reverse-DNS, at least two segments, lowercase. What both stores accept. */
export declare const PACKAGE_PATTERN: RegExp;
/** A URL scheme the OS will route: a letter, then letters/digits/+/-/. */
export declare const SCHEME_PATTERN: RegExp;
export declare const HEX_COLOR_PATTERN: RegExp;
/**
 * Hosts that resolve to the machine running the code.
 *
 * `10.0.2.2` is included because it is the Android emulator's alias for its
 * host — correct in development, meaningless on a real device.
 */
export declare const LOOPBACK_PATTERN: RegExp;
/** A kebab-case organization slug. */
export declare const SLUG_PATTERN: RegExp;
/**
 * Marks a value that is deliberately not real yet.
 *
 * An organization id is minted at provisioning, so it genuinely cannot be
 * known while an institute is being set up. `pending:` says "not real on
 * purpose": development builds accept it, anything that ships refuses it.
 */
export declare const PENDING_PREFIX = "pending:";
export declare function isPendingValue(value: string | null | undefined): boolean;
export declare function isValidPackageId(value: string | null | undefined): boolean;
export declare function isValidScheme(value: string | null | undefined): boolean;
export declare function isValidHexColor(value: string | null | undefined): boolean;
export declare function isValidSlug(value: string | null | undefined): boolean;
/** The host part of a URL, or '' when there is not one. */
export declare function hostOfUrl(url: string): string;
export declare function isLoopbackHost(host: string): boolean;
/**
 * A URL-safe slug from an institute's name.
 *
 * Shared so the console's preview, the backend's derivation and the app's
 * registry key cannot produce three different answers for one name.
 */
export declare function slugifyOrgName(name: string): string;
/** How strictly a configuration is judged. */
export type MobileBuildProfile = 'development' | 'preview' | 'production';
export interface MobileBuildIssue {
    field: string;
    message: string;
}
/**
 * Everything the rules below look at.
 *
 * Deliberately flat and free of both sides' internal shapes: the app builds it
 * from `config/organizations/<slug>.js`, the server from an `Org` document,
 * and neither has to know the other's structure.
 */
export interface MobileBuildIdentity {
    orgId?: string | null;
    slug?: string | null;
    appName?: string | null;
    tagline?: string | null;
    androidPackage?: string | null;
    iosBundleId?: string | null;
    scheme?: string | null;
    apiBaseUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    /**
     * Whether the five bundled assets are accounted for. The app proves this by
     * reading the disk; the server proves it by having URLs recorded. Passed in
     * rather than computed, because only the caller knows which it can check.
     */
    assetsPresent?: boolean;
    /** What is missing, for the message. Ignored when `assetsPresent`. */
    missingAssets?: string[];
}
/**
 * Every field-level reason this configuration could not build.
 *
 * Returns a list rather than the first failure: somebody finalizing an
 * organization should see all six missing values at once, not discover them
 * one save at a time.
 */
export declare function validateMobileIdentity(input: MobileBuildIdentity, profile?: MobileBuildProfile): MobileBuildIssue[];
/**
 * `NOT_CONFIGURED` — nothing has been entered; nobody has started.
 * `INCOMPLETE`     — started, but something required is missing or invalid.
 * `READY`          — every rule above passes for the given profile.
 */
export type MobileBuildStatus = 'NOT_CONFIGURED' | 'INCOMPLETE' | 'READY';
/**
 * The status, derived from the same issues a build would raise.
 *
 * `NOT_CONFIGURED` is distinguished from `INCOMPLETE` on purpose: "nobody has
 * touched this yet" and "somebody tried and it is wrong" are different pieces
 * of operational news, and a queue that shows them identically hides the
 * second.
 */
export declare function mobileBuildStatus(input: MobileBuildIdentity, issues: MobileBuildIssue[]): MobileBuildStatus;
export interface MobileBuildMismatch {
    field: string;
    /** What the organization record says. */
    expected: string;
    /** What the build configuration says. */
    actual: string;
}
/** The fields whose disagreement changes what the built app is or does. */
export declare const RECONCILED_FIELDS: (keyof MobileBuildIdentity)[];
/**
 * Where the organization record and a build configuration disagree.
 *
 * The comparison is deliberately narrow: it covers what ends up baked into a
 * binary or shown before sign-in, and nothing else. A field absent from BOTH
 * sides is not a mismatch — it is a gap the validator already reports, and
 * counting it twice would make an unconfigured organization look like a
 * conflict.
 */
export declare function reconcileMobileBuild(organization: MobileBuildIdentity, build: MobileBuildIdentity): MobileBuildMismatch[];
//# sourceMappingURL=mobileBuild.d.ts.map