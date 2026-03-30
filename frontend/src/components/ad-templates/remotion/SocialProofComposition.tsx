/**
 * Social Proof Short Composition
 *
 * UGC-style video ad with animated social proof overlays:
 * - Star rating animation (fills in sequentially)
 * - Review quote with attribution
 * - User count ticker
 * - Platform-native engagement simulation
 * - "Verified" badge animation
 *
 * Best for: DTC, app marketing, testimonials, social ads
 * Duration: 7 seconds @ 30fps
 *
 * Upgraded to spring physics for organic motion, animated mesh
 * gradient background, vignette overlay, and Sequence-based scenes.
 */

import { AbsoluteFill, Img, Sequence, useCurrentFrame, interpolate } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";
import { TYPE, isLightColor } from "./swissDesign";
import { IconStar, IconUsers, IconCheck, IconArrowRight } from "./icons";
import {
  animatedCounter,
  drawProgress,
  springSlideUp,
  springScale,
  springBlurIn,
  springStagger,
  animatedMeshGradient,
  vignetteOverlay,
  breathe,
  shiftHue,
  responsiveFontSize,
  safeTruncate,
} from "./animationUtils";

interface SocialProofProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
  /** Star rating 1-5 (default 5) */
  rating?: number;
  /** Review count (e.g. "2,847") */
  reviewCount?: string;
  /** User/customer count (e.g. "50000") */
  userCount?: string;
}

const FPS = 30;

