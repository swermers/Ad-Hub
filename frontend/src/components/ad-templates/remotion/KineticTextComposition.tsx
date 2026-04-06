import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
  interpolate,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import {
  safeTruncate,
  shiftHue,
  springProgress,
  springSlideUp,
  springScale,
  springBlurIn,
  springStagger,
  animatedMeshGradient,
  vignetteOverlay,
  drawProgress,
  kineticEntrance,
  letterSpacingReveal,
  generateParticles,
} from "./animationUtils";

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
 * Words animate in one-by-one with spring physics + blur-in.
 * Each word of the headline appears sequentially with bounce,
 * then the body fades in, then CTA pops in.
 *
 * Uses spring physics, Sequence scenes, animated mesh gradient,
 * and cinematic vignette for depth.
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

  // Text safety
  const safeHeadline = safeTruncate(headline, 35);
  const words = safeHeadline.split(/\s+/);

  // Timeline
  const wordCascadeDelay = 4; // frames between each word spring
  const bodyStartFrame = Math.round(words.length * wordCascadeDelay + fps * 0.6);
  const ctaStartFrame = bodyStartFrame + Math.round(fps * 0.6);

  // --- Spring animations ---

  // Word cascade with staggered springs (bouncy for kinetic energy)
  const wordSprings = springStagger(frame, fps, words.length, 0, wordCascadeDelay, "bouncy");

  // Accent line draw
  const lineProgress = drawProgress(frame, bodyStartFrame - Math.round(fps * 0.3), Math.round(fps * 0.4));

  // Body text blur-in (smooth, premium feel)
  const bodyAnim = springBlurIn(frame, fps, bodyStartFrame, 8, "smooth");

  // CTA pop entrance (bouncy spring for energy)
  const ctaAnim = springScale(frame, fps, ctaStartFrame, 0.5, "bouncy");

  // CTA glow pulse after entrance
  const ctaGlow = frame > ctaStartFrame + fps * 0.5
    ? 0.4 + 0.2 * Math.sin(((frame - ctaStartFrame) / (fps * 1.5)) * Math.PI * 2)
    : 0;

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.1);

  // Floating particles
  const particles = generateParticles(8, frame, fps, width, height, 17);

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
          background: vignetteOverlay(0.4),
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: accentColor,
            opacity: p.opacity,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      ))}

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
              filter: "blur(20px) saturate(0.7)",
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
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          padding: "80px 60px",
        }}
      >
        {/* Scene 1: Kinetic headline — words cascade with spring bounce */}
        <Sequence from={0} layout="none">
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
              const progress = wordSprings[i] ?? 0;
              const isHighlight = i === words.length - 1 || (i > 0 && i % 3 === 0);
              const kinetic = kineticEntrance(progress);
              const ls = letterSpacingReveal(progress, 0.2, 0);

              return (
                <span
                  key={i}
                  style={{
                    fontSize: 56,
                    fontWeight: 900,
                    color: isHighlight ? accentColor : textColor,
                    lineHeight: 1.1,
                    opacity: Math.min(progress * 1.5, 1),
                    transform: `scale(${0.7 + 0.3 * progress}) translateY(${30 * (1 - progress)}px) rotateX(${-5 * (1 - progress)}deg) ${kinetic.transform}`,
                    display: "inline-block",
                    textTransform: "uppercase",
                    letterSpacing: ls,
                    textShadow: isHighlight
                      ? `0 0 ${40 * progress}px ${accentColor}44, ${kinetic.textShadow}`
                      : kinetic.textShadow,
                    perspective: "500px",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </Sequence>

        {/* Scene 2: Accent line draw */}
        <Sequence from={bodyStartFrame - Math.round(fps * 0.4)} layout="none">
          <div
            style={{
              width: 80 * lineProgress,
              height: 4,
              background: `linear-gradient(90deg, ${accentColor}, ${shiftHue(accentColor, 30)})`,
              borderRadius: 2,
              marginBottom: 24,
              boxShadow: `0 0 ${12 * lineProgress}px ${accentColor}66`,
            }}
          />
        </Sequence>

        {/* Scene 3: Body text — blur-in reveal */}
        <Sequence from={bodyStartFrame - Math.round(fps * 0.1)} layout="none">
          <p
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: textColor,
              opacity: bodyAnim.opacity * 0.75,
              filter: bodyAnim.filter,
              transform: bodyAnim.transform,
              textAlign: "center",
              lineHeight: 1.5,
              margin: 0,
              marginBottom: 48,
              maxWidth: width * 0.75,
            }}
          >
            {body}
          </p>
        </Sequence>

        {/* Scene 4: CTA — bouncy pop entrance with glow pulse */}
        <Sequence from={ctaStartFrame - Math.round(fps * 0.1)} layout="none">
          <div
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor, 30)})`,
              color: "#fff",
              fontSize: 22,
              fontWeight: 800,
              padding: "18px 52px",
              borderRadius: 50,
              letterSpacing: 1,
              opacity: ctaAnim.opacity,
              transform: ctaAnim.transform,
              boxShadow: `0 8px 32px ${accentColor}${Math.round(ctaGlow * 255).toString(16).padStart(2, "0")}`,
            }}
          >
            {cta}
          </div>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
}
