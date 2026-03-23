/**
 * Hand-drawn SVG animation elements for Remotion compositions.
 *
 * These create an organic, human feel — rough underlines, wobbly circles,
 * sketched arrows, animated checkmarks. Driven by frame-based interpolation.
 *
 * All elements use stroke-dashoffset animation to "draw" the path on screen.
 */

import React from "react";
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";

// ─── Underline ───────────────────────────────────────────────────────────────

interface UnderlineProps {
  /** Width of the underline in pixels */
  width: number;
  /** Stroke color */
  color: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Frame at which the draw animation starts */
  startFrame: number;
  /** Duration of the draw animation in frames */
  duration?: number;
  /** Wobble intensity (0 = straight, higher = more hand-drawn) */
  wobble?: number;
  style?: React.CSSProperties;
}

export function HandDrawnUnderline({
  width,
  color,
  strokeWidth = 4,
  startFrame,
  duration = 12,
  wobble = 8,
  style,
}: UnderlineProps) {
  const frame = useCurrentFrame();

  // Generate a wobbly path
  const segments = 6;
  const segWidth = width / segments;
  let d = `M 0 ${wobble}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * segWidth;
    // Alternate up/down for hand-drawn feel, with slight randomness via segment index
    const yOffset = (i % 2 === 0 ? -1 : 1) * wobble * (0.5 + (i % 3) * 0.2);
    const cpX = x - segWidth * 0.5;
    const cpY = wobble + yOffset * 1.3;
    d += ` Q ${cpX} ${cpY} ${x} ${wobble + yOffset * 0.3}`;
  }

  const pathLength = width * 1.15; // approximate

  const drawProgress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [pathLength, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      width={width}
      height={wobble * 3}
      viewBox={`0 0 ${width} ${wobble * 3}`}
      style={{ overflow: "visible", ...style }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={drawProgress}
        opacity={opacity}
      />
    </svg>
  );
}

// ─── Circle Emphasis ─────────────────────────────────────────────────────────

interface CircleProps {
  /** Size of the circle */
  size: number;
  color: string;
  strokeWidth?: number;
  startFrame: number;
  duration?: number;
  style?: React.CSSProperties;
}

export function HandDrawnCircle({
  size,
  color,
  strokeWidth = 3,
  startFrame,
  duration = 15,
  style,
}: CircleProps) {
  const frame = useCurrentFrame();

  const r = size / 2 - strokeWidth;
  const cx = size / 2;
  const cy = size / 2;

  // Hand-drawn circle is slightly irregular — use a multi-point path instead of a perfect circle
  const points = 12;
  const wobble = size * 0.03;
  let d = "";
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const rx = r + (i % 3 === 0 ? wobble : i % 3 === 1 ? -wobble : wobble * 0.5);
    const ry = r + (i % 3 === 1 ? wobble : i % 3 === 0 ? -wobble : wobble * 0.3);
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    if (i === 0) {
      d += `M ${x} ${y}`;
    } else {
      // Use smooth curves
      const prevAngle = ((i - 0.5) / points) * Math.PI * 2;
      const cpx = cx + Math.cos(prevAngle) * (r + wobble * 0.7);
      const cpy = cy + Math.sin(prevAngle) * (r - wobble * 0.3);
      d += ` Q ${cpx} ${cpy} ${x} ${y}`;
    }
  }

  const pathLength = Math.PI * 2 * r * 1.1;

  const drawProgress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [pathLength, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible", ...style }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={drawProgress}
        opacity={opacity}
      />
    </svg>
  );
}

// ─── Arrow ───────────────────────────────────────────────────────────────────

interface ArrowProps {
  /** Length of the arrow */
  length: number;
  color: string;
  strokeWidth?: number;
  startFrame: number;
  duration?: number;
  /** Direction in degrees (0 = right, 90 = down, 180 = left, 270 = up) */
  rotation?: number;
  style?: React.CSSProperties;
}

export function HandDrawnArrow({
  length,
  color,
  strokeWidth = 3,
  startFrame,
  duration = 12,
  rotation = 0,
  style,
}: ArrowProps) {
  const frame = useCurrentFrame();

  const headSize = length * 0.25;
  // Slight curve to the shaft for hand-drawn feel
  const shaftD = `M 0 ${length * 0.5} Q ${length * 0.02} ${length * 0.25} ${length - headSize} ${length * 0.5}`;
  const headD = `M ${length - headSize} ${length * 0.5 - headSize * 0.5} L ${length} ${length * 0.5} L ${length - headSize} ${length * 0.5 + headSize * 0.5}`;

  const pathLength = length * 1.3;

  const shaftProgress = interpolate(
    frame,
    [startFrame, startFrame + duration * 0.7],
    [length, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const headOpacity = interpolate(
    frame,
    [startFrame + duration * 0.5, startFrame + duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      width={length}
      height={length}
      viewBox={`0 0 ${length} ${length}`}
      style={{
        overflow: "visible",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center",
        ...style,
      }}
    >
      <g opacity={opacity}>
        <path
          d={shaftD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={shaftProgress}
        />
        <path
          d={headD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={headOpacity}
        />
      </g>
    </svg>
  );
}

// ─── Checkmark ───────────────────────────────────────────────────────────────

interface CheckmarkProps {
  size: number;
  color: string;
  strokeWidth?: number;
  startFrame: number;
  duration?: number;
  style?: React.CSSProperties;
}

export function HandDrawnCheckmark({
  size,
  color,
  strokeWidth = 4,
  startFrame,
  duration = 10,
  style,
}: CheckmarkProps) {
  const frame = useCurrentFrame();

  // Two-stroke checkmark path
  const d = `M ${size * 0.15} ${size * 0.55} L ${size * 0.4} ${size * 0.8} L ${size * 0.85} ${size * 0.2}`;
  const pathLength = size * 1.2;

  const drawProgress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [pathLength, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible", ...style }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={drawProgress}
        opacity={opacity}
      />
    </svg>
  );
}

// ─── Squiggle (decorative) ───────────────────────────────────────────────────

interface SquiggleProps {
  width: number;
  color: string;
  strokeWidth?: number;
  startFrame: number;
  duration?: number;
  amplitude?: number;
  waves?: number;
  style?: React.CSSProperties;
}

export function HandDrawnSquiggle({
  width,
  color,
  strokeWidth = 3,
  startFrame,
  duration = 15,
  amplitude = 10,
  waves = 4,
  style,
}: SquiggleProps) {
  const frame = useCurrentFrame();

  const h = amplitude * 2 + strokeWidth * 2;
  const cy = h / 2;
  let d = `M 0 ${cy}`;
  const segWidth = width / (waves * 2);

  for (let i = 0; i < waves * 2; i++) {
    const x = (i + 1) * segWidth;
    const y = cy + (i % 2 === 0 ? -amplitude : amplitude);
    const cpX = x - segWidth / 2;
    d += ` Q ${cpX} ${y} ${x} ${cy}`;
  }

  const pathLength = width * 1.3;

  const drawProgress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [pathLength, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      style={{ overflow: "visible", ...style }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={drawProgress}
        opacity={opacity}
      />
    </svg>
  );
}
