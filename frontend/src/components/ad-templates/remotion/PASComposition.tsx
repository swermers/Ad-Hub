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
import {
  safeTruncate,
  responsiveFontSize,
  springProgress,
  springSlideUp,
  springScale,
  springBlurIn,
  animatedMeshGradient,
  vignetteOverlay,
  shiftHue,
  breathe,
} from "./animationUtils";

export interface PASCompositionProps {
  /** The problem / pain point */
  headline: string;
  /** The agitation / amplified pain */
  body: string;
  /** The solution CTA */
  cta: string;
  /** Product name or solution tagline */
  solutionText?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
}

/**
 * Problem-Agitate-Solve (PAS) video composition.
 *
 * 3 distinct scenes managed via Sequence:
 * Scene 1 (0-2s): PROBLEM - Bold pain point text, red accent
 * Scene 2 (1.8-3.5s): AGITATE - Amplify the pain, shake/pulse effect
 * Scene 3 (3.2-6s): SOLVE - Product reveal with screenshot + CTA
 *
 * 6 seconds at 30fps = 180 frames
 *
 * Uses spring physics for all animations and animated mesh gradient background.
 */
export function PASComposition({
  headline,
  body,
  cta,
  solutionText,
  backgroundColor = "#0a0a0a",
  textColor = "#ffffff",
  accentColor = "#ef4444",
  screenshotUrl,
  aspectRatio = "1:1",
}: PASCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  // Apply text safety
  const safeHeadline = safeTruncate(headline, 25);
  const safeBody = safeTruncate(body, 50);
  const safeSolution = solutionText ? safeTruncate(solutionText, 50) : undefined;

  // Scene boundaries (in frames)
  const scene1From = 0;
  const scene1Duration = fps * 2.3;    // 0–2.3s (with fade-out tail)
  const scene2From = Math.round(fps * 1.8);   // 1.8s: Agitate starts (slight overlap)
  const scene2Duration = Math.round(fps * 2);  // 1.8–3.8s
  const scene3From = Math.round(fps * 3.2);   // 3.2s: Solve starts
  const scene3Duration = Math.round(fps * 2.8); // 3.2–6s

  const scene2End = fps * 3.5;

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.15);

  // Solve accent: green shifted from accent
  const solveAccent = "#22c55e";
  const solveGradient = `linear-gradient(135deg, ${solveAccent}, ${shiftHue(solveAccent, 40)})`;

  // Pulsing red overlay during agitate
  const isInShake = frame >= scene2From + Math.round(fps * 0.3) && frame <= scene2End;
  const agitateGlow = isInShake
    ? interpolate(
        (frame - scene2From) % (fps * 0.5),
        [0, fps * 0.25, fps * 0.5],
        [0, 0.15, 0],
      )
    : 0;

  // Shake effect during agitate
  const shakeX = isInShake ? Math.sin(frame * 1.5) * 4 : 0;
  const shakeY = isInShake ? Math.cos(frame * 2) * 2 : 0;

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
      {/* Cinematic vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: vignetteOverlay(0.5),
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Red agitate glow overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accentColor,
          opacity: agitateGlow,
          zIndex: 5,
          pointerEvents: "none",
        }}
      />

      {/* ===== SCENE 1: PROBLEM ===== */}
      <Sequence from={scene1From} durationInFrames={Math.round(scene1Duration)}>
        <ProblemScene
          safeHeadline={safeHeadline}
          textColor={textColor}
          accentColor={accentColor}
          fps={fps}
        />
      </Sequence>

      {/* ===== SCENE 2: AGITATE ===== */}
      <Sequence from={scene2From} durationInFrames={scene2Duration}>
        <AgitateScene
          safeBody={safeBody}
          accentColor={accentColor}
          fps={fps}
          shakeX={shakeX}
          shakeY={shakeY}
        />
      </Sequence>

      {/* ===== SCENE 3: SOLVE ===== */}
      <Sequence from={scene3From} durationInFrames={scene3Duration}>
        <SolveScene
          safeSolution={safeSolution}
          cta={cta}
          textColor={textColor}
          solveAccent={solveAccent}
          solveGradient={solveGradient}
          screenshotUrl={screenshotUrl}
          width={width}
          height={height}
          fps={fps}
        />
      </Sequence>
    </AbsoluteFill>
  );
}

// ─── Scene Components ───

