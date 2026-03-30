import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AdTemplateProps, AspectRatio } from "../types";
import { getDimensions } from "../types";
import {
  safeTruncate,
  shiftHue,
  springProgress,
  springSlideUp,
  springScale,
  springBlurIn,
  drawProgress,
  animatedMeshGradient,
  vignetteOverlay,
  breathe,
} from "./animationUtils";

export interface AdCompositionProps extends AdTemplateProps {
  aspectRatio?: AspectRatio;
}

/**
 * Default animated ad composition for Remotion.
 *
 * Full motion ad with spring physics, mesh gradient background,
 * cinematic vignette, screenshot entrance, headline + body reveal,
 * and CTA with glow pulse.
 *
 * 5 seconds at 30fps = 150 frames
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

  // Text safety
  const safeHeadline = safeTruncate(headline, 30);
  const safeBody = safeTruncate(body, 60);

  // --- Timeline ---
  const screenshotDelay = Math.round(fps * 0.3);
  const accentLineStart = Math.round(fps * 0.7);
  const headlineDelay = Math.round(fps * 0.8);
  const bodyDelay = Math.round(fps * 1.5);
  const ctaDelay = Math.round(fps * 2.2);

  // --- Spring animations ---

  // Background scale spring (heavy — weighty settle)
  const bgSpring = springProgress(frame, fps, 0, "heavy");

  // Screenshot entrance (smooth — elegant reveal)
  const screenshotAnim = springSlideUp(frame, fps, screenshotDelay, 40, "smooth");

  // Accent line draw
  const lineProgress = drawProgress(frame, accentLineStart, Math.round(fps * 0.5));

  // Headline blur-in (smooth — premium text reveal)
  const headlineAnim = springBlurIn(frame, fps, headlineDelay, 10, "smooth");

  // Body slide up (snappy — quick follow-up)
  const bodyAnim = springSlideUp(frame, fps, bodyDelay, 20, "snappy");

  // CTA pop entrance (bouncy — attention-grabbing)
  const ctaAnim = springScale(frame, fps, ctaDelay, 0.5, "bouncy");

  // CTA glow pulse after entrance
  const ctaGlow = frame > ctaDelay + fps * 0.5
    ? 0.3 + 0.3 * Math.sin(((frame - ctaDelay) / (fps * 2)) * Math.PI * 2)
    : 0.3;

  // CTA breathing scale
  const ctaBreath = breathe(frame, ctaDelay + Math.round(fps * 1), fps * 2, 0.02);

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.12);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        background: meshBg,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: vignetteOverlay(0.45),
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Screenshot with spring entrance */}
      {screenshotUrl && (
        <Sequence from={screenshotDelay} layout="none">
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 60,
              right: 60,
              height: height * 0.4,
              borderRadius: 20,
              overflow: "hidden",
              zIndex: 1,
              opacity: screenshotAnim.opacity,
              transform: screenshotAnim.transform,
              boxShadow: `0 ${20 * (screenshotAnim.opacity)}px ${60 * (screenshotAnim.opacity)}px rgba(0,0,0,0.4), 0 0 80px ${accentColor}22`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${screenshotUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                transform: `scale(${1 + 0.1 * (1 - bgSpring)})`,
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
          zIndex: 3,
        }}
      >
        {!screenshotUrl && <div style={{ flex: 1 }} />}

        {/* Scene 1: Accent line draw */}
        <Sequence from={accentLineStart} layout="none">
          <div
            style={{
              width: 100 * lineProgress,
              height: 6,
              background: `linear-gradient(90deg, ${accentColor}, ${shiftHue(accentColor, 25)})`,
              borderRadius: 3,
              marginBottom: 24,
              boxShadow: `0 0 ${10 * lineProgress}px ${accentColor}55`,
            }}
          />
        </Sequence>

        {/* Scene 2: Headline — blur-in reveal */}
        <Sequence from={headlineDelay} layout="none">
          <h1
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: textColor,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 20,
              opacity: headlineAnim.opacity,
              filter: headlineAnim.filter,
              transform: headlineAnim.transform,
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            {safeHeadline}
          </h1>
        </Sequence>

        {/* Scene 3: Body — spring slide up */}
        <Sequence from={bodyDelay} layout="none">
          <p
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: textColor,
              opacity: bodyAnim.opacity * 0.8,
              transform: bodyAnim.transform,
              lineHeight: 1.5,
              margin: 0,
              marginBottom: 40,
              maxWidth: width * 0.75,
            }}
          >
            {safeBody}
          </p>
        </Sequence>

        {/* Scene 4: CTA — bouncy pop with glow pulse */}
        <Sequence from={ctaDelay} layout="none">
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              background: `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor, 25)})`,
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 800,
              padding: "18px 48px",
              borderRadius: 50,
              letterSpacing: 1,
              opacity: ctaAnim.opacity,
              transform: `${ctaAnim.transform} scale(${ctaBreath})`,
              boxShadow: `0 8px 32px ${accentColor}${Math.round(ctaGlow * 255).toString(16).padStart(2, "0")}`,
            }}
          >
            {cta} →
          </div>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
}
