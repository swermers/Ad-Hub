/**
 * Shared text safety utilities for ad templates.
 * Extracted from remotion/animationUtils.ts for use across static and video templates.
 */

/** Truncate text to fit within a max character count, adding ellipsis */
export function safeTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "\u2026";
}

/** Pick font size based on text length and available width */
export function responsiveFontSize(
  text: string,
  basePx: number,
  maxChars: number = 25,
  minScale: number = 0.6,
): number {
  if (text.length <= maxChars) return basePx;
  const ratio = maxChars / text.length;
  return Math.max(basePx * minScale, basePx * ratio);
}

/** Split text into lines that fit within a character limit */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