function ProblemScene({
  safeHeadline,
  textColor,
  accentColor,
  fps,
}: {
  safeHeadline: string;
  textColor: string;
  accentColor: string;
  fps: number;
}) {
  const frame = useCurrentFrame();

  // Spring-based entrance
  const labelAnim = springSlideUp(frame, fps, 0, 30, "snappy");
  const headlineAnim = springSlideUp(frame, fps, 6, 40, "smooth");

  // Fade out near end of scene
  const fadeOut = interpolate(frame, [fps * 1.7, fps * 2.1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity: fadeOut,
        zIndex: 1,
      }}
    >
      {/* Problem label */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor, 20)})`,
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          padding: "8px 24px",
          borderRadius: 6,
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: 32,
          opacity: labelAnim.opacity,
          transform: labelAnim.transform,
        }}
      >
        The Problem
      </div>

      {/* Pain point text */}
      <h1
        style={{
          fontSize: responsiveFontSize(safeHeadline, 60, 25),
          fontWeight: 900,
          color: textColor,
          textAlign: "center",
          lineHeight: 1.1,
          margin: 0,
          opacity: headlineAnim.opacity,
          transform: headlineAnim.transform,
        }}
      >
        {safeHeadline}
      </h1>
    </div>
  );
}

function AgitateScene({
  safeBody,
  accentColor,
  fps,
  shakeX,
  shakeY,
}: {
  safeBody: string;
  accentColor: string;
  fps: number;
  shakeX: number;
  shakeY: number;
}) {
  const frame = useCurrentFrame();

  // Spring entrance within the sequence (frame resets to 0 inside Sequence)
  const textAnim = springSlideUp(frame, fps, 0, 40, "snappy");

  // Fade out near end
  const fadeOut = interpolate(frame, [fps * 1.4, fps * 1.8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity: fadeOut,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
        zIndex: 2,
      }}
    >
      {/* Agitate text */}
      <p
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: accentColor,
          textAlign: "center",
          lineHeight: 1.3,
          margin: 0,
          opacity: textAnim.opacity,
          transform: textAnim.transform,
        }}
      >
        {safeBody}
      </p>
    </div>
  );
}

function SolveScene({
  safeSolution,
  cta,
  textColor,
  solveAccent,
  solveGradient,
  screenshotUrl,
  width,
  height,
  fps,
}: {
  safeSolution?: string;
  cta: string;
  textColor: string;
  solveAccent: string;
  solveGradient: string;
  screenshotUrl?: string;
  width: number;
  height: number;
  fps: number;
}) {
  const frame = useCurrentFrame();

  // Spring-based scene entrance
  const sceneEntry = springProgress(frame, fps, 0, "smooth");

  // Solution label — spring slide up
  const labelAnim = springSlideUp(frame, fps, 0, 30, "snappy");

  // Screenshot — spring slide up with delay
  const screenshotAnim = springSlideUp(frame, fps, 6, 60, "smooth");

  // Solution text — blur-in reveal
  const solutionAnim = springBlurIn(frame, fps, 12, 12, "smooth");

  // CTA — spring scale bounce entrance
  const ctaAnim = springScale(frame, fps, Math.round(fps * 1.0), 0.6, "bouncy");

  // Breathing pulse on CTA once it has appeared
  const ctaPulse = breathe(frame, Math.round(fps * 1.4), 60, 0.03);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
        opacity: Math.min(sceneEntry * 2, 1),
        zIndex: 3,
      }}
    >
      {/* Solution label with gradient */}
      <div
        style={{
          background: solveGradient,
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          padding: "8px 24px",
          borderRadius: 6,
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: 24,
          opacity: labelAnim.opacity,
          transform: labelAnim.transform,
        }}
      >
        The Solution
      </div>

      {/* Product screenshot */}
      {screenshotUrl && (
        <div
          style={{
            width: width * 0.7,
            height: height * 0.35,
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 24,
            opacity: screenshotAnim.opacity,
            transform: screenshotAnim.transform,
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${solveAccent}22`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${screenshotUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      )}

      {/* Solution text — blur-in reveal */}
      {safeSolution && (
        <h2
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: textColor,
            textAlign: "center",
            lineHeight: 1.2,
            margin: 0,
            marginBottom: 32,
            opacity: solutionAnim.opacity,
            filter: solutionAnim.filter,
            transform: solutionAnim.transform,
          }}
        >
          {safeSolution}
        </h2>
      )}

      {/* CTA with gradient and breathing pulse */}
      <div
        style={{
          background: solveGradient,
          color: "#fff",
          fontSize: 24,
          fontWeight: 800,
          padding: "20px 56px",
          borderRadius: 50,
          letterSpacing: 1,
          opacity: ctaAnim.opacity,
          transform: `${ctaAnim.transform} scale(${ctaPulse})`,
          boxShadow: `0 8px 32px ${solveAccent}66`,
        }}
      >
        {cta}
      </div>
    </div>
  );
}
