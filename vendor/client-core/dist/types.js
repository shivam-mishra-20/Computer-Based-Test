"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map