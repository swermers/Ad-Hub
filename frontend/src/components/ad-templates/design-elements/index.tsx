/**
 * SVG design elements library for ad templates.
 *
 * Brand-adaptive visual elements that add premium design quality.
 * Each component accepts color/opacity/scale props and adapts to brand palette.
 * All rendered as inline SVG for html-to-image export compatibility.
 */

import React from "react";

interface ElementProps {
  color?: string;
  opacity?: number;
  scale?: number;
  style?: React.CSSProperties;
}

// ─── Geometric Shapes ────────────────────────────────────────────────────────

/** Abstract blob — organic, modern feel */
export function AbstractBlob({ color = "#d4a574", opacity = 0.15, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={300 * scale}
      height={300 * scale}
      viewBox="0 0 300 300"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M150 20C200 20 270 60 280 130C290 200 240 260 180 280C120 300 40 260 25 190C10 120 80 20 150 20Z"
        fill={color}
      />
    </svg>
  );
}

/** Diagonal cut — bold, dynamic energy */
export function DiagonalCut({ color = "#d4a574", opacity = 0.1, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={400 * scale}
      height={400 * scale}
      viewBox="0 0 400 400"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="0,0 400,0 400,200 0,400" fill={color} />
    </svg>
  );
}

/** Concentric rings — focus, precision, authority */
export function ConcentricRings({ color = "#d4a574", opacity = 0.12, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={200 * scale}
      height={200 * scale}
      viewBox="0 0 200 200"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {[80, 60, 40, 20].map((r) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/** Grid dots — clean, structured, modern */
export function DotGrid({ color = "#d4a574", opacity = 0.1, scale = 1, style }: ElementProps) {
  const dots: React.ReactElement[] = [];
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      dots.push(
        <circle key={`${x}-${y}`} cx={15 + x * 20} cy={15 + y * 20} r="2" fill={color} />
      );
    }
  }
  return (
    <svg
      width={180 * scale}
      height={180 * scale}
      viewBox="0 0 180 180"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {dots}
    </svg>
  );
}

// ─── Decorative Elements ─────────────────────────────────────────────────────

/** Accent line — subtle visual hierarchy marker */
export function AccentLine({ color = "#d4a574", opacity = 0.6, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={60 * scale}
      height={3 * scale}
      viewBox="0 0 60 3"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="60" height="2" rx="1" fill={color} />
    </svg>
  );
}

/** Corner ornament — editorial/luxury framing */
export function CornerOrnament({ color = "#d4a574", opacity = 0.2, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={40 * scale}
      height={40 * scale}
      viewBox="0 0 40 40"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0 L40 0 L40 4 L4 4 L4 40 L0 40 Z" fill={color} />
    </svg>
  );
}

/** Quote marks — editorial pull-quote styling */
export function QuoteMarks({ color = "#d4a574", opacity = 0.2, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={60 * scale}
      height={50 * scale}
      viewBox="0 0 60 50"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 30C0 13 10 3 25 0L27 5C15 10 12 18 12 25H25V50H0V30Z"
        fill={color}
      />
      <path
        d="M33 30C33 13 43 3 58 0L60 5C48 10 45 18 45 25H58V50H33V30Z"
        fill={color}
      />
    </svg>
  );
}

/** Divider — horizontal separator with design */
export function Divider({ color = "#d4a574", opacity = 0.3, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={120 * scale}
      height={12 * scale}
      viewBox="0 0 120 12"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="0" y1="6" x2="50" y2="6" stroke={color} strokeWidth="1" />
      <circle cx="60" cy="6" r="3" fill={color} />
      <line x1="70" y1="6" x2="120" y2="6" stroke={color} strokeWidth="1" />
    </svg>
  );
}

// ─── Directional Elements ────────────────────────────────────────────────────

/** Arrow chevron — CTA direction, swipe hint */
export function ArrowChevron({ color = "#d4a574", opacity = 0.5, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={24 * scale}
      height={24 * scale}
      viewBox="0 0 24 24"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="9,4 17,12 9,20"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flow line — visual continuity between slides */
export function FlowLine({ color = "#d4a574", opacity = 0.15, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={200 * scale}
      height={400 * scale}
      viewBox="0 0 200 400"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M-20 0 Q100 100 80 200 T200 400"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

// ─── Character Silhouettes ───────────────────────────────────────────────────

/** Minimal figure — storytelling, human connection */
export function FigureSilhouette({ color = "#d4a574", opacity = 0.1, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={80 * scale}
      height={160 * scale}
      viewBox="0 0 80 160"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <circle cx="40" cy="20" r="14" fill={color} />
      {/* Body */}
      <path
        d="M40 34 L40 90 M40 55 L15 75 M40 55 L65 75 M40 90 L20 140 M40 90 L60 140"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Walking figure — movement, progress */
export function WalkingFigure({ color = "#d4a574", opacity = 0.1, scale = 1, style }: ElementProps) {
  return (
    <svg
      width={100 * scale}
      height={160 * scale}
      viewBox="0 0 100 160"
      style={{ ...style, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="18" r="14" fill={color} />
      <path
        d="M50 32 L45 85 M50 50 L25 70 M50 50 L75 65 M45 85 L25 145 M45 85 L65 140"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
