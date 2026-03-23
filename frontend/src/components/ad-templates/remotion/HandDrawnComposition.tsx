/**
 * Hand-Drawn Composition — organic, warm, personal feel.
 *
 * Built for Weekly Wednesday Wellness and similar content brands
 * that want to feel human, not corporate. Kraft-paper texture,
 * hand-drawn animated elements, soft serif type.
 *
 * Supports optional b-roll background image with overlay.
 *
 * Timeline (8s @ 30fps = 240 frames):
 *   0.0–0.6s  Background fades in (b-roll or warm gradient)
 *   0.3–1.2s  Headline writes in word-by-word
 *   1.0–1.6s  Hand-drawn underline draws beneath headline
 *   1.4–2.2s  Body text fades up
 *   2.0–2.6s  Decorative squiggle divider draws
 *   2.4–3.2s  CTA appears with hand-drawn circle emphasis
 *   3.0–3.5s  Checkmark draws beside CTA
 *   3.5–8.0s  Gentle float/breathe on all elements
 */

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { PALETTE, SPACE } from "./swissDesign";
import {
  HandDrawnUnderline,
  HandDrawnSquiggle,
  HandDrawnCircle,
  HandDrawnCheckmark,
} from "./HandDrawnElements";

// ─── Palette ────────────────────────────────────────────────────────────────

const WARM = {
  cream: "#faf6f0",
  ink: "#2c2420",
  inkMuted: "#6b5e54",
  accent: "#c97b4b",      // warm terracotta
  accentSoft: "#e8c4a0",  // muted gold
  overlay: "rgba(250,246,240,0.82)",
};

// ─── Props ──────────────────────────────────────────────────────────────────

