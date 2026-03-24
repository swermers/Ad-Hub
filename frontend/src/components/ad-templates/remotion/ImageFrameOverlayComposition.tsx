/**
 * Image Frame Overlay Composition
 *
 * Animated product photo with promotional badge overlay:
 * - Background image zoom-in reveal
 * - Badge slides in from top-left with bounce
 * - Frosted glass strip slides up from bottom
 * - Body text fades in, CTA pill scales in
 * - Badge breathes/pulses during hold
 *
 * Best for: sales, launches, feature highlights, promos
 * Duration: 7 seconds @ 30fps (210 frames)
 */

import { AbsoluteFill, Img, useCurrentFrame, interpolate, Easing } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";

interface ImageFrameOverlayProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
}

const FPS = 30;

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_OUT_BACK = Easing.out(Easing.back(1.7));

function clampInterpolate(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  easing?: (t: number) => number,
): number {
  return interpolate(frame, inputRange, outputRange, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

export function ImageFrameOverlayComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0a0a0c",
  textColor = "#f0f0f5",
  accentColor = "#FF3366",
  screenshotUrl,
  aspectRatio = "1:1",
}: ImageFrameOverlayProps) {
  const frame = useCurrentFrame();
  const { width, height } = ASPECT_DIMENSIONS[aspectRatio];

  const padding = width * 0.055;

  // ─── Timeline (frames) ───
  // 0-15:    Background zoom-in reveal (0-0.5s)
  // 9-24:    Badge slides in from top-left with bounce (0.3-0.8s)
  // 24-36:   Badge subtle rotate settle (-5deg -> -3deg) (0.8-1.2s)
  // 36-54:   Glass strip slides up from bottom (1.2-1.8s)
  // 54-75:   Body text fades in on glass strip (1.8-2.5s)
  // 75-90:   CTA pill scales in with spring (2.5-3.0s)
  // 90-210:  Hold with subtle badge pulse (3.0-7.0s)

  // ─── Background zoom ───
  const bgScale = clampInterpolate(frame, [0, 15], [1.1, 1.0], EASE_OUT);
  const bgOpacity = clampInterpolate(frame, [0, 10], [0, 1], EASE_OUT);

  // ─── Vignette fade-in ───
  const vignetteOpacity = clampInterpolate(frame, [0, 20], [0, 1], EASE_OUT);

  // ─── Badge entrance ───
  const badgeSlideX = clampInterpolate(frame, [9, 24], [-200, 0], EASE_OUT_BACK);
  const badgeSlideY = clampInterpolate(frame, [9, 24], [-120, 0], EASE_OUT_BACK);
  const badgeScale = clampInterpolate(frame, [9, 24], [0.3, 1.0], EASE_OUT_BACK);
  const badgeOpacity = clampInterpolate(frame, [9, 18], [0, 1], EASE_OUT);

  // Badge rotation settle
  const badgeRotation = clampInterpolate(frame, [24, 36], [-5, -3], EASE_OUT);

  // Badge breathing pulse during hold (3.0s-7.0s)
  const breathCycle = frame >= 90
    ? Math.sin(((frame - 90) / FPS) * Math.PI * 0.8) * 0.02 + 1.0
    : 1.0;

  const finalBadgeScale = badgeScale * breathCycle;

  // ─── Glass strip slide up ───
  const glassStripY = clampInterpolate(frame, [36, 54], [200, 0], EASE_OUT);
  const glassStripOpacity = clampInterpolate(frame, [36, 48], [0, 1], EASE_OUT);

  // ─── Body text fade in ───
  const bodyOpacity = clampInterpolate(frame, [54, 70], [0, 1], EASE_OUT);
  const bodySlideY = clampInterpolate(frame, [54, 70], [20, 0], EASE_OUT);

  // ─── CTA entrance ───
  const ctaScale = clampInterpolate(frame, [75, 90], [0.5, 1.0], EASE_OUT_BACK);
  const ctaOpacity = clampInterpolate(frame, [75, 85], [0, 1], EASE_OUT);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Full-bleed product screenshot background with zoom */}
      {screenshotUrl && (
        <Img
          src={screenshotUrl}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bgScale})`,
            opacity: bgOpacity,
          }}
        />
      )}

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: vignetteOpacity,
          background: `
            radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.4) 100%)
          `,
        }}
      />

      {/* Badge / ribbon — top-left */}
      <div
        style={{
          position: "absolute",
          top: height * 0.04,
          left: padding,
          zIndex: 3,
          opacity: badgeOpacity,
          transform: `translate(${badgeSlideX}px, ${badgeSlideY}px) rotate(${badgeRotation}deg) scale(${finalBadgeScale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: width * 0.022,
            fontWeight: 800,
            textTransform: "uppercase" as const,
            letterSpacing: 2.5,
            padding: `${height * 0.013}px ${width * 0.03}px`,
            borderRadius: 8,
            boxShadow: `0 6px 24px rgba(0,0,0,0.45), 0 2px 8px ${accentColor}55`,
            lineHeight: 1.2,
          }}
        >
          {headline}
        </div>
      </div>

      {/* Frosted glass strip at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          opacity: glassStripOpacity,
          transform: `translateY(${glassStripY}px)`,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: `${height * 0.03}px ${padding}px ${height * 0.04}px`,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Body text */}
        <div
          style={{
            fontSize: width * 0.02,
            fontWeight: 400,
            color: textColor,
            opacity: bodyOpacity,
            transform: `translateY(${bodySlideY}px)`,
            lineHeight: 1.55,
            marginBottom: height * 0.025,
            maxWidth: width * 0.75,
          }}
        >
          {body}
        </div>

        {/* CTA pill button */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: width * 0.019,
            fontWeight: 700,
            padding: `${height * 0.012}px ${width * 0.038}px`,
            borderRadius: 50,
            letterSpacing: 0.8,
            boxShadow: `0 4px 20px ${accentColor}55`,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            transformOrigin: "left center",
          }}
        >
          {cta} &rarr;
        </div>
      </div>
    </AbsoluteFill>
  );
}
