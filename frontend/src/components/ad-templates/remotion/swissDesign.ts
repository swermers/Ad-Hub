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

/** Grid system — 12-column with generous gutters */
export const GRID = {
  columns: 12,
  gutter: 40,
  margin: 80,
  /** Get column width for a given canvas width */
  colWidth: (canvasWidth: number) =>
    (canvasWidth - 80 * 2 - 40 * 11) / 12,
  /** Get x position for a column start (0-indexed) */
  colX: (col: number, canvasWidth: number) => {
    const cw = (canvasWidth - 80 * 2 - 40 * 11) / 12;
    return 80 + col * (cw + 40);
  },
  /** Get span width for N columns */
  spanWidth: (cols: number, canvasWidth: number) => {
    const cw = (canvasWidth - 80 * 2 - 40 * 11) / 12;
    return cols * cw + (cols - 1) * 40;
  },
} as const;

/**
 * Type scale — based on a 1.333 ratio (perfect fourth).
 * All sizes in px at 1080 canvas width.
 */
export const TYPE = {
  /** Display: massive headline */
  display: { size: 120, weight: 900, lineHeight: 0.92, tracking: -4 },
  /** H1: primary headline */
  h1: { size: 80, weight: 900, lineHeight: 0.95, tracking: -3 },
  /** H2: secondary headline */
  h2: { size: 56, weight: 700, lineHeight: 1.0, tracking: -1.5 },
  /** Body: supporting text */
  body: { size: 28, weight: 400, lineHeight: 1.4, tracking: 0 },
  /** Caption: small labels */
  caption: { size: 18, weight: 600, lineHeight: 1.2, tracking: 3 },
  /** CTA: call to action */
  cta: { size: 24, weight: 800, lineHeight: 1.0, tracking: 2 },
  /** Font stack */
  fontFamily: "'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
} as const;

/**
 * Geometric shape primitives used as compositional accents.
 * These are purely decorative — they create visual rhythm and hierarchy.
 */
export type ShapeType = "circle" | "rect" | "line" | "diagonal" | "quarter-arc";

export interface GeometricShape {
  type: ShapeType;
  x: number;      // percentage of canvas width (0-100)
  y: number;      // percentage of canvas height (0-100)
  size: number;   // percentage of canvas width
  rotation?: number;
  color: string;  // "accent" | "bg" | "text" | hex
}

/** Pre-composed shape arrangements for different layout styles */
export const SHAPE_PRESETS = {
  /** Large circle + thin line — classic Swiss poster */
  poster: [
    { type: "circle" as ShapeType, x: 70, y: 15, size: 30, color: "accent" },
    { type: "line" as ShapeType, x: 7, y: 55, size: 86, rotation: 0, color: "accent" },
  ],
  /** Grid of small rectangles — structured, systematic */
  grid: [
    { type: "rect" as ShapeType, x: 7, y: 8, size: 8, color: "accent" },
    { type: "rect" as ShapeType, x: 18, y: 8, size: 8, color: "accent" },
    { type: "rect" as ShapeType, x: 7, y: 19, size: 8, color: "accent" },
  ],
  /** Single bold diagonal — dynamic energy */
  diagonal: [
    { type: "diagonal" as ShapeType, x: 60, y: 0, size: 100, rotation: -25, color: "accent" },
  ],
  /** Quarter arc — elegant, organic geometry */
  arc: [
    { type: "quarter-arc" as ShapeType, x: -5, y: 60, size: 50, color: "accent" },
  ],
  /** Minimal — just a single accent bar */
  bar: [
    { type: "rect" as ShapeType, x: 7, y: 45, size: 4, color: "accent" },
  ],
} as const;

/**
 * Render a geometric shape to inline CSS styles for a div.
 * Returns style object + optional child content for SVG shapes.
 */
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
      return {
        ...base,
        width: sz,
        height: sz,
        borderRadius: "50%",
        border: `4px solid ${resolvedColor}`,
        backgroundColor: "transparent",
      };
    case "rect":
      return {
        ...base,
        width: sz,
        height: sz,
        backgroundColor: resolvedColor,
      };
    case "line":
      return {
        ...base,
        width: sz,
        height: 3,
        backgroundColor: resolvedColor,
        transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
        transformOrigin: "left center",
      };
    case "diagonal":
      return {
        ...base,
        width: sz * 1.5,
        height: 6,
        backgroundColor: resolvedColor,
        transform: `rotate(${shape.rotation ?? -25}deg)`,
        transformOrigin: "left center",
      };
    case "quarter-arc":
      return {
        ...base,
        width: sz,
        height: sz,
        borderRadius: "0 100% 0 0",
        border: `4px solid ${resolvedColor}`,
        borderBottom: "none",
        borderLeft: "none",
        backgroundColor: "transparent",
      };
    default:
      return base;
  }
}
