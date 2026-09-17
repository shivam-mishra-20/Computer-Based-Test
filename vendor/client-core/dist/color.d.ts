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
/**
 * `#abc` and `abcdef` both accepted; anything else is REJECTED, not guessed.
 *
 * Returning null for `rebeccapurple` rather than attempting to parse it is what
 * lets each client fall back to its own default instead of rendering something
 * arbitrary. A tenant typing a colour name into a form should see their default
 * palette, not a crash and not a random hue.
 */
export declare function normalizeHex(value: string | undefined | null): string | null;
/** WCAG relative luminance. */
export declare function luminance(hex: string): number;
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
export declare function readableOn(hex: string): string;
/** The contrast ratio between two colours, for asserting accessibility. */
export declare function contrastRatio(a: string, b: string): number;
/** Mix toward white (amount > 0) or black (amount < 0). */
export declare function shade(hex: string, amount: number): string;
/** `#a3b18a` -> `163 177 138`, for `rgb(var(--x) / 0.1)` alpha compositing. */
export declare function rgbTriplet(hex: string): string;
//# sourceMappingURL=color.d.ts.map