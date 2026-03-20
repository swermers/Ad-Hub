import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AdTemplateProps, AspectRatio } from "../types";
import { getDimensions } from "../types";

export interface AdCompositionProps extends AdTemplateProps {
  aspectRatio?: AspectRatio;
}

/**
 * Animated ad composition for Remotion.
 * Renders a full motion ad with:
 * - Animated background
 * - Text reveal (headline, body, CTA)
 * - Product screenshot entrance
 * - CTA pulse
 *
 * Default: 5 seconds at 30fps = 150 frames
 */
export function AdComposition({
  headline,
  body,
  cta,
  backgroundColor = "#000000",
  textColor = "#ffffff",
  accentColor = "#FF3366",
  screenshotUrl,
  aspectRatio = "1:1",
}: AdCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  // Animation timing (in frames)
  const bgRevealEnd = fps * 0.5;      // 0-0.5s: background
  const screenshotEnd = fps * 1.2;     // 0.5-1.2s: screenshot
  const headlineStart = fps * 0.8;     // 0.8s: headline starts
  const headlineEnd = fps * 1.5;       // 1.5s: headline fully visible
  const bodyStart = fps * 1.5;         // 1.5s: body starts
  const bodyEnd = fps * 2.0;           // 2.0s: body visible
  const ctaStart = fps * 2.5;          // 2.5s: CTA appears
  const ctaEnd = fps * 3.0;            // 3.0s: CTA fully visible

  // Background scale animation
  const bgScale = interpolate(frame, [0, bgRevealEnd], [1.1, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Screenshot entrance
  const screenshotOpacity = interpolate(frame, [fps * 0.3, screenshotEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screenshotY = interpolate(frame, [fps * 0.3, screenshotEnd], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Headline animation
  const headlineOpacity = interpolate(frame, [headlineStart, headlineEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [headlineStart, headlineEnd], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
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

  // CTA animation with pulse
  const ctaOpacity = interpolate(frame, [ctaStart, ctaEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [ctaStart, ctaEnd, ctaEnd + fps * 0.2], [0.8, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Subtle CTA glow pulse after entrance
  const glowPulse = frame > ctaEnd
    ? interpolate(
        (frame - ctaEnd) % (fps * 2),
        [0, fps, fps * 2],
        [0.3, 0.6, 0.3],
      )
    : 0.3;

  // Accent line animation
  const accentWidth = interpolate(frame, [headlineStart, headlineEnd], [0, 100], {
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
      {/* Gradient background overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 30% 20%, ${accentColor}22 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, ${accentColor}15 0%, transparent 40%)`,
          transform: `scale(${bgScale})`,
        }}
      />

      {/* Screenshot with entrance animation */}
      {screenshotUrl && (
        <Sequence from={Math.round(fps * 0.3)}>
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 60,
              right: 60,
              height: height * 0.4,
              borderRadius: 20,
              overflow: "hidden",
              opacity: screenshotOpacity,
              transform: `translateY(${screenshotY}px)`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 80px ${accentColor}22`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${screenshotUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                transform: `scale(${bgScale})`,
              }}
            />
          </div>
        </Sequence>
      )}

      {/* Content area */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "60px 70px 80px",
          background: screenshotUrl
            ? `linear-gradient(transparent, ${backgroundColor}dd 20%, ${backgroundColor})`
            : "transparent",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          height: screenshotUrl ? "60%" : "100%",
        }}
      >
        {!screenshotUrl && <div style={{ flex: 1 }} />}

        {/* Accent line */}
        <div
          style={{
            width: accentWidth,
            height: 6,
            backgroundColor: accentColor,
            borderRadius: 3,
            marginBottom: 24,
          }}
        />

        {/* Headline */}
        <h1
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: textColor,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 20,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            textTransform: "uppercase",
            letterSpacing: -1,
          }}
        >
          {headline}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: textColor,
            opacity: bodyOpacity * 0.8,
            transform: `translateY(${bodyY}px)`,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 40,
            maxWidth: width * 0.75,
          }}
        >
          {body}
        </p>

        {/* CTA button */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 22,
            fontWeight: 800,
            padding: "18px 48px",
            borderRadius: 50,
            letterSpacing: 1,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 8px 32px ${accentColor}${Math.round(glowPulse * 255).toString(16).padStart(2, "0")}`,
          }}
        >
          {cta} →
        </div>
      </div>
    </AbsoluteFill>
  );
}
