/**
 * Shared animation utilities for Remotion compositions.
 *
 * Provides consistent easing presets, text safety helpers,
 * and reusable animation timing functions.
 */

import { Easing, interpolate, spring as remotionSpring } from "remotion";

// ─── Easing Presets ───

/** Smooth entrance — fast start, gentle settle */
export const EASE_OUT = Easing.out(Easing.cubic);

/** Bouncy entrance — overshoots slightly then settles */
export const EASE_OUT_BACK = Easing.out(Easing.back(1.4));

/** Emphasis pulse — quick in, slow out */
export const EASE_EMPHASIS = Easing.bezier(0.22, 1, 0.36, 1);

/** Smooth both directions */
export const EASE_SMOOTH = Easing.bezier(0.4, 0, 0.2, 1);

// ─── Animation Helpers ───

/** Fade + slide up entrance. Returns { opacity, transform } for a given frame range. */
export function fadeSlideUp(
  frame: number,
  startFrame: number,
  durationFrames: number,
  slideDistance: number = 40,
  easing: (t: number) => number = EASE_OUT,
): { opacity: number; transform: string } {
  const opacity = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const y = interpolate(frame, [startFrame, startFrame + durationFrames], [slideDistance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  return { opacity, transform: `translateY(${y}px)` };
}

/** Scale entrance from center. Returns { opacity, transform }. */
export function scaleEntrance(
  frame: number,
  startFrame: number,
  durationFrames: number,
  fromScale: number = 0.8,
): { opacity: number; transform: string } {
  const opacity = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const scale = interpolate(frame, [startFrame, startFrame + durationFrames], [fromScale, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT_BACK,
  });
  return { opacity, transform: `scale(${scale})` };
}

/** Draw progress for SVG stroke animations (0→1 over frame range) */
export function drawProgress(
  frame: number,
  startFrame: number,
  durationFrames: number,
): number {
  return interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_SMOOTH,
  });
}

