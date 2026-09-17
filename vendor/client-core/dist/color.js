"use strict";
/**
 * The colour mathematics behind runtime branding.
 *
 * ── What is shared, and what deliberately is not ────────────────────────────
 * Both clients must answer the same questions identically: is this a valid
 * colour, what text is readable on it, what does a pressed state look like. If
 * the web and the mobile app disagreed about the foreground for a tenant's
 * primary, the same institute would be legible on one and not the other.
 *
 * What is NOT shared is the OUTPUT. The web writes CSS custom properties onto
 * `documentElement` and relies on the cascade; React Native has no cascade and
 * builds a theme object instead. Forcing one shape on both would give each a
 * package it had to unwrap before use.
 *
 * So this exports the arithmetic. Each client assembles its own tokens from it.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHex = normalizeHex;
exports.luminance = luminance;
exports.readableOn = readableOn;
exports.contrastRatio = contrastRatio;
exports.shade = shade;
exports.rgbTriplet = rgbTriplet;
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
/**
 * `#abc` and `abcdef` both accepted; anything else is REJECTED, not guessed.
 *
 * Returning null for `rebeccapurple` rather than attempting to parse it is what
 * lets each client fall back to its own default instead of rendering something
 * arbitrary. A tenant typing a colour name into a form should see their default
 * palette, not a crash and not a random hue.
 */
function normalizeHex(value) {
    if (!value || typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!HEX.test(trimmed))
        return null;
    const body = trimmed.replace('#', '');
    const full = body.length === 3
        ? body
            .split('')
            .map((c) => c + c)
            .join('')
        : body;
    return `#${full.toLowerCase()}`;
}
function channels(hex) {
    const body = hex.replace('#', '');
    return [
        parseInt(body.slice(0, 2), 16),
        parseInt(body.slice(2, 4), 16),
        parseInt(body.slice(4, 6), 16),
    ];
}
/** WCAG relative luminance. */
function luminance(hex) {
    const srgb = channels(hex).map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
/**
 * The text colour to put ON a background, chosen by CONTRAST RATIO rather than
 * by "is it dark".
 *
 * The instinctive rule — dark background, white text — is wrong often enough to
 * matter. A saturated orange like `#E8590C` reads as dark and scores 5.9:1
 * against black versus 3.6:1 against white, so black is correct. A
 * mid-saturation blue like `#2563EB` reads as dark and genuinely needs white.
 * Only the ratio distinguishes them.
 */
function readableOn(hex) {
    const l = luminance(hex);
    const withWhite = 1.05 / (l + 0.05);
    const withBlack = (l + 0.05) / 0.05;
    return withWhite >= withBlack ? '#ffffff' : '#111111';
}
/** The contrast ratio between two colours, for asserting accessibility. */
function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}
/** Mix toward white (amount > 0) or black (amount < 0). */
function shade(hex, amount) {
    const target = amount >= 0 ? 255 : 0;
    const ratio = Math.abs(amount);
    const mixed = channels(hex).map((c) => Math.round(c + (target - c) * ratio));
    return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
/** `#a3b18a` -> `163 177 138`, for `rgb(var(--x) / 0.1)` alpha compositing. */
function rgbTriplet(hex) {
    return channels(hex).join(' ');
}
//# sourceMappingURL=color.js.map