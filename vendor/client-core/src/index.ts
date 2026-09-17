/**
 * `@platform/client-core` — the tenant contract both clients share.
 *
 * ── Scope, stated as a rule ─────────────────────────────────────────────────
 * Something belongs here only if BOTH clients would otherwise implement it
 * identically AND getting it different would be a defect. That is three things:
 *
 *   types    the shape of `/api/me/context`, transcribed from the server
 *   access   whether a module/permission/role permits something
 *   color    the branding arithmetic — validity, contrast, shading
 *   mobile   whether an organization's configuration can become an app —
 *            shared with central-be, which reports readiness, and with
 *            client-platform-app, which refuses the build
 *
 * Everything else stays in the clients, because it genuinely differs:
 * navigation registries, guard components, theme assembly, storage, and every
 * line of UI. A shared package that reached into those would be a framework,
 * and each client would spend more code working around it than it saved.
 *
 * No React. No React Native. No DOM. Importing this must not pull a renderer
 * into anything — the server-side tests, and the pure-logic suites in both
 * clients, all import it directly.
 */

export * from './types';
export * from './access';
export * from './color';
export * from './mobileBuild';
