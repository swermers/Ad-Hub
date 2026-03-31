import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, GRID, SHAPE_PRESETS, shapeStyle, PALETTE, headlineSize } from "./swissDesign";
import {
  springProgress,
  springSlideUp,
  springStagger,
  drawProgress,
  vignetteOverlay,
  shiftHue,
  breathe,
} from "./animationUtils";

export interface SwissTypeProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
}

/**
 * Swiss Typography composition.
 *
 * Oversized headline dominates the frame. Geometric accents
 * provide visual rhythm. Body text and CTA are secondary.
 * Pure typographic power — the text IS the design.
 *
 * 5 seconds at 30fps = 150 frames
 */
export function SwissTypeComposition({
  headline,
  body,
  cta,
  backgroundColor = PALETTE.light,
  textColor = PALETTE.dark,
  accentColor = "#e94560",
  aspectRatio = "1:1",
}: SwissTypeProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  // --- Animation timeline ---
  // 0-0.4s: Geometric shapes draw in
  // 0.2-1.0s: Headline slides up from below
  // 1.0-1.5s: Accent line draws across
  // 1.2-1.8s: Body text fades in
  // 2.0-2.5s: CTA appears with clean slide
  // 2.5-5s: Subtle breathing/hold

  const shapes = SHAPE_PRESETS.poster;

  // Shape animations — staggered spring entrance
  const shapeProgressValues = springStagger(
    frame,
    fps,
    shapes.length,
    0,
    Math.round(fps * 0.15),
    "snappy",
  );

  // Headline animation — spring slide up with heavy preset for big type
  const headlineAnim = springSlideUp(frame, fps, fps * 0.2, 80, "heavy");

  // Accent line draws across
  const lineProgress = drawProgress(frame, fps * 1.0, fps * 0.5);

  // Body text — spring slide up
  const bodyAnim = springSlideUp(frame, fps, fps * 1.2, 20, "snappy");

  // CTA — spring slide from left (horizontal)
  const ctaProgress = springProgress(frame, fps, fps * 2.0, "snappy");
  const ctaOpacity = Math.min(ctaProgress * 1.5, 1);
  const ctaX = -30 * (1 - ctaProgress);

  // Corner accent — spring progress for opacity
  const cornerOpacity = springProgress(frame, fps, 0, "snappy");

  const fgColor = textColor;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor,
        fontFamily: TYPE.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Vignette overlay — subtle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: vignetteOverlay(0.2),
          pointerEvents: "none",
        }}
      />

      {/* Geometric shapes */}
      {shapes.map((shape, i) => {
        const progress = shapeProgressValues[i];
        return (
          <div
            key={i}
            style={{
              ...shapeStyle(
                { ...shape, color: "accent" },
                width,
                height,
                accentColor,
              ),
              opacity: progress * 0.6,
              transform: `${shapeStyle({ ...shape, color: "accent" }, width, height, accentColor).transform || ""} scale(${progress})`,
            }}
          />
        );
      })}

      {/* Main content area — positioned on grid */}
      <div
        style={{
          position: "absolute",
          left: GRID.margin,
          right: GRID.margin,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Oversized headline */}
        <div
          style={{
            overflow: "hidden",
          }}
        >
          <h1
            style={{
              fontSize: headlineSize(headline),
              fontWeight: TYPE.display.weight,
              lineHeight: TYPE.display.lineHeight,
              letterSpacing: TYPE.display.tracking,
              color: fgColor,
              margin: 0,
              textTransform: "uppercase",
              transform: headlineAnim.transform,
              opacity: headlineAnim.opacity,
            }}
          >
            {headline}
          </h1>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: `${lineProgress * 100}%`,
            maxWidth: GRID.spanWidth(8, width),
            height: 6,
            backgroundColor: accentColor,
            marginTop: 32,
            marginBottom: 32,
          }}
        />

        {/* Body text */}
        <p
          style={{
            fontSize: TYPE.body.size,
            fontWeight: TYPE.body.weight,
            lineHeight: TYPE.body.lineHeight,
            letterSpacing: TYPE.body.tracking,
            color: fgColor,
            opacity: bodyAnim.opacity * 0.7,
            transform: bodyAnim.transform,
            margin: 0,
            maxWidth: GRID.spanWidth(8, width),
          }}
        >
          {body}
        </p>

        {/* CTA — clean, typographic, no pill */}
        <div
          style={{
            marginTop: 48,
            opacity: ctaOpacity,
            transform: `translateX(${ctaX}px)`,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 3,
              backgroundColor: accentColor,
            }}
          />
          <span
            style={{
              fontSize: TYPE.cta.size,
              fontWeight: TYPE.cta.weight,
              letterSpacing: TYPE.cta.tracking,
              textTransform: "uppercase",
              color: accentColor,
            }}
          >
            {cta}
          </span>
        </div>
      </div>

      {/* Corner accent — small square in top-left */}
      <div
        style={{
          position: "absolute",
          top: GRID.margin / 2,
          left: GRID.margin / 2,
          width: 16,
          height: 16,
          backgroundColor: accentColor,
          opacity: cornerOpacity,
        }}
      />
    </AbsoluteFill>
  );
}
