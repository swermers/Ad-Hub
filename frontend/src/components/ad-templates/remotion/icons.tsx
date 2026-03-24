/**
 * Animated SVG icon library for Remotion ad compositions.
 *
 * Each icon is a React component that accepts:
 * - size: number (px)
 * - color: string (hex/rgb)
 * - progress: number (0-1) — controls draw/reveal animation
 * - strokeWidth: number (default 2)
 *
 * Icons animate via stroke-dashoffset for draw effects
 * and opacity/scale for entrance effects.
 */

import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  progress?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/** Calculate stroke-dasharray/offset for draw animation */
function drawStyle(pathLength: number, progress: number): React.CSSProperties {
  return {
    strokeDasharray: pathLength,
    strokeDashoffset: pathLength * (1 - Math.min(1, Math.max(0, progress))),
  };
}

// ─── Feature / Benefit Icons ───

export function IconCheck({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2.5, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M20 6L9 17L4 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(22, progress)}
      />
    </svg>
  );
}

export function IconShield({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(56, progress)}
      />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(10, progress)}
      />
    </svg>
  );
}

export function IconCloud({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(62, progress)}
      />
    </svg>
  );
}

export function IconZap({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polygon
        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(60, progress)}
      />
    </svg>
  );
}

export function IconTrending({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polyline
        points="23 6 13.5 15.5 8.5 10.5 1 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(30, progress)}
      />
      <polyline
        points="17 6 23 6 23 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(12, progress)}
      />
    </svg>
  );
}

export function IconChart({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="18" y="3" width="4" height="18" rx="1" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(44, progress)} />
      <rect x="10" y="8" width="4" height="13" rx="1" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(34, progress)} />
      <rect x="2" y="13" width="4" height="8" rx="1" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(24, progress)} />
    </svg>
  );
}

export function IconStar({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle(55, progress)}
      />
    </svg>
  );
}

export function IconTarget({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(63, progress)} />
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(38, progress)} />
      <circle cx="12" cy="12" r="2" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(13, progress)} />
    </svg>
  );
}

export function IconLock({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(58, progress)} />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        style={drawStyle(26, progress)} />
    </svg>
  );
}

export function IconUsers({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(28, progress)} />
      <circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(25, progress)} />
      <path d="M23 21v-2a4 4 0 00-3-3.87" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(12, progress)} />
      <path d="M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(12, progress)} />
    </svg>
  );
}

export function IconRocket({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        style={drawStyle(20, progress)} />
      <path
        d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        style={drawStyle(52, progress)} />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(16, progress)} />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(16, progress)} />
    </svg>
  );
}

export function IconGlobe({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(63, progress)} />
      <path d="M2 12h20" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(20, progress)} />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
        stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(45, progress)} />
    </svg>
  );
}

export function IconArrowRight({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(14, progress)} />
      <polyline points="12 5 19 12 12 19" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" style={drawStyle(20, progress)} />
    </svg>
  );
}

export function IconPlay({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polygon points="5 3 19 12 5 21 5 3" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" style={drawStyle(42, progress)} />
    </svg>
  );
}

export function IconRefresh({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" style={drawStyle(12, progress)} />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" style={drawStyle(62, progress)} />
    </svg>
  );
}

export function IconClock({ size = 48, color = "#ffffff", progress = 1, strokeWidth = 2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth}
        style={drawStyle(63, progress)} />
      <polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" style={drawStyle(12, progress)} />
    </svg>
  );
}

// ─── Icon Registry (for dynamic lookup by name) ───

export const ICON_REGISTRY: Record<string, React.ComponentType<IconProps>> = {
  check: IconCheck,
  shield: IconShield,
  cloud: IconCloud,
  zap: IconZap,
  trending: IconTrending,
  chart: IconChart,
  star: IconStar,
  target: IconTarget,
  lock: IconLock,
  users: IconUsers,
  rocket: IconRocket,
  globe: IconGlobe,
  "arrow-right": IconArrowRight,
  play: IconPlay,
  refresh: IconRefresh,
  clock: IconClock,
};

/** Get an icon component by name, with fallback to Zap */
export function getIcon(name: string): React.ComponentType<IconProps> {
  return ICON_REGISTRY[name] || IconZap;
}
