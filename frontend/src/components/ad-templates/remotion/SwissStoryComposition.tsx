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
import { TYPE, GRID } from "./swissDesign";

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

  // Vertical accent line — draws from top
  const vLineHeight = interpolate(frame, [0, fps * 0.8], [0, height * 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Headline — split into words for staggered entrance
  const words = headline.split(/\s+/);
  const wordDelay = 4; // frames between each word
  const headlineStartFrame = fps * 0.3;

  // Horizontal rule
  const hrWidth = interpolate(frame, [fps * 1.5, fps * 2.0], [0, width - storyMargin * 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Body text
  const bodyOpacity = interpolate(frame, [fps * 2.0, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyY = interpolate(frame, [fps * 2.0, fps * 2.5], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // CTA area
  const ctaY = interpolate(frame, [fps * 3.0, fps * 3.5], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ctaOpacity = interpolate(frame, [fps * 3.0, fps * 3.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Swipe indicator pulse
  const swipePulse = frame > fps * 3.5
    ? interpolate(
        (frame - fps * 3.5) % (fps * 1.2),
        [0, fps * 0.6, fps * 1.2],
        [0, -12, 0],
      )
    : 0;
  const swipeOpacity = frame > fps * 3.5
    ? interpolate(
        (frame - fps * 3.5) % (fps * 1.2),
        [0, fps * 0.6, fps * 1.2],
        [0.4, 1, 0.4],
      )
    : 0;

  // Corner geometric accent — small square
  const cornerScale = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
      {/* Vertical accent line — right side */}
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

      {/* Corner square accent — top left */}
      <div
        style={{
          position: "absolute",
          top: storyMargin,
          left: storyMargin,
          width: 20,
          height: 20,
          backgroundColor: accentColor,
          opacity: cornerScale * 0.5,
          transform: `scale(${cornerScale})`,
        }}
      />

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
            const wordStart = headlineStartFrame + i * wordDelay;
            const wordEnd = wordStart + fps * 0.3;

            const wordOpacity = interpolate(frame, [wordStart, wordEnd], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const wordY = interpolate(frame, [wordStart, wordEnd], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });

            return (
              <span
                key={i}
                style={{
                  fontSize: headline.length > 20 ? 72 : 96,
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
            fontSize: 28,
            fontWeight: TYPE.body.weight,
            lineHeight: TYPE.body.lineHeight,
            color: textColor,
            opacity: bodyOpacity * 0.6,
            transform: `translateY(${bodyY}px)`,
            margin: 0,
            maxWidth: width - storyMargin * 2,
          }}
        >
          {body}
        </p>
      </div>

      {/* CTA area — bottom anchored */}
      <div
        style={{
          position: "absolute",
          left: storyMargin,
          right: storyMargin,
          bottom: storyMargin + 40,
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* CTA button — full width, sharp corners (Swiss) */}
        <div
          style={{
            width: "100%",
            backgroundColor: accentColor,
            color: "#ffffff",
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
            opacity: swipeOpacity,
            transform: `translateY(${swipePulse}px)`,
          }}
        >
          {/* Chevron up */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: `10px solid ${textColor}`,
              opacity: 0.5,
            }}
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

      {/* Bottom progress bar */}
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