/** Counter animation — smoothly counts from 0 to target number */
export function animatedCounter(
  frame: number,
  startFrame: number,
  durationFrames: number,
  targetValue: number,
): number {
  const raw = interpolate(frame, [startFrame, startFrame + durationFrames], [0, targetValue], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return Math.round(raw);
}

/** Stagger delay calculator — returns start frame for item at index */
export function staggerFrame(baseFrame: number, index: number, delayPerItem: number = 4): number {
  return baseFrame + index * delayPerItem;
}

/** Breathing/pulse animation — continuous subtle scale oscillation */
export function breathe(
  frame: number,
  startFrame: number,
  cycleDuration: number = 60,
  amplitude: number = 0.03,
): number {
  if (frame < startFrame) return 1;
  const t = ((frame - startFrame) % cycleDuration) / cycleDuration;
  return 1 + amplitude * Math.sin(t * Math.PI * 2);
}

/** Progress bar — returns width percentage (0-100) */
export function progressBar(
  frame: number,
  totalFrames: number,
): number {
  return interpolate(frame, [0, totalFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── Spring Physics ───

/** Spring config presets — use these instead of manual stiffness/damping tuning */
export const SPRING_CONFIGS = {
  /** Snappy entrance — fast settle, minimal overshoot. Great for UI elements. */
  snappy: { stiffness: 200, damping: 20, mass: 0.8 },
  /** Bouncy entrance — visible overshoot with playful settle. Great for CTAs, badges. */
  bouncy: { stiffness: 120, damping: 10, mass: 0.6 },
  /** Smooth entrance — gentle and elegant. Great for headlines, backgrounds. */
  smooth: { stiffness: 80, damping: 14, mass: 1.0 },
  /** Heavy — weighty, deliberate motion. Great for large elements, cards. */
  heavy: { stiffness: 100, damping: 18, mass: 1.5 },
  /** Quick pop — sharp snap with tiny bounce. Great for icons, small elements. */
  pop: { stiffness: 300, damping: 15, mass: 0.4 },
} as const;

export type SpringPreset = keyof typeof SPRING_CONFIGS;

/**
 * Spring-based entrance animation. Returns 0→1 progress with physics-based easing.
 * Use this instead of interpolate for organic, weighted motion.
 */
export function springProgress(
  frame: number,
  fps: number,
  delay: number = 0,
  config: SpringPreset | { stiffness: number; damping: number; mass: number } = "snappy",
): number {
  const springConfig = typeof config === "string" ? SPRING_CONFIGS[config] : config;
  return remotionSpring({
    frame: frame - delay,
    fps,
    config: springConfig,
    durationInFrames: undefined,
  });
}

/**
 * Spring-based fade + slide up. Drop-in replacement for fadeSlideUp with physics.
 */
export function springSlideUp(
  frame: number,
  fps: number,
  delay: number = 0,
  slideDistance: number = 40,
  config: SpringPreset = "snappy",
): { opacity: number; transform: string } {
  const progress = springProgress(frame, fps, delay, config);
  return {
    opacity: Math.min(progress * 1.5, 1), // opacity leads slightly
    transform: `translateY(${slideDistance * (1 - progress)}px)`,
  };
}

/**
 * Spring-based scale entrance. Drop-in replacement for scaleEntrance with physics.
 */
export function springScale(
  frame: number,
  fps: number,
  delay: number = 0,
  fromScale: number = 0.8,
  config: SpringPreset = "bouncy",
): { opacity: number; transform: string } {
  const progress = springProgress(frame, fps, delay, config);
  const scale = fromScale + (1 - fromScale) * progress;
  return {
    opacity: Math.min(progress * 2, 1),
    transform: `scale(${scale})`,
  };
}

/**
 * Spring-based blur-in entrance. Text/elements reveal from blurred to sharp.
 * The signature "premium" animation — blur(12px) + scale(1.05) → clear + scale(1).
 */
export function springBlurIn(
  frame: number,
  fps: number,
  delay: number = 0,
  maxBlur: number = 12,
  config: SpringPreset = "smooth",
): { opacity: number; filter: string; transform: string } {
  const progress = springProgress(frame, fps, delay, config);
  const blur = maxBlur * (1 - progress);
  const scale = 1 + 0.05 * (1 - progress);
  return {
    opacity: Math.min(progress * 1.8, 1),
    filter: `blur(${blur}px)`,
    transform: `scale(${scale})`,
  };
}

/**
 * Staggered spring animation for word-by-word cascade.
 * Returns array of spring progress values, one per item.
 */
export function springStagger(
  frame: number,
  fps: number,
  count: number,
  baseDelay: number = 0,
  staggerDelay: number = 3,
  config: SpringPreset = "snappy",
): number[] {
  return Array.from({ length: count }, (_, i) =>
    springProgress(frame, fps, baseDelay + i * staggerDelay, config),
  );
}

// ─── Background Generators ───

/**
 * Generate a CSS mesh gradient background string.
 * Creates a multi-stop radial gradient that simulates a mesh gradient.
 */
export function meshGradient(
  baseColor: string,
  accentColor: string,
  intensity: number = 0.15,
): string {
  const hex = (opacity: number) => Math.round(opacity * 255).toString(16).padStart(2, "0");
  const a1 = hex(intensity);
  const a2 = hex(intensity * 0.7);
  const a3 = hex(intensity * 0.5);
  return [
    `radial-gradient(ellipse at 20% 20%, ${accentColor}${a1} 0%, transparent 50%)`,
    `radial-gradient(ellipse at 80% 30%, ${shiftHue(accentColor, 40)}${a2} 0%, transparent 45%)`,
    `radial-gradient(ellipse at 50% 80%, ${shiftHue(accentColor, -30)}${a3} 0%, transparent 55%)`,
    `radial-gradient(ellipse at 70% 70%, ${accentColor}${hex(intensity * 0.3)} 0%, transparent 40%)`,
    baseColor,
  ].join(", ");
}

/**
 * Animated mesh gradient — shifts gradient positions based on frame.
 * Creates subtle movement in the background without distracting from content.
 */
export function animatedMeshGradient(
  frame: number,
  fps: number,
  baseColor: string,
  accentColor: string,
  intensity: number = 0.15,
): string {
  const cycle = (frame / (fps * 8)) * Math.PI * 2; // 8-second cycle
  const x1 = 20 + Math.sin(cycle) * 10;
  const y1 = 20 + Math.cos(cycle) * 8;
  const x2 = 80 + Math.cos(cycle * 0.7) * 12;
  const y2 = 30 + Math.sin(cycle * 0.7) * 10;
  const hex = (opacity: number) => Math.round(opacity * 255).toString(16).padStart(2, "0");
  const a1 = hex(intensity);
  const a2 = hex(intensity * 0.7);
  const a3 = hex(intensity * 0.5);
  return [
    `radial-gradient(ellipse at ${x1}% ${y1}%, ${accentColor}${a1} 0%, transparent 50%)`,
    `radial-gradient(ellipse at ${x2}% ${y2}%, ${shiftHue(accentColor, 40)}${a2} 0%, transparent 45%)`,
    `radial-gradient(ellipse at 50% 80%, ${shiftHue(accentColor, -30)}${a3} 0%, transparent 55%)`,
    baseColor,
  ].join(", ");
}

/**
 * Cinematic vignette overlay — darkens edges, draws eye to center.
 */
export function vignetteOverlay(strength: number = 0.5): string {
  return [
    `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${strength * 0.6}) 100%)`,
    `linear-gradient(180deg, rgba(0,0,0,${strength * 0.15}) 0%, transparent 25%, transparent 70%, rgba(0,0,0,${strength * 0.3}) 100%)`,
  ].join(", ");
}

// ─── Text Safety (re-exported from shared textUtils) ───

export { safeTruncate, responsiveFontSize, wrapText } from "../textUtils";

// ─── Color Utilities ───

/** Shift hue by degrees (0-360). More reliable than hardcoded RGB offsets. */
export function shiftHue(hex: string, degrees: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  // Shift hue
  h = ((h * 360 + degrees) % 360) / 360;

  // HSL to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let nr: number, ng: number, nb: number;
  if (s === 0) {
    nr = ng = nb = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

// ─── Cinematic Utilities ───

/**
 * Motion blur CSS filter — ramps up during fast movement, 0 when settled.
 * Use on elements during fast slide/scale transitions.
 */
export function motionBlur(progress: number, maxBlurPx: number = 8): string {
  // Blur is strongest when progress velocity is highest (around 0.3-0.7)
  const velocity = Math.sin(progress * Math.PI);
  const blur = maxBlurPx * velocity * (1 - progress);
  return `blur(${Math.max(0, blur).toFixed(1)}px)`;
}

/**
 * Parallax offset — elements at different depths move at different speeds.
 * depth: 0.3 = slow background, 1.0 = normal, 2.0 = fast foreground
 */
export function parallaxOffset(
  frame: number,
  fps: number,
  totalDuration: number,
  depth: number = 1.0,
  amplitude: number = 30,
): number {
  const progress = frame / (fps * totalDuration);
  return Math.sin(progress * Math.PI * 2) * amplitude * depth;
}

/**
 * Character-by-character reveal animation.
 * Returns array of per-character styles with staggered opacity and transform.
 */
export function characterReveal(
  frame: number,
  fps: number,
  text: string,
  startFrame: number = 0,
  charDelayFrames: number = 1.5,
): { char: string; opacity: number; transform: string }[] {
  return text.split("").map((char, i) => {
    const charStart = startFrame + i * charDelayFrames;
    const progress = interpolate(
      frame,
      [charStart, charStart + fps * 0.15],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT },
    );
    return {
      char,
      opacity: progress,
      transform: `translateY(${12 * (1 - progress)}px)`,
    };
  });
}

/**
 * Kinetic entrance — rotateZ + skewX with animated text-shadow.
 * Great for bold headlines that need energy.
 */
export function kineticEntrance(progress: number): { transform: string; textShadow: string } {
  const rotate = interpolate(progress, [0, 1], [-3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const skew = interpolate(progress, [0, 1], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shadowBlur = interpolate(progress, [0, 1], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shadowOpacity = interpolate(progress, [0, 1], [0.4, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    transform: `rotateZ(${rotate}deg) skewX(${skew}deg)`,
    textShadow: `0 ${shadowBlur}px ${shadowBlur * 1.5}px rgba(0,0,0,${shadowOpacity})`,
  };
}

/**
 * Animated letter spacing — tight→normal reveal for premium feel.
 */
export function letterSpacingReveal(
  progress: number,
  startEm: number = 0.3,
  endEm: number = 0,
): string {
  const spacing = interpolate(progress, [0, 1], [startEm, endEm], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return `${spacing}em`;
}

/**
 * Floating particle system — generates positions for subtle background particles.
 */
export function generateParticles(
  count: number,
  frame: number,
  fps: number,
  width: number,
  height: number,
  seed: number = 42,
): { x: number; y: number; opacity: number; size: number }[] {
  return Array.from({ length: count }, (_, i) => {
    // Deterministic pseudo-random based on index + seed
    const hash = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    const baseX = ((hash - Math.floor(hash)) * width);
    const baseY = ((Math.sin(i * 269.5 + seed * 183.3) * 43758.5453) % 1 + 1) % 1 * height;
    const speed = 0.3 + ((hash * 7) % 1 + 1) % 1 * 0.7;
    const t = frame / fps;

    return {
      x: baseX + Math.sin(t * 0.5 + i) * 15,
      y: (baseY - t * speed * 20) % (height + 20),
      opacity: 0.08 + 0.15 * Math.sin(t * 0.8 + i * 2),
      size: 2 + ((hash * 13) % 1 + 1) % 1 * 4,
    };
  });
}

/**
 * Film grain noise overlay — returns CSS background-image for a pseudo-random noise pattern.
 * Uses CSS gradient trick, no actual texture needed.
 */
export function filmGrainCSS(frame: number, opacity: number = 0.04): string {
  const offset = (frame * 7) % 100;
  return `repeating-conic-gradient(rgba(0,0,0,${opacity}) ${offset}% ${offset + 0.1}%, transparent ${offset + 0.1}% ${offset + 2}%)`;
}

/**
 * Chromatic aberration — splits element into RGB offset channels.
 * Returns CSS filter + transform for a subtle glitch effect.
 */
export function chromaticAberration(
  intensity: number = 1,
): { textShadow: string } {
  const px = intensity;
  return {
    textShadow: `${px}px 0 rgba(255,0,0,0.3), ${-px}px 0 rgba(0,0,255,0.3)`,
  };
}

/** Mix two colors. Factor 0 = colorA, 1 = colorB */
export function mixColors(colorA: string, colorB: string, factor: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const a = parse(colorA);
  const bArr = parse(colorB);
  const mix = a.map((v, i) => Math.round(v + (bArr[i] - v) * factor));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
