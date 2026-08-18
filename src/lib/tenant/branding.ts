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

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` and `abcdef` both accepted; anything else is rejected rather than guessed. */
export function normalizeHex(value: string | undefined | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX.test(trimmed)) return null;
  const body = trimmed.replace('#', '');
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  return `#${full.toLowerCase()}`;
}

function channels(hex: string): [number, number, number] {
  const body = hex.replace('#', '');
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const srgb = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * The text colour to put ON a background, chosen by contrast ratio rather than
 * by "is it dark". A mid-saturation brand blue reads as dark to a brightness
 * check and still needs white text.
 */
export function readableOn(hex: string): string {
  const l = luminance(hex);
  const withWhite = 1.05 / (l + 0.05);
  const withBlack = (l + 0.05) / 0.05;
  return withWhite >= withBlack ? '#ffffff' : '#111111';
}

/** Mix toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  const mixed = channels(hex).map((c) => Math.round(c + (target - c) * ratio));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** `#a3b18a` -> `163 177 138`, for `rgb(var(--x) / 0.1)` alpha compositing. */
function triplet(hex: string): string {
  return channels(hex).join(' ');
}

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
    '--brand-primary-rgb': triplet(primary),
    '--brand-primary-hover': shade(primary, -0.15),
    '--brand-primary-soft': shade(primary, 0.85),
    '--brand-on-primary': readableOn(primary),

    '--brand-secondary': secondary,
    '--brand-secondary-rgb': triplet(secondary),
    '--brand-secondary-hover': shade(secondary, -0.15),
    '--brand-on-secondary': readableOn(secondary),

    '--brand-accent': accent,
    '--brand-accent-rgb': triplet(accent),
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