export function SocialProofComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0f0f12",
  textColor = "#ffffff",
  accentColor = "#f59e0b",
  screenshotUrl,
  aspectRatio = "9:16",
  brandFont,
  rating = 5,
  reviewCount,
  userCount,
}: SocialProofProps) {
  const frame = useCurrentFrame();
  const { width, height } = ASPECT_DIMENSIONS[aspectRatio];
  const font = brandFont || TYPE.fontFamily;
  const starColor = "#fbbf24";

  const numReviews = parseInt(reviewCount || "2847", 10);
  const numUsers = parseInt(userCount || "50000", 10);

  // ─── Timeline (frame offsets for Sequence + spring delays) ───
  const SCENE = {
    bgReveal: 0,
    quoteMark: Math.round(FPS * 0.3),
    headlineReveal: Math.round(FPS * 0.8),
    bodyReveal: Math.round(FPS * 1.5),
    starsEntrance: Math.round(FPS * 2.5),
    reviewBadge: Math.round(FPS * 3.5),
    userCounter: Math.round(FPS * 3.8),
    verifiedBadge: Math.round(FPS * 4.5),
    ctaEntrance: Math.round(FPS * 5.5),
  };

  const padding = width * 0.08;

  // ─── Spring animations ───

  // Quote mark — bouncy pop
  const quoteAnim = springScale(frame, FPS, SCENE.quoteMark, 0.5, "bouncy");

  // Headline — blur-in reveal for premium feel
  const headlineAnim = springBlurIn(frame, FPS, SCENE.headlineReveal, 12, "smooth");

  // Body text — spring slide up
  const bodyAnim = springSlideUp(frame, FPS, SCENE.bodyReveal, 25, "snappy");

  // Stars — staggered spring entrance
  const starProgressValues = springStagger(frame, FPS, 5, SCENE.starsEntrance, 4, "pop");

  // Review badge — bouncy scale
  const badgeAnim = springScale(frame, FPS, SCENE.reviewBadge, 0.8, "bouncy");

  // Verified badge — bouncy scale
  const verifiedAnim = springScale(frame, FPS, SCENE.verifiedBadge, 0.7, "bouncy");

  // CTA — spring slide up + breathe pulse
  const ctaSlide = springSlideUp(frame, FPS, SCENE.ctaEntrance, 30, "snappy");
  const ctaBreathScale = breathe(frame, SCENE.ctaEntrance + 15, 60, 0.02);

  // User counter (animates from 0 to target)
  const counterValue = animatedCounter(frame, SCENE.userCounter, FPS * 1.5, numUsers);

  // ─── Background ───
  const meshBg = animatedMeshGradient(frame, FPS, backgroundColor, accentColor, 0.15);
  const vignette = vignetteOverlay(0.5);

  // Hue-shifted accent for gradient variety
  const accentShifted = shiftHue(accentColor, 30);

  // Format large numbers (50000 → "50K+")
  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
    if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
    return `${n}+`;
  };

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: font, overflow: "hidden" }}>
      {/* Animated mesh gradient background */}
      <div style={{ position: "absolute", inset: 0, background: meshBg }} />

      {/* Background image (UGC style) */}
      <Sequence from={SCENE.bgReveal} layout="none">
        {screenshotUrl && (
          <Img
            src={screenshotUrl}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: interpolate(frame, [SCENE.bgReveal, SCENE.bgReveal + Math.round(FPS * 0.6)], [0, 0.15], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
              filter: "blur(30px) saturate(0.6)",
            }}
          />
        )}
      </Sequence>

      {/* Vignette overlay for cinematic depth */}
      <div style={{ position: "absolute", inset: 0, background: vignette }} />

      {/* Top: Verified badge area */}
      <Sequence from={SCENE.userCounter} layout="none">
        <div style={{
          position: "absolute",
          top: height * 0.06,
          left: padding,
          right: padding,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Users counter */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <IconUsers size={20} color={`${textColor}80`} progress={drawProgress(frame, SCENE.userCounter, FPS * 0.4)} />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: `${textColor}80`,
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatCount(counterValue)} users
            </span>
          </div>
        </div>
      </Sequence>

      {/* Verified badge */}
      <Sequence from={SCENE.verifiedBadge} layout="none">
        <div style={{
          position: "absolute",
          top: height * 0.06,
          right: padding,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 20,
          backgroundColor: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          ...verifiedAnim,
        }}>
          <IconCheck size={14} color={accentColor} progress={drawProgress(frame, SCENE.verifiedBadge, FPS * 0.3)} />
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase" as const, letterSpacing: 1 }}>
            Verified
          </span>
        </div>
      </Sequence>

      {/* Center: Quote + headline */}
      <div style={{
        position: "absolute",
        top: height * 0.18,
        left: padding,
        right: padding,
      }}>
        {/* Large quote mark — spring scale */}
        <Sequence from={SCENE.quoteMark} layout="none">
          <div style={{
            fontSize: 120,
            fontWeight: 900,
            color: `${accentColor}25`,
            lineHeight: 0.8,
            fontFamily: "Georgia, serif",
            ...quoteAnim,
          }}>
            {"\u201C"}
          </div>
        </Sequence>

        {/* Headline (the review/testimonial text) — spring blur-in */}
        <Sequence from={SCENE.headlineReveal} layout="none">
          <div style={{
            fontSize: responsiveFontSize(headline, aspectRatio === "9:16" ? 42 : 48, 35),
            fontWeight: 800,
            color: textColor,
            letterSpacing: -1,
            lineHeight: 1.15,
            marginTop: -20,
            ...headlineAnim,
          }}>
            {safeTruncate(headline, 60)}
          </div>
        </Sequence>

        {/* Body (supporting text) — spring slide up */}
        <Sequence from={SCENE.bodyReveal} layout="none">
          <div style={{
            fontSize: 17,
            fontWeight: 400,
            color: `${textColor}80`,
            lineHeight: 1.5,
            marginTop: 20,
            ...bodyAnim,
          }}>
            {safeTruncate(body, 80)}
          </div>
        </Sequence>
      </div>

      {/* Star rating row — spring stagger */}
      <Sequence from={SCENE.starsEntrance} layout="none">
        <div style={{
          position: "absolute",
          top: height * 0.60,
          left: padding,
          right: padding,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const progress = starProgressValues[i];
              const scale = 0.3 + 0.7 * progress;
              const isFilled = i < rating;

              return (
                <div key={i} style={{
                  opacity: Math.min(progress * 2, 1),
                  transform: `scale(${scale})`,
                }}>
                  <IconStar
                    size={32}
                    color={isFilled ? starColor : `${textColor}20`}
                    progress={isFilled ? progress : 1}
                  />
                  {/* Fill the star on draw */}
                  {isFilled && (
                    <svg width={32} height={32} viewBox="0 0 24 24" style={{
                      position: "absolute",
                      marginTop: -32,
                      opacity: Math.min(Math.max((progress - 0.4) / 0.6, 0), 1),
                    }}>
                      <polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        fill={starColor}
                      />
                    </svg>
                  )}
                </div>
              );
            })}

            {/* Review count badge — spring scale */}
            <div style={{
              marginLeft: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 6,
              backgroundColor: `${textColor}08`,
              ...badgeAnim,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: `${textColor}60`,
              }}>
                {numReviews.toLocaleString()} reviews
              </span>
            </div>
          </div>
        </div>
      </Sequence>

      {/* Social proof strip */}
      <Sequence from={SCENE.reviewBadge} layout="none">
        <div style={{
          position: "absolute",
          top: height * 0.70,
          left: padding,
          right: padding,
          display: "flex",
          gap: 12,
          opacity: badgeAnim.opacity,
        }}>
          {["Real results", "No BS", "Proven"].map((tag, i) => (
            <div key={i} style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: `1px solid ${i === 1 ? accentShifted : textColor}15`,
              fontSize: 12,
              fontWeight: 600,
              color: `${textColor}50`,
              letterSpacing: 0.3,
            }}>
              {tag}
            </div>
          ))}
        </div>
      </Sequence>

      {/* CTA — spring slide up + breathe pulse */}
      <Sequence from={SCENE.ctaEntrance} layout="none">
        <div style={{
          position: "absolute",
          bottom: height * 0.06,
          left: padding,
          right: padding,
          ...ctaSlide,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: accentColor,
            color: isLightColor(accentColor) ? "#111" : "#fff",
            padding: "16px 28px",
            borderRadius: 14,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 0.5,
            boxShadow: `0 8px 30px ${accentColor}40`,
            width: "100%",
            textAlign: "center" as const,
            transform: `scale(${ctaBreathScale})`,
          }}>
            {safeTruncate(cta, 25)}
            <IconArrowRight size={20} color={isLightColor(accentColor) ? "#111" : "#fff"} progress={1} />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
