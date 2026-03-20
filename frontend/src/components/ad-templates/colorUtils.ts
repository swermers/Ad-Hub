/**
 * Utility functions for working with brand colors in ad templates.
 * Handles smart color assignment, contrast checking, and fallbacks.
 */

/** Default vibrant palette when brand colors aren't available or are all neutrals */
const FALLBACK_PALETTES = [
  { bg: "#1a1a2e", accent: "#e94560", text: "#ffffff" },  // Dark navy + coral red
  { bg: "#0f3460", accent: "#53d8fb", text: "#ffffff" },  // Deep blue + cyan
  { bg: "#1b262c", accent: "#3282b8", text: "#bbe1fa" },  // Charcoal + ocean blue
  { bg: "#2d132c", accent: "#c56cf0", text: "#ffffff" },  // Dark plum + violet
  { bg: "#1a3c34", accent: "#38ef7d", text: "#ffffff" },  // Forest + green
  { bg: "#2c1654", accent: "#ff6b6b", text: "#ffffff" },  // Deep purple + salmon
  { bg: "#1c2833", accent: "#f39c12", text: "#ffffff" },  // Midnight + amber
  { bg: "#1a1a2e", accent: "#6c5ce7", text: "#ffffff" },  // Navy + purple
  { bg: "#0a3d62", accent: "#78e08f", text: "#ffffff" },  // Dark teal + mint
  { bg: "#2d3436", accent: "#fd79a8", text: "#ffffff" },  // Graphite + pink
];

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

/** Relative luminance for contrast ratio calculations */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Check if a color is "chromatic" (has enough saturation to be a brand color) */
function isChromatic(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const [, s, l] = rgbToHsl(r, g, b);
  // Must have some saturation and not be too close to black/white
  return s > 0.15 && l > 0.1 && l < 0.9;
}

/** Check if a color is dark enough to be a background */
function isDark(hex: string): boolean {
  return luminance(hex) < 0.2;
}

/** Check if a color is light enough to be a background */
function isLight(hex: string): boolean {
  return luminance(hex) > 0.5;
}

/** Darken a hex color by a factor (0-1) */
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

export interface BrandColorScheme {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

/**
 * Given an array of extracted brand colors, produce a smart color scheme
 * for ad templates: background, text, and accent colors.
 *
 * Logic:
 * 1. Separate chromatic (saturated) colors from neutrals
 * 2. Pick the most vibrant color as the accent
 * 3. Use a dark version for background
 * 4. Ensure text has high contrast
 * 5. Fall back to a pre-designed palette if no good colors found
 */
export function buildColorScheme(brandColors: string[]): BrandColorScheme {
  if (!brandColors || brandColors.length === 0) {
    return pickFallback();
  }

  // Separate chromatic colors from neutrals
  const chromatic = brandColors.filter(isChromatic);
  const darks = brandColors.filter(isDark);

  if (chromatic.length === 0) {
    // No saturated brand colors found — use fallback
    return pickFallback();
  }

  // Pick accent = most saturated chromatic color
  const accent = chromatic.sort((a, b) => {
    const [, sa] = rgbToHsl(...hexToRgb(a));
    const [, sb] = rgbToHsl(...hexToRgb(b));
    return sb - sa;
  })[0];

  // Pick background:
  // Prefer a dark chromatic color if available, otherwise darken the accent
  const darkChromatic = chromatic.filter(isDark);
  let bg: string;
  if (darkChromatic.length > 0 && darkChromatic[0] !== accent) {
    bg = darkChromatic[0];
  } else if (darks.length > 0 && darks[0] !== accent) {
    bg = darks[0];
  } else {
    bg = darken(accent, 0.7);
  }

  // Text: white works best on dark backgrounds
  const textColor = luminance(bg) < 0.3 ? "#ffffff" : "#111111";

  return { backgroundColor: bg, textColor, accentColor: accent };
}

function pickFallback(): BrandColorScheme {
  const p = FALLBACK_PALETTES[Math.floor(Math.random() * FALLBACK_PALETTES.length)];
  return { backgroundColor: p.bg, textColor: p.text, accentColor: p.accent };
}

/**
 * Given a stable seed (like product ID), pick a deterministic fallback palette.
 */
export function buildColorSchemeFromSeed(brandColors: string[], seed: string): BrandColorScheme {
  if (!brandColors || brandColors.length === 0) {
    return pickFallbackFromSeed(seed);
  }

  const chromatic = brandColors.filter(isChromatic);

  if (chromatic.length === 0) {
    return pickFallbackFromSeed(seed);
  }

  // Use the same logic as buildColorScheme for chromatic colors
  return buildColorScheme(brandColors);
}

function pickFallbackFromSeed(seed: string): BrandColorScheme {
  // Simple hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  const p = FALLBACK_PALETTES[idx];
  return { backgroundColor: p.bg, textColor: p.text, accentColor: p.accent };
}
