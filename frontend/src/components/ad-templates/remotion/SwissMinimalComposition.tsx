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
import { TYPE, GRID, PALETTE, headlineSize, SPACE } from "./swissDesign";

export interface SwissMinimalProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  /** Optional brand font family extracted from crawl */
  brandFont?: string;
}

/**
 * Swiss Minimal composition.
 *
 * Maximum whitespace. Single focal statement.
 * One accent element. Nothing else.
 * The most restrained — lets the message breathe.
 *
 * Think: Apple-level restraint meets Dieter Rams.
 *
 * 5 seconds at 30fps = 150 frames
 */
export function SwissMinimalComposition({
  headline,
  body,
  cta,
  backgroundColor = PALETTE.light,
  textColor = PALETTE.dark,
  accentColor = "#e94560",
  aspectRatio = "1:1",
  brandFont,
}: SwissMinimalProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;

  // Single accent circle — fades in first as anchor
  const circleScale = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const circleOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline — precise vertical reveal using clip-path
  const headlineReveal = interpolate(frame, [fps * 0.4, fps * 1.2], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Body
  const bodyOpacity = interpolate(frame, [fps * 1.4, fps * 2.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA line + text
  const ctaLineWidth = interpolate(frame, [fps * 2.2, fps * 2.8], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ctaTextOpacity = interpolate(frame, [fps * 2.5, fps * 3.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle breathing on the circle after entrance
  const breathe = frame > fps * 1.0
    ? interpolate(
        (frame - fps * 1.0) % (fps * 3),
        [0, fps * 1.5, fps * 3],
        [1, 1.03, 1],
      )
    : 1;

  const circleSize = Math.min(width, height) * 0.15;

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
      {/* Single accent circle — top right area */}
      <div
        style={{
          position: "absolute",
          right: GRID.margin * 1.5,
          top: GRID.margin * 1.5,
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          backgroundColor: accentColor,
          opacity: circleOpacity * 0.12,
          transform: `scale(${circleScale * breathe})`,
        }}
      />

      {/* Content — vertically centered, left-aligned */}
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
        {/* Headline with vertical clip reveal */}
        <div
          style={{
            clipPath: `inset(0 ${100 - headlineReveal}% 0 0)`,
          }}
        >
          <h1
            style={{
              fontSize: headlineSize(headline, true),
              fontWeight: TYPE.display.weight,
              lineHeight: TYPE.display.lineHeight,
              letterSpacing: TYPE.display.tracking,
              color: textColor,
              margin: 0,
              textTransform: "uppercase",
              maxWidth: GRID.spanWidth(10, width),
            }}
          >
            {headline}
          </h1>
        </div>

        {/* Generous whitespace between headline and body */}
        <div style={{ height: SPACE.xl }} />

        {/* Body — understated */}
        <p
          style={{
            fontSize: TYPE.body.size,
            fontWeight: TYPE.body.weight,
            lineHeight: TYPE.body.lineHeight,
            color: textColor,
            opacity: bodyOpacity * 0.5,
            margin: 0,
            maxWidth: GRID.spanWidth(6, width),
          }}
        >
          {body}
        </p>

        {/* CTA — just a line + text, extremely minimal */}
        <div
          style={{
            marginTop: SPACE.xl,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: ctaLineWidth,
              height: 2,
              backgroundColor: accentColor,
            }}
          />
          <span
            style={{
              fontSize: TYPE.caption.size,
              fontWeight: TYPE.caption.weight,
              letterSpacing: TYPE.caption.tracking,
              textTransform: "uppercase",
              color: accentColor,
              opacity: ctaTextOpacity,
            }}
          >
            {cta}
          </span>
        </div>
      </div>

      {/* Bottom-left grid reference — thin horizontal line */}
      <div
        style={{
          position: "absolute",
          left: GRID.margin,
          bottom: GRID.margin,
          width: interpolate(frame, [fps * 0.2, fps * 0.8], [0, GRID.spanWidth(3, width)], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
          height: 1,
          backgroundColor: textColor,
          opacity: 0.1,
        }}
      />
    </AbsoluteFill>
  );
}
