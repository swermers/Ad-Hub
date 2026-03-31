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
  springStagger,
  drawProgress,
  animatedMeshGradient,
  vignetteOverlay,
  shiftHue,
} from "./animationUtils";

export interface SwissGridProps {
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
 * Swiss Grid composition.
 *
 * Color blocks on a strict grid. Text sits inside/alongside
 * colored rectangles. Strong asymmetric balance.
 * Think: Josef Müller-Brockmann meets modern advertising.
 *
 * 5 seconds at 30fps = 150 frames
 */
export function SwissGridComposition({
  headline,
  body,
  cta,
  backgroundColor = PALETTE.light,
  textColor = PALETTE.dark,
  accentColor = "#2563eb",
  aspectRatio = "1:1",
  brandFont,
}: SwissGridProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;

  // Grid block animations — staggered spring reveal
  const [block1, block2, block3] = springStagger(frame, fps, 3, 0, 5, "snappy");

  // Headline — spring slide from left
  const headlineAnim = springSlideUp(frame, fps, Math.round(fps * 0.5), -40, "smooth");
  // Override slideUp's translateY with translateX for left-to-right slide
  const headlineProgress = springProgress(frame, fps, Math.round(fps * 0.5), "smooth");
  const headlineOpacity = Math.min(headlineProgress * 1.5, 1);
  const headlineX = -40 * (1 - headlineProgress);

  // Body — snappy spring fade
  const bodyOpacity = springProgress(frame, fps, Math.round(fps * 1.3), "snappy");

  // CTA — bouncy spring scale
  const ctaAnim = springScale(frame, fps, Math.round(fps * 2.0), 0.9, "bouncy");

  // Grid dot markers — staggered spring
  const dotMarkers = springStagger(frame, fps, 3, Math.round(fps * 0.3), 3, "snappy");

  // Grid layout: large accent block top-right, small blocks for rhythm
  const accentBlockW = GRID.spanWidth(7, width);
  const accentBlockH = height * 0.42;
  const smallBlockSize = GRID.spanWidth(2, width);

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.06);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        background: meshBg,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: vignetteOverlay(0.25),
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Large accent block — top right */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: accentBlockW,
          height: accentBlockH,
          backgroundColor: accentColor,
          transform: `scaleX(${block1})`,
          transformOrigin: "right top",
        }}
      />

      {/* Small accent square — bottom left grid marker */}
      <div
        style={{
          position: "absolute",
          left: GRID.margin,
          bottom: GRID.margin,
          width: smallBlockSize,
          height: smallBlockSize,
          backgroundColor: accentColor,
          opacity: block2 * 0.3,
          transform: `scale(${block2})`,
          transformOrigin: "bottom left",
        }}
      />

      {/* Thin vertical line — grid reference */}
      <div
        style={{
          position: "absolute",
          left: GRID.colX(4, width),
          top: 0,
          width: 2,
          height: height * block3,
          backgroundColor: accentColor,
          opacity: 0.15,
        }}
      />

      {/* Headline — positioned in left half, overlapping the accent block edge */}
      <Sequence from={0}>
        <div
          style={{
            position: "absolute",
            left: GRID.margin,
            top: accentBlockH - 40,
            right: GRID.margin,
            opacity: headlineOpacity,
            transform: `translateX(${headlineX}px)`,
          }}
        >
          <h1
            style={{
              fontSize: headlineSize(headline),
              fontWeight: TYPE.display.weight,
              lineHeight: TYPE.display.lineHeight,
              letterSpacing: TYPE.display.tracking,
              color: textColor,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {headline}
          </h1>
        </div>
      </Sequence>

      {/* Body text — below headline, left-aligned on grid */}
      <Sequence from={0}>
        <div
          style={{
            position: "absolute",
            left: GRID.margin,
            top: accentBlockH + headlineSize(headline) * TYPE.display.lineHeight + SPACE.md,
            maxWidth: GRID.spanWidth(7, width),
            opacity: bodyOpacity,
          }}
        >
          <p
            style={{
              fontSize: TYPE.body.size,
              fontWeight: TYPE.body.weight,
              lineHeight: TYPE.body.lineHeight,
              color: textColor,
              opacity: 0.65,
              margin: 0,
            }}
          >
            {body}
          </p>
        </div>
      </Sequence>

      {/* CTA — bottom right, clean rectangle */}
      <Sequence from={0}>
        <div
          style={{
            position: "absolute",
            right: GRID.margin,
            bottom: GRID.margin,
            opacity: ctaAnim.opacity,
            transform: ctaAnim.transform,
            transformOrigin: "bottom right",
          }}
        >
          <div
            style={{
              backgroundColor: textColor,
              color: backgroundColor,
              fontSize: TYPE.cta.size,
              fontWeight: TYPE.cta.weight,
              letterSpacing: TYPE.cta.tracking,
              textTransform: "uppercase",
              padding: "20px 48px",
              // Swiss: sharp corners, no border-radius
            }}
          >
            {cta}
          </div>
        </div>
      </Sequence>

      {/* Grid dot markers — subtle reference points */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: GRID.margin + i * (smallBlockSize + GRID.gutter),
            bottom: GRID.margin - 20,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: accentColor,
            opacity: dotMarkers[i] * 0.4,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}
