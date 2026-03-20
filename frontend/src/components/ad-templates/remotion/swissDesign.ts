/**
 * Swiss / International Typographic Style design system.
 *
 * Principles encoded:
 * - Strict grid alignment
 * - Bold sans-serif type hierarchy (Helvetica/Inter)
 * - Geometric shapes as compositional elements
 * - Limited color palette (2-3 colors max)
 * - Generous whitespace
 * - Asymmetric balance
 * - No ornament — content IS the design
 */

/* ─── Color palette ─── */

/** Swiss-appropriate color tokens — never pure black or pure white */
export const PALETTE = {
  /** Near-white with warm tint */
  light: "#fafaf8",
  /** Near-black with subtle warmth */
  dark: "#0f0f0e",
  /** Muted text on light backgrounds */
  lightMuted: "#6b6b68",
  /** Muted text on dark backgrounds */
  darkMuted: "#a0a09c",
} as const;

/* ─── Grid system ─── */

const _MARGIN = 80;
const _GUTTER = 40;
const _COLS = 12;

/** 12-column grid with generous gutters */
export const GRID = {
  columns: _COLS,
  gutter: _GUTTER,
  margin: _MARGIN,
  /** Column width for a given canvas width */
  colWidth: (canvasWidth: number) =>
    (canvasWidth - _MARGIN * 2 - _GUTTER * (_COLS - 1)) / _COLS,
  /** X position for a column start (0-indexed) */
  colX: (col: number, canvasWidth: number) => {
    const cw = (canvasWidth - _MARGIN * 2 - _GUTTER * (_COLS - 1)) / _COLS;
    return _MARGIN + col * (cw + _GUTTER);
  },
  /** Span width for N columns */
  spanWidth: (cols: number, canvasWidth: number) => {
    const cw = (canvasWidth - _MARGIN * 2 - _GUTTER * (_COLS - 1)) / _COLS;
    return cols * cw + (cols - 1) * _GUTTER;
  },
} as const;

/* ─── Typography ─── */

/**
 * Type scale — perfect fourth ratio (1.333).
 * All sizes in px at 1080 canvas width.
 */
export const TYPE = {
  display: { size: 120, weight: 900, lineHeight: 0.92, tracking: -4 },
  h1: { size: 80, weight: 900, lineHeight: 0.95, tracking: -3 },
  h2: { size: 56, weight: 700, lineHeight: 1.0, tracking: -1.5 },
  body: { size: 28, weight: 400, lineHeight: 1.4, tracking: 0 },
  caption: { size: 18, weight: 600, lineHeight: 1.2, tracking: 3 },
  cta: { size: 24, weight: 800, lineHeight: 1.0, tracking: 2 },
  fontFamily: "'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
} as const;

/**
 * Headline length thresholds for font size selection.
 * Consistent across all compositions.
 */
export const HEADLINE_SIZE_BREAKPOINT = 20;
export const HEADLINE_SIZE_BREAKPOINT_TIGHT = 15;

/** Pick the right headline font size for a given text length */
export function headlineSize(text: string, tight = false): number {
  const threshold = tight ? HEADLINE_SIZE_BREAKPOINT_TIGHT : HEADLINE_SIZE_BREAKPOINT;
  return text.length > threshold ? TYPE.h1.size : TYPE.display.size;
}

/* ─── Geometry ─── */

export type ShapeType = "circle" | "rect" | "line" | "diagonal" | "quarter-arc";

export interface GeometricShape {
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation?: number;
  color: string;
}

export const SHAPE_PRESETS = {
  poster: [
    { type: "circle" as ShapeType, x: 70, y: 15, size: 30, color: "accent" },
    { type: "line" as ShapeType, x: 7, y: 55, size: 86, rotation: 0, color: "accent" },
  ],
  grid: [
    { type: "rect" as ShapeType, x: 7, y: 8, size: 8, color: "accent" },
    { type: "rect" as ShapeType, x: 18, y: 8, size: 8, color: "accent" },
    { type: "rect" as ShapeType, x: 7, y: 19, size: 8, color: "accent" },
  ],
  diagonal: [
    { type: "diagonal" as ShapeType, x: 60, y: 0, size: 100, rotation: -25, color: "accent" },
  ],
  arc: [
    { type: "quarter-arc" as ShapeType, x: -5, y: 60, size: 50, color: "accent" },
  ],
  bar: [
    { type: "rect" as ShapeType, x: 7, y: 45, size: 4, color: "accent" },
  ],
} as const;

export function shapeStyle(
  shape: GeometricShape,
  canvasWidth: number,
  canvasHeight: number,
  resolvedColor: string,
): React.CSSProperties {
  const px = (shape.x / 100) * canvasWidth;
  const py = (shape.y / 100) * canvasHeight;
  const sz = (shape.size / 100) * canvasWidth;

  const base: React.CSSProperties = {
    position: "absolute",
    left: px,
    top: py,
  };

  switch (shape.type) {
    case "circle":
      return { ...base, width: sz, height: sz, borderRadius: "50%", border: `4px solid ${resolvedColor}`, backgroundColor: "transparent" };
    case "rect":
      return { ...base, width: sz, height: sz, backgroundColor: resolvedColor };
    case "line":
      return { ...base, width: sz, height: 3, backgroundColor: resolvedColor, transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined, transformOrigin: "left center" };
    case "diagonal":
      return { ...base, width: sz * 1.5, height: 6, backgroundColor: resolvedColor, transform: `rotate(${shape.rotation ?? -25}deg)`, transformOrigin: "left center" };
    case "quarter-arc":
      return { ...base, width: sz, height: sz, borderRadius: "0 100% 0 0", border: `4px solid ${resolvedColor}`, borderBottom: "none", borderLeft: "none", backgroundColor: "transparent" };
    default:
      return base;
  }
}

/* ─── Utilities ─── */

/** Check if a hex color is perceptually light (for choosing text color) */
export function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

/** Standard spacing values for consistent gaps */
export const SPACE = {
  xs: 8,
  sm: 16,
  md: 28,
  lg: 40,
  xl: 56,
  xxl: 80,
} as const;
