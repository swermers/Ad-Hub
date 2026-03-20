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
 * 3 distinct scenes:
 * Scene 1 (0-2s): PROBLEM - Bold pain point text, red accent
 * Scene 2 (2-3.5s): AGITATE - Amplify the pain, shake/pulse effect
 * Scene 3 (3.5-6s): SOLVE - Product reveal with screenshot + CTA
 *
 * 6 seconds at 30fps = 180 frames
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

  // Scene boundaries (in frames)
  const scene1End = fps * 2;       // 0-2s: Problem
  const scene2Start = fps * 1.8;   // 1.8s: Agitate starts (slight overlap)
  const scene2End = fps * 3.5;     // 3.5s: Agitate ends
  const scene3Start = fps * 3.2;   // 3.2s: Solve starts
  // scene3 runs to end

  // Scene 1: PROBLEM
  const s1Opacity = interpolate(frame, [0, fps * 0.3, scene1End, scene1End + fps * 0.3], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s1Scale = interpolate(frame, [0, fps * 0.5], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Scene 2: AGITATE - with shake effect
  const s2Opacity = interpolate(frame, [scene2Start, scene2Start + fps * 0.3, scene2End, scene2End + fps * 0.3], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Shake effect during agitate
  const isInShake = frame >= scene2Start + fps * 0.3 && frame <= scene2End;
  const shakeX = isInShake ? Math.sin(frame * 1.5) * 4 : 0;
  const shakeY = isInShake ? Math.cos(frame * 2) * 2 : 0;

  // Pulsing red overlay during agitate
  const agitateGlow = isInShake
    ? interpolate(
        (frame - scene2Start) % (fps * 0.5),
        [0, fps * 0.25, fps * 0.5],
        [0, 0.15, 0],
      )
    : 0;

  // Scene 3: SOLVE
  const s3Opacity = interpolate(frame, [scene3Start, scene3Start + fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s3Scale = interpolate(frame, [scene3Start, scene3Start + fps * 0.6], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const screenshotY = interpolate(frame, [scene3Start + fps * 0.2, scene3Start + fps * 0.8], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const screenshotOp = interpolate(frame, [scene3Start + fps * 0.2, scene3Start + fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOp = interpolate(frame, [scene3Start + fps * 1.0, scene3Start + fps * 1.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(frame, [scene3Start + fps * 1.0, scene3Start + fps * 1.4, scene3Start + fps * 1.6], [0.8, 1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const solveAccent = "#22c55e"; // Green for solution

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity: s1Opacity,
          transform: `scale(${s1Scale})`,
          zIndex: 1,
        }}
      >
        {/* Problem label */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            padding: "8px 24px",
            borderRadius: 6,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 32,
          }}
        >
          The Problem
        </div>

        {/* Pain point text */}
        <h1
          style={{
            fontSize: 60,
            fontWeight: 900,
            color: textColor,
            textAlign: "center",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {headline}
        </h1>
      </div>

      {/* ===== SCENE 2: AGITATE ===== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity: s2Opacity,
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
          }}
        >
          {body}
        </p>
      </div>

      {/* ===== SCENE 3: SOLVE ===== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
          opacity: s3Opacity,
          transform: `scale(${s3Scale})`,
          zIndex: 3,
        }}
      >
        {/* Solution label */}
        <div
          style={{
            backgroundColor: solveAccent,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            padding: "8px 24px",
            borderRadius: 6,
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 24,
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
              opacity: screenshotOp,
              transform: `translateY(${screenshotY}px)`,
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

        {/* Solution text */}
        {solutionText && (
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: textColor,
              textAlign: "center",
              lineHeight: 1.2,
              margin: 0,
              marginBottom: 32,
            }}
          >
            {solutionText}
          </h2>
        )}

        {/* CTA */}
        <div
          style={{
            backgroundColor: solveAccent,
            color: "#fff",
            fontSize: 24,
            fontWeight: 800,
            padding: "20px 56px",
            borderRadius: 50,
            letterSpacing: 1,
            opacity: ctaOp,
            transform: `scale(${ctaScale})`,
            boxShadow: `0 8px 32px ${solveAccent}66`,
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
}
