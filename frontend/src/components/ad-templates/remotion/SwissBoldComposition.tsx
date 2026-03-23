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
import { TYPE, GRID, PALETTE, SPACE, isLightColor } from "./swissDesign";

export interface SwissBoldProps {
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
 * Swiss Bold / Editorial Statement composition.
 *
 * Saturated accent color fills the frame. Oversized headline
 * dominates with one emphasis word in a contrasting color.
 * Rounded card with notch details. Arrow CTA.
 *
 * Inspired by bold editorial Instagram carousels —
 * high contrast, provocative typography, impossible to scroll past.
 *
 * 5 seconds at 30fps = 150 frames
 */
export function SwissBoldComposition({
  headline,
  body,
  cta,
  backgroundColor = PALETTE.dark,
  textColor = PALETTE.dark,
  accentColor = "#e94560",
  aspectRatio = "1:1",
  brandFont,
}: SwissBoldProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;

  // The accent color IS the card background — that's the bold move
  const cardBg = accentColor;
  const isCardLight = isLightColor(cardBg);
  // Headline: dark on vivid bg (editorial look), light on dark bg
  const headlineColor = isCardLight ? PALETTE.dark : PALETTE.light;
  // Emphasis: always the opposite of headline for maximum pop
  const emphasisColor = isCardLight ? PALETTE.light : PALETTE.dark;

  // Card inset from canvas edges
  const cardInset = Math.round(width * 0.04);
  const cardRadius = Math.round(width * 0.04);
  const notchSize = Math.round(width * 0.04);
  const cardPadding = Math.round(width * 0.08);

  // --- Animation timeline ---
  // 0-0.4s: Card scales in from center
  // 0.2-0.8s: Headline words cascade in
  // 0.8-1.3s: Emphasis word color shift
  // 1.3-1.8s: Body subtitle slides in
  // 1.8-2.3s: Arrow CTA appears
  // 2.3-5s: Subtle emphasis word pulse

  // Card entrance
  const cardScale = interpolate(frame, [0, fps * 0.4], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const cardOpacity = interpolate(frame, [0, fps * 0.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Split headline into words — last word (or short phrase) gets emphasis
  const words = headline.split(/\s+/);
  // Pick emphasis: if the body is short (1-2 words), use it as emphasis text
  // Otherwise use the last word of headline
  const bodyWords = body.trim().split(/\s+/);
  const useBodyAsEmphasis = bodyWords.length <= 3 && body.trim().length <= 20;
  const mainWords = words;
  const emphasisText = useBodyAsEmphasis ? body.trim() : null;

  // Word stagger animation
  const wordStartFrame = fps * 0.2;
  const wordStagger = 3; // frames between words

  // Emphasis reveal
  const emphasisOpacity = interpolate(frame, [fps * 0.8, fps * 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const emphasisY = interpolate(frame, [fps * 0.8, fps * 1.3], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Subtitle (body text when not used as emphasis)
  const subtitleOpacity = interpolate(frame, [fps * 1.3, fps * 1.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleX = interpolate(frame, [fps * 1.3, fps * 1.8], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Arrow CTA
  const arrowOpacity = interpolate(frame, [fps * 1.8, fps * 2.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowX = interpolate(frame, [fps * 1.8, fps * 2.3], [-15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Emphasis pulse after entrance
  const emphasisScale = frame > fps * 2.5
    ? interpolate(
        (frame - fps * 2.5) % (fps * 2),
        [0, fps * 1, fps * 2],
        [1, 1.03, 1],
      )
    : 1;

  // Bottom attribution
  const attrOpacity = interpolate(frame, [fps * 2.0, fps * 2.5], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline font size — bigger than standard, this is BOLD
  const hlSize = headline.length > 18
    ? Math.round(width * 0.09)
    : Math.round(width * 0.115);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor,
        fontFamily: font,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Rounded card with saturated background */}
      <div
        style={{
          position: "absolute",
          left: cardInset,
          right: cardInset,
          top: cardInset,
          bottom: cardInset,
          backgroundColor: cardBg,
          borderRadius: cardRadius,
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          overflow: "hidden",
        }}
      >
        {/* Top notch */}
        <div
          style={{
            position: "absolute",
            top: -notchSize / 2,
            left: "50%",
            marginLeft: -notchSize / 2,
            width: notchSize,
            height: notchSize,
            borderRadius: "50%",
            backgroundColor,
          }}
        />

        {/* Bottom notch */}
        <div
          style={{
            position: "absolute",
            bottom: -notchSize / 2,
            left: "50%",
            marginLeft: -notchSize / 2,
            width: notchSize,
            height: notchSize,
            borderRadius: "50%",
            backgroundColor,
          }}
        />

        {/* Main content area */}
        <div
          style={{
            position: "absolute",
            left: cardPadding,
            right: cardPadding,
            top: cardPadding * 1.5,
            bottom: cardPadding * 1.5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Oversized headline — word cascade */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: `${Math.round(width * 0.012)}px ${Math.round(width * 0.02)}px`,
            }}
          >
            {mainWords.map((word, i) => {
              const wStart = wordStartFrame + i * wordStagger;
              const wEnd = wStart + fps * 0.25;

              const wOpacity = interpolate(frame, [wStart, wEnd], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const wY = interpolate(frame, [wStart, wEnd], [40, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });

              return (
                <span
                  key={i}
                  style={{
                    fontSize: hlSize,
                    fontWeight: 900,
                    lineHeight: 1.0,
                    letterSpacing: -2,
                    color: headlineColor,
                    textTransform: "uppercase",
                    opacity: wOpacity,
                    transform: `translateY(${wY}px)`,
                    display: "inline-block",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>

          {/* Emphasis word — contrasting color, bold statement */}
          {emphasisText && (
            <div
              style={{
                marginTop: SPACE.md,
                opacity: emphasisOpacity,
                transform: `translateY(${emphasisY}px) scale(${emphasisScale})`,
                transformOrigin: "left center",
              }}
            >
              <span
                style={{
                  fontSize: Math.round(hlSize * 0.85),
                  fontWeight: 900,
                  lineHeight: 1.0,
                  letterSpacing: -1,
                  color: emphasisColor,
                  textTransform: "uppercase",
                }}
              >
                {emphasisText}
              </span>
            </div>
          )}

          {/* Subtitle line — italic or light weight */}
          <div
            style={{
              marginTop: SPACE.lg,
              opacity: subtitleOpacity,
              transform: `translateX(${subtitleX}px)`,
              display: "flex",
              alignItems: "center",
              gap: SPACE.md,
            }}
          >
            <p
              style={{
                fontSize: Math.round(width * 0.028),
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: 0,
                color: headlineColor,
                margin: 0,
                fontStyle: "italic",
                maxWidth: "75%",
              }}
            >
              {useBodyAsEmphasis ? cta : body}
            </p>

            {/* Arrow indicator */}
            <div
              style={{
                opacity: arrowOpacity,
                transform: `translateX(${arrowX}px)`,
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg
                width={Math.round(width * 0.06)}
                height={Math.round(width * 0.04)}
                viewBox="0 0 60 40"
                fill="none"
              >
                <path
                  d="M0 20H52M52 20L38 6M52 20L38 34"
                  stroke={headlineColor}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom attribution area */}
        <div
          style={{
            position: "absolute",
            left: cardPadding,
            right: cardPadding,
            bottom: cardPadding * 0.6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: attrOpacity,
          }}
        >
          <span
            style={{
              fontSize: Math.round(width * 0.016),
              fontWeight: 600,
              color: headlineColor,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {cta}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
