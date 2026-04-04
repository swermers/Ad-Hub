/**
 * Premium texture overlays for ad templates.
 *
 * These render as inline SVG (compatible with html-to-image export).
 * Layer them between background and text for depth and premium feel.
 *
 * Usage:
 *   <div style={{ position: "relative" }}>
 *     <GrainOverlay intensity={0.4} />
 *     <div style={{ position: "relative", zIndex: 1 }}>...content...</div>
 *   </div>
 */

import React from "react";

const overlayBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
};

// ─── Film Grain ──────────────────────────────────────────────────────────────
// Subtle film grain via SVG feTurbulence — gives photos/solids an organic feel

interface TextureProps {
  /** Opacity of the overlay (0–1). Default varies per texture. */
  opacity?: number;
  /** CSS mix-blend-mode. Default: "overlay" */
  blend?: React.CSSProperties["mixBlendMode"];
}

export function GrainOverlay({
  opacity = 0.35,
  blend = "overlay",
}: TextureProps) {
  const id = React.useId();
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <filter id={`grain-${id}`}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain-${id})`} />
    </svg>
  );
}

// ─── Noise Gradient ──────────────────────────────────────────────────────────
// Gritty gradient with noise — the premium editorial look

export function NoiseGradient({
  opacity = 0.25,
  blend = "soft-light",
  color = "#d4a574",
}: TextureProps & { color?: string }) {
  const id = React.useId();
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <filter id={`noise-grad-${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <radialGradient id={`grad-${id}`} cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect
        width="100%"
        height="100%"
        filter={`url(#noise-grad-${id})`}
      />
      <rect
        width="100%"
        height="100%"
        fill={`url(#grad-${id})`}
      />
    </svg>
  );
}

// ─── Paper Texture ───────────────────────────────────────────────────────────
// Subtle paper/canvas texture — adds warmth and organic feel

export function PaperTexture({
  opacity = 0.15,
  blend = "multiply",
}: TextureProps) {
  const id = React.useId();
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <filter id={`paper-${id}`}>
        <feTurbulence
          type="turbulence"
          baseFrequency="0.04"
          numOctaves="5"
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.92
                  0 0 0 0 0.89
                  0 0 0 0 0.85
                  0 0 0 0.6 0"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#paper-${id})`} />
    </svg>
  );
}

// ─── Halftone Overlay ────────────────────────────────────────────────────────
// Retro halftone dot pattern — great for editorial/print aesthetic

export function HalftoneOverlay({
  opacity = 0.12,
  blend = "multiply",
  color = "#000000",
}: TextureProps & { color?: string }) {
  const id = React.useId();
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`halftone-${id}`}
          x="0"
          y="0"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1.2" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#halftone-${id})`} />
    </svg>
  );
}

// ─── Vignette Overlay ────────────────────────────────────────────────────────
// Edge darkening for depth and focus — draws eye to center

export function VignetteOverlay({
  opacity = 0.5,
  blend = "multiply",
}: TextureProps) {
  const id = React.useId();
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <radialGradient id={`vignette-${id}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#vignette-${id})`} />
    </svg>
  );
}

// ─── Gradient Mesh ───────────────────────────────────────────────────────────
// Multi-color gradient mesh — modern, premium background treatment

export function GradientMesh({
  opacity = 0.3,
  blend = "screen",
  colors = ["#e94560", "#6c5ce7", "#38ef7d"],
}: TextureProps & { colors?: string[] }) {
  const id = React.useId();
  const [c1, c2, c3] = colors;
  return (
    <svg
      style={{ ...overlayBase, mixBlendMode: blend, opacity }}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
    >
      <defs>
        <radialGradient id={`mesh-a-${id}`} cx="20%" cy="20%" r="60%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.6" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`mesh-b-${id}`} cx="80%" cy="30%" r="50%">
          <stop offset="0%" stopColor={c2 || c1} stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`mesh-c-${id}`} cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor={c3 || c1} stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#mesh-a-${id})`} />
      <rect width="100%" height="100%" fill={`url(#mesh-b-${id})`} />
      <rect width="100%" height="100%" fill={`url(#mesh-c-${id})`} />
    </svg>
  );
}
