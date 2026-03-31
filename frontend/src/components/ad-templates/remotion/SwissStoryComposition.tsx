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
import { TYPE, GRID, PALETTE, headlineSize, isLightColor } from "./swissDesign";
import {
  safeTruncate,
  responsiveFontSize,
  springProgress,
  springSlideUp,
  springScale,
  springStagger,
  drawProgress,
  vignetteOverlay,
  breathe,
  animatedMeshGradient,
  shiftHue,
} from "./animationUtils";
import { IconArrowRight } from "./icons";

export interface SwissStoryProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
}

/**
 * Swiss Story composition — optimized for Instagram/TikTok Stories (9:16).
 *
 * Full-screen vertical. Bold centered typography.
 * Bottom-anchored CTA with swipe-up indicator.
 * Geometric shapes provide Swiss structure in vertical format.
 *
 * 6 seconds at 30fps = 180 frames
 */
export function SwissStoryComposition({
  headline,
  body,
  cta,
  backgroundColor = "#111111",
  textColor = "#ffffff",
  accentColor = "#e94560",
  aspectRatio = "9:16",
  brandFont,
}: SwissStoryProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;
  const storyMargin = 64;

  // --- Animation timeline ---
  // 0-0.5s: Vertical accent line draws down
  // 0.3-1.2s: Headline slides up from bottom, word by word
  // 1.5-2.0s: Horizontal rule animates
  // 2.0-2.5s: Body text fades in
  // 3.0-3.5s: CTA area slides up
  // 3.5-6s: Swipe indicator pulses

  // Vertical accent line — spring-driven draw from top
  const vLineHeight = springProgress(frame, fps, 0, "smooth") * height * 0.35;

  // Apply text safety
  const safeHeadline = safeTruncate(headline, 30);
  const safeBody = safeTruncate(body, 60);

  // Headline — split into words for staggered entrance
  const words = safeHeadline.split(/\s+/);
  const headlineStartFrame = fps * 0.3;

  // Word-by-word spring stagger
  const wordProgressValues = springStagger(
    frame,
    fps,
    words.length,
    headlineStartFrame,
    4,
    "snappy",
  );

  // Horizontal rule — draw progress
  const hrProgress = drawProgress(frame, fps * 1.5, fps * 0.5);
  const hrWidth = hrProgress * (width - storyMargin * 2);

  // Body text — spring slide up
  const bodyAnim = springSlideUp(frame, fps, fps * 2.0, 20, "snappy");

  // CTA area — spring slide up
  const ctaAnim = springSlideUp(frame, fps, fps * 3.0, 60, "smooth");

  // Swipe indicator — breathing pulse
  const swipeBreath = breathe(frame, fps * 3.5, fps * 1.2, 0.15);
  const swipeActive = frame > fps * 3.5;

  // Corner geometric accent — spring scale
  const cornerAnim = springScale(frame, fps, 0, 0, "snappy");

  // CTA button gradient with hue shift
  const ctaGradient = `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor, 30)})`;

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.08);

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

      {/* Vertical accent line — right side */}
      <Sequence from={0}>
        <div
          style={{
            position: "absolute",
            right: storyMargin,
            top: 0,
            width: 3,
            height: vLineHeight,
            backgroundColor: accentColor,
            opacity: 0.6,
          }}
        />
      </Sequence>

      {/* Corner square accent — top left */}
      <Sequence from={0}>
        <div
          style={{
            position: "absolute",
            top: storyMargin,
            left: storyMargin,
            width: 20,
            height: 20,
            backgroundColor: accentColor,
            opacity: cornerAnim.opacity * 0.5,
            transform: cornerAnim.transform,
          }}
        />
      </Sequence>

      {/* Main content — vertically centered */}
      <div
        style={{
          position: "absolute",
          left: storyMargin,
          right: storyMargin,
          top: height * 0.25,
          bottom: height * 0.25,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Headline — word by word stagger */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 14px",
          }}
        >
          {words.map((word, i) => {
            const progress = wordProgressValues[i];
            const wordOpacity = Math.min(progress * 1.5, 1);
            const wordY = 30 * (1 - progress);

            return (
              <span
                key={i}
                style={{
                  fontSize: responsiveFontSize(safeHeadline, headlineSize(safeHeadline) * 0.8, 30),
                  fontWeight: TYPE.display.weight,
                  lineHeight: 0.95,
                  letterSpacing: TYPE.display.tracking,
                  color: textColor,
                  textTransform: "uppercase",
                  opacity: wordOpacity,
                  transform: `translateY(${wordY}px)`,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Horizontal rule */}
        <div
          style={{
            width: hrWidth,
            height: 3,
            backgroundColor: accentColor,
            marginTop: 36,
            marginBottom: 36,
          }}
        />

        {/* Body text */}
        <p
          style={{
            fontSize: TYPE.body.size,
            fontWeight: TYPE.body.weight,
            lineHeight: TYPE.body.lineHeight,
            color: textColor,
            opacity: bodyAnim.opacity * 0.6,
            transform: bodyAnim.transform,
            margin: 0,
            maxWidth: width - storyMargin * 2,
          }}
        >
          {safeBody}
        </p>
      </div>

      {/* CTA area — bottom anchored */}
      <div
        style={{
          position: "absolute",
          left: storyMargin,
          right: storyMargin,
          bottom: storyMargin + 40,
          opacity: ctaAnim.opacity,
          transform: ctaAnim.transform,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* CTA button — full width, sharp corners (Swiss), hue-shifted gradient */}
        <div
          style={{
            width: "100%",
            background: ctaGradient,
            color: isLightColor(accentColor) ? PALETTE.dark : PALETTE.light,
            fontSize: TYPE.cta.size,
            fontWeight: TYPE.cta.weight,
            letterSpacing: TYPE.cta.tracking,
            textTransform: "uppercase",
            padding: "22px 0",
            textAlign: "center",
          }}
        >
          {cta}
        </div>

        {/* Swipe up indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            opacity: swipeActive ? 0.4 + 0.6 * (swipeBreath - 0.85) / 0.3 : 0,
            transform: `translateY(${swipeActive ? -12 * (swipeBreath - 1) / 0.15 : 0}px) scale(${swipeActive ? swipeBreath : 1})`,
          }}
        >
          {/* Chevron up — rotated arrow */}
          <IconArrowRight
            size={20}
            color={textColor}
            strokeWidth={2.5}
            style={{ transform: "rotate(-90deg)", opacity: 0.5 }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: TYPE.caption.weight,
              letterSpacing: TYPE.caption.tracking,
              textTransform: "uppercase",
              color: textColor,
              opacity: 0.4,
            }}
          >
            Swipe Up
          </span>
        </div>
      </div>

      {/* Bottom progress bar — linear interpolate (intentionally not spring) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: interpolate(frame, [0, fps * 6], [0, width], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 4,
          backgroundColor: accentColor,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
}
