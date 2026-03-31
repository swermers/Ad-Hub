import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, GRID, PALETTE, headlineSize, SPACE } from "./swissDesign";
import {
  springProgress,
  springSlideUp,
  springScale,
  drawProgress,
  breathe,
  vignetteOverlay,
} from "./animationUtils";

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

  // Single accent circle — spring scale entrance (Apple-level restrained)
  const circleEntrance = springScale(frame, fps, 0, 0, "smooth");

  // Headline — spring-based clip reveal
  const headlineRevealProgress = springProgress(frame, fps, Math.round(fps * 0.4), "smooth");
  const headlineReveal = headlineRevealProgress * 100;

  // Body — snappy spring fade
  const bodyOpacity = springProgress(frame, fps, Math.round(fps * 1.4), "snappy");

  // CTA line — draw progress
  const ctaLineDraw = drawProgress(frame, Math.round(fps * 2.2), Math.round(fps * 0.6));
  const ctaLineWidth = ctaLineDraw * 60;

  // CTA text — snappy spring fade
  const ctaTextOpacity = springProgress(frame, fps, Math.round(fps * 2.5), "snappy");

  // Subtle breathing on the circle after entrance
  const circleBreath = breathe(frame, Math.round(fps * 1.0));

  // Bottom line — draw progress
  const bottomLineDraw = drawProgress(frame, Math.round(fps * 0.2), Math.round(fps * 0.6));
  const bottomLineWidth = bottomLineDraw * GRID.spanWidth(3, width);

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
      {/* Vignette overlay — very subtle for minimal composition */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: vignetteOverlay(0.2),
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

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
          opacity: circleEntrance.opacity * 0.12,
          transform: `scale(${(springProgress(frame, fps, Math.round(fps * 0.3), "bouncy") * 0.2 + 0.8) * circleBreath})`,
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
        <Sequence from={0}>
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
        </Sequence>

        {/* Generous whitespace between headline and body */}
        <div style={{ height: SPACE.xl }} />

        {/* Body — understated */}
        <Sequence from={0}>
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
        </Sequence>

        {/* CTA — just a line + text, extremely minimal */}
        <Sequence from={0}>
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
        </Sequence>
      </div>

      {/* Bottom-left grid reference — thin horizontal line */}
      <div
        style={{
          position: "absolute",
          left: GRID.margin,
          bottom: GRID.margin,
          width: bottomLineWidth,
          height: 1,
          backgroundColor: textColor,
          opacity: 0.1,
        }}
      />
    </AbsoluteFill>
  );
}
