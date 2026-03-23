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

  // Grid block animations — staggered reveal
  const block1 = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const block2 = interpolate(frame, [fps * 0.15, fps * 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const block3 = interpolate(frame, [fps * 0.3, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Headline
  const headlineOpacity = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineX = interpolate(frame, [fps * 0.5, fps * 1.0], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Body
  const bodyOpacity = interpolate(frame, [fps * 1.3, fps * 1.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA
  const ctaOpacity = interpolate(frame, [fps * 2.0, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [fps * 2.0, fps * 2.5], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Grid layout: large accent block top-right, small blocks for rhythm
  const accentBlockW = GRID.spanWidth(7, width);
  const accentBlockH = height * 0.42;
  const smallBlockSize = GRID.spanWidth(2, width);

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

      {/* Body text — below headline, left-aligned on grid */}
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

      {/* CTA — bottom right, clean rectangle */}
      <div
        style={{
          position: "absolute",
          right: GRID.margin,
          bottom: GRID.margin,
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
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
            opacity: interpolate(frame, [fps * (0.3 + i * 0.1), fps * (0.5 + i * 0.1)], [0, 0.4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      ))}
    </AbsoluteFill>
  );
}
