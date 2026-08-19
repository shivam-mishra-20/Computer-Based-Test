/**
 * Runtime branding — one organization's colours, name, logo and favicon applied
 * to a build that contains none of them.
 *
 * ── Why CSS custom properties and not a theme prop ──────────────────────────
 * The application is several hundred components deep and almost none of them
 * take a colour. Threading a theme object through would be a rewrite, and the
 * brief for this phase is explicitly not to rewrite. Custom properties reach
 * every descendant without any component knowing branding exists, and they can
 * be set once, on `documentElement`, from a single effect.
 *
 * ── Defaults are the existing palette, exactly ──────────────────────────────
 * Every token falls back to the value `globals.css` already ships. An
 * organization with no branding, or a deployment with no organization at all,
 * renders pixel-identically to today. Branding applies when someone configures
 * it, never as a side effect of this code existing.
 *
 * ── Derived tokens ──────────────────────────────────────────────────────────
 * An institute configures two or three colours, not eleven. The rest — hover
 * states, tints, the text colour that sits on the primary — are derived, so a
 * tenant cannot produce white-on-yellow by filling in a form. `readableOn()`
 * picks the foreground by relative luminance rather than by a brightness
 * guess, because the guess fails on saturated blues.
 */

import type { TenantBranding } from './types';

/** The palette `globals.css` defines. Kept here so a reset restores it exactly. */
export const DEFAULT_BRAND = {
  primary: '#A3B18A', // --sage-green
  cta: '#588157', // --moss-green
  accent: '#344E41', // --dark-olive
  surface: '#DAD7CD', // --beige-sand
  background: '#FAFAFA', // --bg-whitesmoke
} as const;

// Shared with client-platform-app. Validity, luminance, contrast-based
// foreground choice and shading must agree between the two clients, or the same
// institute is legible on one and not the other. Only the MATHS is shared — the
// output differs, because this writes CSS custom properties and the mobile
// client builds a theme object.
export { normalizeHex, luminance, readableOn, shade } from '@platform/client-core';
import { normalizeHex, readableOn, shade, rgbTriplet } from '@platform/client-core';

export interface BrandTokens {
  [cssVariable: string]: string;
}

/**
 * The complete token set for a branding configuration.
 *
 * Pure, so it can be asserted on directly without a DOM.
 */
export function brandTokens(branding: TenantBranding | null | undefined): BrandTokens {
  const primary = normalizeHex(branding?.primaryColor) ?? DEFAULT_BRAND.primary;
  const accent = normalizeHex(branding?.accentColor) ?? DEFAULT_BRAND.accent;
  const secondary = normalizeHex(branding?.secondaryColor) ?? DEFAULT_BRAND.cta;

  return {
    '--brand-primary': primary,
    '--brand-primary-rgb': rgbTriplet(primary),
    '--brand-primary-hover': shade(primary, -0.15),
    '--brand-primary-soft': shade(primary, 0.85),
    '--brand-on-primary': readableOn(primary),

    '--brand-secondary': secondary,
    '--brand-secondary-rgb': rgbTriplet(secondary),
    '--brand-secondary-hover': shade(secondary, -0.15),
    '--brand-on-secondary': readableOn(secondary),

    '--brand-accent': accent,
    '--brand-accent-rgb': rgbTriplet(accent),
    '--brand-on-accent': readableOn(accent),

    // The legacy names, repointed. Components that already use these — and
    // `globals.css`'s own `.bg-primary` / `.text-cta` utilities — become
    // tenant-aware without being edited.
    '--sage-green': primary,
    '--moss-green': secondary,
    '--dark-olive': accent,
  };
}

/**
 * Write the tokens onto `documentElement`, and set the tab title and favicon.
 *
 * Idempotent: applying twice with the same branding is a no-op, and applying
 * `null` restores the defaults rather than leaving the previous tenant's
 * colours behind. That reset matters on logout, when the next screen may belong
 * to a different organization or to none.
 */
export function applyBranding(
  branding: TenantBranding | null | undefined,
  organizationName?: string | null,
): void {
  if (typeof document === 'undefined') return;

  const tokens = brandTokens(branding);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokens)) {
    root.style.setProperty(name, value);
  }

  // A data attribute rather than a class: it is what an end-to-end test can
  // read to prove which tenant a page is painted for, and it costs nothing.
  root.setAttribute('data-brand', normalizeHex(branding?.primaryColor) ? 'tenant' : 'default');

  const appName = (branding?.appName || organizationName || '').trim();
  if (appName) {
    document.title = appName;
    root.setAttribute('data-org-name', appName);
  } else {
    root.removeAttribute('data-org-name');
  }

  const favicon = branding?.faviconUrl || branding?.logoUrl;
  if (favicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-brand]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.setAttribute('data-brand', 'tenant');
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
}
