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

export interface KineticTextProps {
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
 * Kinetic Typography composition.
 *
 * Words animate in one-by-one with scale/fade effects.
 * Each word of the headline appears sequentially,
 * then the body fades in, then CTA bounces in.
 *
 * 5 seconds at 30fps = 150 frames
 */
export function KineticTextComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0a0a0a",
  textColor = "#ffffff",
  accentColor = "#8b5cf6",
  screenshotUrl,
  aspectRatio = "9:16",
}: KineticTextProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const words = headline.split(/\s+/);
  const framesPerWord = Math.min(Math.floor((fps * 2) / Math.max(words.length, 1)), fps * 0.4);
  const totalWordAnimTime = words.length * framesPerWord;

  // Body appears after all words
  const bodyStart = totalWordAnimTime + fps * 0.3;
  const bodyEnd = bodyStart + fps * 0.5;

  // CTA appears after body
  const ctaStart = bodyEnd + fps * 0.3;
  const ctaEnd = ctaStart + fps * 0.4;

  // Background gradient rotation
  const gradientAngle = interpolate(frame, [0, fps * 5], [135, 225], {
    extrapolateRight: "clamp",
  });

  // Body animation
  const bodyOpacity = interpolate(frame, [bodyStart, bodyEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyY = interpolate(frame, [bodyStart, bodyEnd], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // CTA animation
  const ctaOpacity = interpolate(frame, [ctaStart, ctaEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [ctaStart, ctaEnd, ctaEnd + fps * 0.15], [0.6, 1.1, 1], {
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
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Animated gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            linear-gradient(${gradientAngle}deg, ${accentColor}15 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, ${accentColor}10 0%, transparent 50%)
          `,
        }}
      />

      {/* Screenshot background if available */}
      {screenshotUrl && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${screenshotUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.15,
              filter: "blur(20px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${backgroundColor}ee 0%, ${backgroundColor}dd 50%, ${backgroundColor} 100%)`,
            }}
          />
        </>
      )}

      {/* Content container */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          padding: "80px 60px",
        }}
      >
        {/* Kinetic headline - words appear one by one */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px 16px",
            marginBottom: 40,
            maxWidth: width * 0.85,
          }}
        >
          {words.map((word, i) => {
            const wordStart = i * framesPerWord;
            const wordEnd = wordStart + framesPerWord;

            const wordOpacity = interpolate(frame, [wordStart, wordEnd], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const wordScale = interpolate(frame, [wordStart, wordEnd], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.back(1.5)),
            });
            const wordY = interpolate(frame, [wordStart, wordEnd], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });

            // Highlight key words (every 3rd or last word) with accent color
            const isHighlight = i === words.length - 1 || (i > 0 && i % 3 === 0);

            return (
              <span
                key={i}
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: isHighlight ? accentColor : textColor,
                  lineHeight: 1.1,
                  opacity: wordOpacity,
                  transform: `scale(${wordScale}) translateY(${wordY}px)`,
                  display: "inline-block",
                  textTransform: "uppercase",
                  letterSpacing: -1,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Accent line */}
        <div
          style={{
            width: interpolate(frame, [bodyStart - fps * 0.2, bodyStart], [0, 80], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            height: 4,
            backgroundColor: accentColor,
            borderRadius: 2,
            marginBottom: 24,
          }}
        />

        {/* Body text */}
        <p
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: textColor,
            opacity: bodyOpacity * 0.75,
            transform: `translateY(${bodyY}px)`,
            textAlign: "center",
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 48,
            maxWidth: width * 0.75,
          }}
        >
          {body}
        </p>

        {/* CTA */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor)})`,
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
            padding: "18px 52px",
            borderRadius: 50,
            letterSpacing: 1,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 8px 32px ${accentColor}55`,
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function shiftHue(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + 40);
  const g = Math.max(0, ((num >> 8) & 0xff) - 20);
  const b = Math.min(255, (num & 0xff) + 60);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
