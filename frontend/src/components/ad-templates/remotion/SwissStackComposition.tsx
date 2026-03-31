import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, SPACE, isLightColor } from "./swissDesign";
import {
  springProgress,
  springSlideUp,
  springScale,
  springStagger,
  drawProgress,
  animatedMeshGradient,
  vignetteOverlay,
  breathe,
  shiftHue,
} from "./animationUtils";

export interface SwissStackProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
  /** Pipe-delimited items for the stack, e.g. "Item 1|Item 2|Item 3" */
  slideHeadlines?: string;
}

/**
 * Swiss Stack / Dark Card composition.
 *
 * Dark glass card with stacked text items separated by cross marks.
 * Small-caps accent label at top, italic body paragraph below items,
 * clean CTA with arrow at bottom. Sophisticated, muted, premium feel.
 *
 * Inspired by Pathfinder-style dark UI cards — perfect for
 * feature lists, benefit breakdowns, or skill/tool stacks.
 *
 * 6 seconds at 30fps = 180 frames
 */
export function SwissStackComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0a0f0a",
  textColor = "#e8e8e4",
  accentColor = "#6b9e7a",
  aspectRatio = "4:5",
  brandFont,
  slideHeadlines,
}: SwissStackProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;

  // Parse stack items from slideHeadlines or headline
  const items = parseStackItems(headline, slideHeadlines);

  // Layout
  const margin = Math.round(width * 0.07);
  const cardPadding = Math.round(width * 0.06);
  const cardRadius = Math.round(width * 0.02);

  // Card inner area
  const cardTop = Math.round(height * 0.12);
  const cardBottom = Math.round(height * 0.55);

  // --- Animation timeline ---
  // 0-0.4s: Card border draws in
  // 0.3-0.6s: Label fades in
  // 0.4-1.5s: Stack items cascade in with stagger
  // 1.5-2.0s: Cross separators draw in
  // 2.0-2.8s: Body paragraph fades in
  // 3.0-3.5s: Stats/counts fade in
  // 3.5-4.0s: Bottom CTA slides in
  // 4.0-6s: Hold with subtle glow

  // Card border opacity — "heavy" preset for weighty card entrance
  const cardBorderOpacity = springProgress(frame, fps, 0, "heavy");

  // Label — "snappy" preset
  const labelOpacity = springProgress(frame, fps, Math.round(fps * 0.3), "snappy");

  // Stack items cascade — springStagger with "snappy" preset
  const itemBaseDelay = Math.round(fps * 0.4);
  const itemStaggerDelay = Math.round(fps * 0.2);
  const itemProgresses = springStagger(
    frame,
    fps,
    items.length,
    itemBaseDelay,
    itemStaggerDelay,
    "snappy",
  );

  // Cross separator — spring-based timing
  const crossBaseDelay = Math.round(fps * 1.5);
  const crossStaggerDelay = Math.round(fps * 0.1);
  const crossProgresses = springStagger(
    frame,
    fps,
    items.length,
    crossBaseDelay,
    crossStaggerDelay,
    "snappy",
  );

  // Body paragraph — spring progress
  const bodyOpacity = springProgress(frame, fps, Math.round(fps * 2.0), "smooth");

  // Bottom CTA — springSlideUp with "snappy" preset
  const { opacity: ctaOpacity, transform: ctaTransform } = springSlideUp(
    frame,
    fps,
    Math.round(fps * 3.5),
    15,
    "snappy",
  );

  // Bottom line — drawProgress
  const lineWidth = drawProgress(
    frame,
    Math.round(fps * 3.2),
    Math.round(fps * 0.3),
  ) * 100;

  // Subtle card glow — breathe utility
  const glowScale = breathe(frame, Math.round(fps * 4), Math.round(fps * 3), 0.03);
  const glowOpacity = frame > fps * 4 ? (glowScale - 1) / 0.03 : 0;

  // Stats opacity — spring-based
  const statsOpacity = springProgress(frame, fps, Math.round(fps * 3.0), "snappy");

  // Item font sizes
  const itemSize = items.length > 3
    ? Math.round(width * 0.045)
    : Math.round(width * 0.055);

  // Separator mark
  const crossSize = Math.round(width * 0.015);

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
          background: vignetteOverlay(0.35),
          pointerEvents: "none",
        }}
      />

      {/* Brand name — top left */}
      <div
        style={{
          position: "absolute",
          top: margin,
          left: margin,
          opacity: labelOpacity * 0.5,
        }}
      >
        <span
          style={{
            fontSize: Math.round(width * 0.018),
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: textColor,
          }}
        >
          {cta}
        </span>
      </div>

      {/* Glass card with subtle border */}
      <div
        style={{
          position: "absolute",
          left: margin,
          right: margin,
          top: cardTop,
          bottom: height - cardBottom,
          borderRadius: cardRadius,
          border: `1px solid`,
          borderColor: `rgba(${isLightColor(backgroundColor) ? "0,0,0" : "255,255,255"}, ${0.12 * cardBorderOpacity})`,
          backgroundColor: `rgba(${isLightColor(backgroundColor) ? "0,0,0" : "255,255,255"}, ${0.04 * cardBorderOpacity})`,
          overflow: "hidden",
          boxShadow: glowOpacity > 0
            ? `0 0 ${Math.round(width * 0.08)}px rgba(${hexToRgbStr(accentColor)}, ${glowOpacity})`
            : undefined,
        }}
      >
        <div
          style={{
            padding: cardPadding,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Small caps label */}
          <div
            style={{
              opacity: labelOpacity,
              marginBottom: SPACE.md,
            }}
          >
            <span
              style={{
                fontSize: Math.round(width * 0.016),
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: accentColor,
              }}
            >
              {headline.length > 30 ? "Key Points" : headline}
            </span>
          </div>

          {/* Stacked items with cross separators */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {items.map((item, i) => {
              const itemOpacity = itemProgresses[i];
              const itemX = -25 * (1 - itemProgresses[i]);

              // Cross separator between items
              const crossOpacity = i < items.length - 1
                ? crossProgresses[i] * 0.35
                : 0;

              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      opacity: itemOpacity,
                      transform: `translateX(${itemX}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: itemSize,
                        fontWeight: 400,
                        lineHeight: 1.25,
                        letterSpacing: -0.5,
                        color: textColor,
                      }}
                    >
                      {item}
                    </span>
                  </div>

                  {/* Cross separator x */}
                  {i < items.length - 1 && (
                    <div
                      style={{
                        opacity: crossOpacity,
                        padding: `${SPACE.sm}px 0`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: crossSize,
                          color: accentColor,
                          fontWeight: 300,
                        }}
                      >
                        ×
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Body paragraph — italic, muted */}
          <div
            style={{
              opacity: bodyOpacity * 0.7,
              marginTop: SPACE.md,
            }}
          >
            <p
              style={{
                fontSize: Math.round(width * 0.02),
                fontWeight: 400,
                lineHeight: 1.5,
                color: textColor,
                fontStyle: "italic",
                margin: 0,
                opacity: 0.7,
              }}
            >
              {body}
            </p>
          </div>
        </div>
      </div>

      {/* Stats below card */}
      {items.length > 1 && (
        <div
          style={{
            position: "absolute",
            left: margin,
            top: cardBottom + SPACE.lg,
            opacity: statsOpacity * 0.5,
          }}
        >
          <p
            style={{
              fontSize: Math.round(width * 0.018),
              fontWeight: 400,
              color: textColor,
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            Points: {items.length}
          </p>
        </div>
      )}

      {/* Bottom divider line */}
      <div
        style={{
          position: "absolute",
          left: margin,
          right: margin,
          bottom: margin + Math.round(height * 0.06),
          height: 1,
          backgroundColor: textColor,
          opacity: 0.1,
          width: `${lineWidth}%`,
        }}
      />

      {/* Bottom CTA with arrow */}
      <div
        style={{
          position: "absolute",
          left: margin,
          right: margin,
          bottom: margin,
          opacity: ctaOpacity,
          transform: ctaTransform,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: Math.round(width * 0.022),
                fontWeight: 500,
                color: accentColor,
              }}
            >
              {cta}
            </span>
            <span
              style={{
                fontSize: Math.round(width * 0.022),
                color: accentColor,
              }}
            >
              →
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function parseStackItems(headline: string, slideHeadlines?: string): string[] {
  // Use pipe-delimited slide headlines if available
  if (slideHeadlines && slideHeadlines.includes("|")) {
    return slideHeadlines.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  }

  // Split headline by common separators
  const byComma = headline.split(/[,;&]+/).map((s) => s.trim()).filter((s) => s.length > 2);
  if (byComma.length >= 2) return byComma.slice(0, 5);

  // Split by "and" / "or"
  const byAnd = headline.split(/\band\b|\bor\b/i).map((s) => s.trim()).filter((s) => s.length > 2);
  if (byAnd.length >= 2) return byAnd.slice(0, 5);

  // Fallback: headline as single item
  return [headline];
}

function hexToRgbStr(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "255,255,255";
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
