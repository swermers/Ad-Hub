import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, PALETTE, SPACE, SHADOWS, DEPTH, TIMING, isLightColor } from "./swissDesign";
import {
  safeTruncate,
  springProgress,
  springSlideUp,
  springScale,
  springBlurIn,
  springStagger,
  animatedMeshGradient,
  breathe,
  kineticEntrance,
  letterSpacingReveal,
  parallaxOffset,
  generateParticles,
} from "./animationUtils";
import { IconArrowRight } from "./icons";

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
 * Uses spring physics for all motion, Sequence for scene management,
 * and animated mesh gradient background for depth.
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
  const headlineColor = isCardLight ? PALETTE.dark : PALETTE.light;
  const emphasisColor = isCardLight ? PALETTE.light : PALETTE.dark;

  // Card geometry
  const cardInset = Math.round(width * 0.04);
  const cardRadius = Math.round(width * 0.04);
  const notchSize = Math.round(width * 0.04);
  const cardPadding = Math.round(width * 0.08);

  // Text safety
  const safeHeadline = safeTruncate(headline, 30);
  const safeBody = safeTruncate(body, 60);

  // Split headline into words
  const words = safeHeadline.split(/\s+/);
  const bodyWords = safeBody.trim().split(/\s+/);
  const useBodyAsEmphasis = bodyWords.length <= 3 && safeBody.trim().length <= 20;
  const emphasisText = useBodyAsEmphasis ? safeBody.trim() : null;

  // Headline font size
  const hlSize = safeHeadline.length > 18
    ? Math.round(width * 0.09)
    : Math.round(width * 0.115);

  // --- Spring-based animations ---

  // Scene 1: Card entrance (spring heavy — weighty card sliding in)
  const cardSpring = springProgress(frame, fps, 0, "heavy");

  // Scene 2: Word cascade (staggered springs)
  const wordSprings = springStagger(frame, fps, words.length, Math.round(fps * 0.2), 3, "snappy");

  // Scene 3: Emphasis reveal (blur-in for premium feel)
  const emphasisAnim = springBlurIn(frame, fps, Math.round(fps * 0.8), 10, "smooth");

  // Scene 4: Subtitle slide
  const subtitleAnim = springSlideUp(frame, fps, Math.round(fps * 1.3), 25, "snappy");

  // Scene 5: Arrow CTA (pop spring for snappy entrance)
  const arrowAnim = springScale(frame, fps, Math.round(fps * 1.8), 0.5, "pop");

  // Attribution fade
  const attrSpring = springProgress(frame, fps, Math.round(fps * 2.0), "smooth");

  // Emphasis breathing pulse after entrance
  const emphasisScale = breathe(frame, Math.round(fps * 2.5), fps * 2, 0.03);

  // Animated mesh gradient background
  const meshBg = animatedMeshGradient(frame, fps, backgroundColor, accentColor, 0.12);

  // Parallax: background shifts slowly, card foreground faster
  const bgParallax = parallaxOffset(frame, fps, 5, DEPTH.background, 15);
  const fgParallax = parallaxOffset(frame, fps, 5, DEPTH.foreground, 8);

  // Floating particles in background
  const particles = generateParticles(12, frame, fps, width, height);

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        background: meshBg,
        fontFamily: font,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background parallax layer */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          background: meshBg,
          transform: `translateY(${bgParallax}px)`,
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
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Scene 1: Card entrance */}
      <Sequence from={0} layout="none">
        <div
          style={{
            position: "absolute",
            left: cardInset,
            right: cardInset,
            top: cardInset,
            bottom: cardInset,
            backgroundColor: cardBg,
            borderRadius: cardRadius,
            opacity: Math.min(cardSpring * 2, 1),
            transform: `scale(${0.9 + 0.1 * cardSpring}) translateY(${fgParallax}px)`,
            overflow: "hidden",
            boxShadow: `0 ${20 * cardSpring}px ${60 * cardSpring}px rgba(0,0,0,0.3), ${SHADOWS.cinematicGlow(accentColor, 0.15 * cardSpring)}`,
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
            {/* Scene 2: Headline word cascade with spring physics */}
            <Sequence from={Math.round(fps * 0.15)} layout="none">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: `${Math.round(width * 0.012)}px ${Math.round(width * 0.02)}px`,
                }}
              >
                {words.map((word, i) => {
                  const progress = wordSprings[i] ?? 0;
                  const kinetic = kineticEntrance(progress);
                  const ls = letterSpacingReveal(progress, 0.15, 0);
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: hlSize,
                        fontWeight: 900,
                        lineHeight: 1.0,
                        letterSpacing: ls,
                        color: headlineColor,
                        textTransform: "uppercase",
                        opacity: Math.min(progress * 1.5, 1),
                        transform: `translateY(${40 * (1 - progress)}px) ${kinetic.transform}`,
                        textShadow: kinetic.textShadow,
                        display: "inline-block",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </Sequence>

            {/* Scene 3: Emphasis word — blur-in reveal */}
            {emphasisText && (
              <Sequence from={Math.round(fps * 0.7)} layout="none">
                <div
                  style={{
                    marginTop: SPACE.md,
                    opacity: emphasisAnim.opacity,
                    filter: emphasisAnim.filter,
                    transform: `${emphasisAnim.transform} scale(${emphasisScale})`,
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
              </Sequence>
            )}

            {/* Scene 4: Subtitle line */}
            <Sequence from={Math.round(fps * 1.2)} layout="none">
              <div
                style={{
                  marginTop: SPACE.lg,
                  opacity: subtitleAnim.opacity,
                  transform: subtitleAnim.transform,
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
                  {useBodyAsEmphasis ? cta : safeBody}
                </p>

                {/* Scene 5: Arrow CTA — pop spring */}
                <Sequence from={Math.round(fps * 0.5)} layout="none">
                  <div
                    style={{
                      opacity: arrowAnim.opacity,
                      transform: arrowAnim.transform,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <IconArrowRight
                      size={Math.round(width * 0.06)}
                      color={headlineColor}
                      strokeWidth={3}
                    />
                  </div>
                </Sequence>
              </div>
            </Sequence>
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
              opacity: attrSpring * 0.5,
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
      </Sequence>
    </AbsoluteFill>
  );
}
