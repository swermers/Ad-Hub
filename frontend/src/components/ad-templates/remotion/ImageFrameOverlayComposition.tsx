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

import { AbsoluteFill, Img, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";
import {
  springProgress,
  springSlideUp,
  springScale,
  breathe,
  vignetteOverlay,
  shiftHue,
} from "./animationUtils";

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
  const { fps } = useVideoConfig();
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

  // ─── Background zoom (spring) ───
  const bgProgress = springProgress(frame, fps, 0, "smooth");
  const bgScale = 1.1 - 0.1 * bgProgress;
  const bgOpacity = Math.min(bgProgress * 1.5, 1);

  // ─── Badge entrance (spring) ───
  const badgeScaleAnim = springScale(frame, fps, 9, 0.3, "bouncy");
  const badgePositionProgress = springProgress(frame, fps, 9, "bouncy");
  const badgeSlideX = -200 * (1 - badgePositionProgress);
  const badgeSlideY = -120 * (1 - badgePositionProgress);

  // Badge rotation settle (spring)
  const rotationProgress = springProgress(frame, fps, 24, "smooth");
  const badgeRotation = -5 + 2 * rotationProgress;

  // Badge breathing pulse during hold (3.0s-7.0s)
  const breathCycle = breathe(frame, 90, 38, 0.02);

  const badgeBaseScale = springProgress(frame, fps, 9, "bouncy") * (1 - 0.3) + 0.3;
  const finalBadgeScale = badgeBaseScale * breathCycle;

  // ─── Glass strip slide up (spring) ───
  const glassAnim = springSlideUp(frame, fps, 36, 200, "smooth");

  // ─── Body text (spring slide up) ───
  const bodyAnim = springSlideUp(frame, fps, 54, 20, "snappy");

  // ─── CTA entrance (spring scale) ───
  const ctaAnim = springScale(frame, fps, 75, 0.5, "pop");

  // ─── CTA gradient with hue shift ───
  const ctaGradient = `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor, 30)})`;

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
          opacity: bgOpacity,
          backgroundImage: vignetteOverlay(0.5),
        }}
      />

      {/* Badge / ribbon — top-left */}
      <Sequence from={0} layout="none">
        <div
          style={{
            position: "absolute",
            top: height * 0.04,
            left: padding,
            zIndex: 3,
            opacity: badgeScaleAnim.opacity,
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
      </Sequence>

      {/* Frosted glass strip at bottom */}
      <Sequence from={0} layout="none">
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            opacity: glassAnim.opacity,
            transform: glassAnim.transform,
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
              opacity: bodyAnim.opacity,
              transform: bodyAnim.transform,
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
              background: ctaGradient,
              color: "#ffffff",
              fontSize: width * 0.019,
              fontWeight: 700,
              padding: `${height * 0.012}px ${width * 0.038}px`,
              borderRadius: 50,
              letterSpacing: 0.8,
              boxShadow: `0 4px 20px ${accentColor}55`,
              opacity: ctaAnim.opacity,
              transform: ctaAnim.transform,
              transformOrigin: "left center",
            }}
          >
            {cta} &rarr;
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
