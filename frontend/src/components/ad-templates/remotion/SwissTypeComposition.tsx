import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, GRID, SHAPE_PRESETS, shapeStyle, PALETTE, headlineSize } from "./swissDesign";

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
  // 0.2-1.0s: Headline slides up from below, letter by letter stagger
  // 1.0-1.5s: Accent line draws across
  // 1.2-1.8s: Body text fades in
  // 2.0-2.5s: CTA appears with clean slide
  // 2.5-5s: Subtle breathing/hold

  const shapes = SHAPE_PRESETS.poster;

  // Shape animations
  const shapeProgress = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Headline animation — slides up from bottom
  const headlineY = interpolate(frame, [fps * 0.2, fps * 1.0], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const headlineOpacity = interpolate(frame, [fps * 0.2, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line draws across
  const lineWidth = interpolate(frame, [fps * 1.0, fps * 1.5], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Body text
  const bodyOpacity = interpolate(frame, [fps * 1.2, fps * 1.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyY = interpolate(frame, [fps * 1.2, fps * 1.8], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // CTA
  const ctaOpacity = interpolate(frame, [fps * 2.0, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaX = interpolate(frame, [fps * 2.0, fps * 2.5], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
      {/* Geometric shapes */}
      {shapes.map((shape, i) => {
        const delay = i * 0.15;
        const progress = interpolate(
          frame,
          [fps * delay, fps * (delay + 0.5)],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
        );
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
              opacity: progress * shapeProgress * 0.6,
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
              transform: `translateY(${headlineY}px)`,
              opacity: headlineOpacity,
            }}
          >
            {headline}
          </h1>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: `${lineWidth}%`,
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
            opacity: bodyOpacity * 0.7,
            transform: `translateY(${bodyY}px)`,
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
          opacity: interpolate(frame, [0, fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
}