export interface HandDrawnProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;   // used as b-roll background
  aspectRatio?: AspectRatio;
  brandFont?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HandDrawnComposition({
  headline,
  body,
  cta,
  backgroundColor = WARM.cream,
  accentColor = WARM.accent,
  screenshotUrl,
  aspectRatio = "1:1",
  brandFont,
}: HandDrawnProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || "'Georgia', 'Times New Roman', serif";

  // ── Responsive sizing ──────────────────────────────────────────────────

  const pad = Math.round(width * 0.08);
  const hlSize = headline.length > 30
    ? Math.round(width * 0.065)
    : headline.length > 18
      ? Math.round(width * 0.08)
      : Math.round(width * 0.1);
  const bodySize = Math.round(width * 0.032);
  const ctaSize = Math.round(width * 0.038);

  // ── Background ─────────────────────────────────────────────────────────

  const bgOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Headline word-by-word ──────────────────────────────────────────────

  const words = headline.split(/\s+/);
  const wordStart = fps * 0.3;
  const wordGap = Math.min(4, Math.round((fps * 0.9) / Math.max(words.length, 1)));

  // ── Body ───────────────────────────────────────────────────────────────

  const bodyY = interpolate(
    frame,
    [fps * 1.4, fps * 2.2],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const bodyOpacity = interpolate(
    frame,
    [fps * 1.4, fps * 2.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── CTA ────────────────────────────────────────────────────────────────

  const ctaOpacity = interpolate(
    frame,
    [fps * 2.4, fps * 3.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const ctaY = interpolate(
    frame,
    [fps * 2.4, fps * 3.2],
    [15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // ── Gentle breathing float (3.5s onward) ───────────────────────────────

  const breathe = interpolate(
    frame,
    [fps * 3.5, fps * 5, fps * 6.5, fps * 8],
    [0, -3, 0, -2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Kraft paper texture (CSS noise) ────────────────────────────────────

  const noiseFilter = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

  // ── Underline sizing ───────────────────────────────────────────────────

  const underlineWidth = Math.min(width - pad * 2, width * 0.65);
  const underlineStartFrame = Math.round(fps * 1.0);

  // ── Layout zones ───────────────────────────────────────────────────────

  const contentTop = aspectRatio === "9:16" ? height * 0.22 : height * 0.15;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* ── B-roll background ─────────────────────────────────────────── */}
      {screenshotUrl && (
        <AbsoluteFill style={{ opacity: bgOpacity }}>
          <Img
            src={screenshotUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Warm overlay so text stays readable */}
          <AbsoluteFill
            style={{ backgroundColor: WARM.overlay }}
          />
        </AbsoluteFill>
      )}

      {/* ── Paper texture overlay ─────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          backgroundImage: noiseFilter,
          backgroundSize: "200px 200px",
          opacity: bgOpacity,
          pointerEvents: "none",
        }}
      />

      {/* ── Content container ─────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: contentTop,
          left: pad,
          right: pad,
          transform: `translateY(${breathe}px)`,
        }}
      >
        {/* ── Headline (word-by-word) ────────────────────────────────── */}
        <div
          style={{
            fontSize: hlSize,
            fontWeight: 700,
            lineHeight: 1.2,
            color: WARM.ink,
            letterSpacing: "-0.02em",
            marginBottom: SPACE.sm,
          }}
        >
          {words.map((word, i) => {
            const wStart = wordStart + i * wordGap;
            const wOpacity = interpolate(
              frame,
              [wStart, wStart + 5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const wY = interpolate(
              frame,
              [wStart, wStart + 6],
              [12, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
            );
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: wOpacity,
                  transform: `translateY(${wY}px)`,
                  marginRight: hlSize * 0.25,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* ── Hand-drawn underline ───────────────────────────────────── */}
        <div style={{ marginBottom: SPACE.md }}>
          <HandDrawnUnderline
            width={underlineWidth}
            color={accentColor}
            strokeWidth={Math.round(width * 0.004)}
            startFrame={underlineStartFrame}
            duration={15}
            wobble={6}
          />
        </div>

        {/* ── Body text ─────────────────────────────────────────────── */}
        <div
          style={{
            fontSize: bodySize,
            lineHeight: 1.65,
            color: WARM.inkMuted,
            maxWidth: width * 0.8,
            opacity: bodyOpacity,
            transform: `translateY(${bodyY}px)`,
            marginBottom: SPACE.lg,
          }}
        >
          {body}
        </div>

        {/* ── Squiggle divider ──────────────────────────────────────── */}
        <div style={{ marginBottom: SPACE.md }}>
          <HandDrawnSquiggle
            width={Math.round(width * 0.3)}
            color={WARM.accentSoft}
            strokeWidth={2}
            startFrame={Math.round(fps * 2.0)}
            duration={12}
            amplitude={6}
            waves={3}
          />
        </div>

        {/* ── CTA with circle emphasis ──────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: SPACE.sm,
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <span
              style={{
                fontSize: ctaSize,
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.01em",
              }}
            >
              {cta}
            </span>
            {/* Circle drawn around CTA */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            >
              <HandDrawnCircle
                size={Math.round(ctaSize * 3.2)}
                color={accentColor}
                strokeWidth={2}
                startFrame={Math.round(fps * 2.6)}
                duration={18}
              />
            </div>
          </div>

          {/* Checkmark */}
          <HandDrawnCheckmark
            size={Math.round(ctaSize * 1.2)}
            color={accentColor}
            strokeWidth={3}
            startFrame={Math.round(fps * 3.0)}
            duration={10}
          />
        </div>
      </div>

      {/* ── Corner accent marks (hand-drawn feel) ─────────────────────── */}
      <CornerMarks
        width={width}
        height={height}
        color={WARM.accentSoft}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
}

// ─── Corner accent marks ──────────────────────────────────────────────────────

function CornerMarks({
  width,
  height,
  color,
  frame,
  fps,
}: {
  width: number;
  height: number;
  color: string;
  frame: number;
  fps: number;
}) {
  const opacity = interpolate(
    frame,
    [fps * 0.5, fps * 1.2],
    [0, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const m = Math.round(width * 0.05); // margin
  const len = Math.round(width * 0.06); // mark length
  const sw = 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <g opacity={opacity} stroke={color} strokeWidth={sw} strokeLinecap="round">
        {/* Top-left */}
        <line x1={m} y1={m} x2={m + len} y2={m} />
        <line x1={m} y1={m} x2={m} y2={m + len} />
        {/* Top-right */}
        <line x1={width - m} y1={m} x2={width - m - len} y2={m} />
        <line x1={width - m} y1={m} x2={width - m} y2={m + len} />
        {/* Bottom-left */}
        <line x1={m} y1={height - m} x2={m + len} y2={height - m} />
        <line x1={m} y1={height - m} x2={m} y2={height - m - len} />
        {/* Bottom-right */}
        <line x1={width - m} y1={height - m} x2={width - m - len} y2={height - m} />
        <line x1={width - m} y1={height - m} x2={width - m} y2={height - m - len} />
      </g>
    </svg>
  );
}
