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
 */

import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";
import { TYPE, isLightColor } from "./swissDesign";
import { IconStar, IconUsers, IconCheck, IconArrowRight } from "./icons";
import {
  fadeSlideUp,
  scaleEntrance,
  animatedCounter,
  drawProgress,
  staggerFrame,
  EASE_OUT,
  EASE_OUT_BACK,
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

  // ─── Timeline ───
  const PHASE = {
    bgReveal: [0, FPS * 0.6],
    quoteMark: [FPS * 0.3, FPS * 1.0],
    headlineReveal: [FPS * 0.8, FPS * 2.0],
    bodyReveal: [FPS * 1.5, FPS * 2.5],
    starsEntrance: [FPS * 2.5, FPS * 3.8],
    reviewBadge: [FPS * 3.5, FPS * 4.3],
    userCounter: [FPS * 3.8, FPS * 5.5],
    verifiedBadge: [FPS * 4.5, FPS * 5.2],
    ctaEntrance: [FPS * 5.5, FPS * 6.3],
  };

  const padding = width * 0.08;

  // Quote mark
  const quoteAnim = scaleEntrance(frame, PHASE.quoteMark[0], FPS * 0.5, 0.5);
  // Headline
  const headlineAnim = fadeSlideUp(frame, PHASE.headlineReveal[0], FPS * 0.7, 40);
  // Body
  const bodyAnim = fadeSlideUp(frame, PHASE.bodyReveal[0], FPS * 0.5, 25);
  // Review badge
  const badgeAnim = scaleEntrance(frame, PHASE.reviewBadge[0], FPS * 0.4, 0.8);
  // Verified
  const verifiedAnim = scaleEntrance(frame, PHASE.verifiedBadge[0], FPS * 0.3, 0.7);
  // CTA
  const ctaAnim = fadeSlideUp(frame, PHASE.ctaEntrance[0], FPS * 0.5, 30);

  // User counter (animates from 0 to target)
  const counterValue = animatedCounter(frame, PHASE.userCounter[0], FPS * 1.5, numUsers);

  // Format large numbers (50000 → "50K+")
  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
    if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
    return `${n}+`;
  };

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: font, overflow: "hidden" }}>
      {/* Background image (UGC style) */}
      {screenshotUrl && (
        <Img
          src={screenshotUrl}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: interpolate(frame, PHASE.bgReveal, [0, 0.15], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
            filter: "blur(30px) saturate(0.6)",
          }}
        />
      )}

      {/* Vignette overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, ${backgroundColor}99 0%, ${backgroundColor}dd 40%, ${backgroundColor}ff 100%)`,
      }} />

      {/* Top: Verified badge area */}
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
          opacity: frame >= PHASE.userCounter[0] ? 1 : 0,
        }}>
          <IconUsers size={20} color={`${textColor}80`} progress={drawProgress(frame, PHASE.userCounter[0], FPS * 0.4)} />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: `${textColor}80`,
            fontVariantNumeric: "tabular-nums",
          }}>
            {formatCount(counterValue)} users
          </span>
        </div>

        {/* Verified badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 20,
          backgroundColor: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          ...verifiedAnim,
        }}>
          <IconCheck size={14} color={accentColor} progress={drawProgress(frame, PHASE.verifiedBadge[0], FPS * 0.3)} />
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase" as const, letterSpacing: 1 }}>
            Verified
          </span>
        </div>
      </div>

      {/* Center: Quote + headline */}
      <div style={{
        position: "absolute",
        top: height * 0.18,
        left: padding,
        right: padding,
      }}>
        {/* Large quote mark */}
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

        {/* Headline (the review/testimonial text) */}
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

        {/* Body (supporting text) */}
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
      </div>

      {/* Star rating row */}
      <div style={{
        position: "absolute",
        top: height * 0.60,
        left: padding,
        right: padding,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const starStart = staggerFrame(PHASE.starsEntrance[0], i, 4);
            const starAnim = scaleEntrance(frame, starStart, FPS * 0.3, 0.3);
            const isFilled = i < rating;

            return (
              <div key={i} style={{ ...starAnim }}>
                <IconStar
                  size={32}
                  color={isFilled ? starColor : `${textColor}20`}
                  progress={isFilled ? drawProgress(frame, starStart, FPS * 0.3) : 1}
                />
                {/* Fill the star on draw */}
                {isFilled && (
                  <svg width={32} height={32} viewBox="0 0 24 24" style={{
                    position: "absolute",
                    marginTop: -32,
                    opacity: drawProgress(frame, starStart + 5, FPS * 0.2),
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

          {/* Review count badge */}
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

      {/* Social proof strip */}
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
            border: `1px solid ${textColor}15`,
            fontSize: 12,
            fontWeight: 600,
            color: `${textColor}50`,
            letterSpacing: 0.3,
          }}>
            {tag}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute",
        bottom: height * 0.06,
        left: padding,
        right: padding,
        ...ctaAnim,
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
        }}>
          {safeTruncate(cta, 25)}
          <IconArrowRight size={20} color={isLightColor(accentColor) ? "#111" : "#fff"} progress={1} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
