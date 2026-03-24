/**
 * SaaS Product Demo Composition
 *
 * Simulates a product UI demo with:
 * - Browser chrome frame with address bar
 * - Screenshot zoom-in with cursor animation
 * - Feature highlight callouts with icon badges
 * - Smooth camera pan effect
 *
 * Best for: B2B SaaS, app demos, feature showcases
 * Duration: 8 seconds @ 30fps
 */

import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";
import { TYPE, isLightColor } from "./swissDesign";
import { IconCheck, IconZap, IconArrowRight } from "./icons";
import {
  fadeSlideUp,
  drawProgress,
  scaleEntrance,
  EASE_OUT,
  responsiveFontSize,
  safeTruncate,
} from "./animationUtils";

interface SaasDemoProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
  /** Pipe-delimited feature list (e.g. "Fast setup|Auto-sync|Real-time") */
  features?: string;
}

const FPS = 30;

export function SaasDemoComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0f0f12",
  textColor = "#ffffff",
  accentColor = "#6366f1",
  screenshotUrl,
  aspectRatio = "1:1",
  brandFont,
  features,
}: SaasDemoProps) {
  const frame = useCurrentFrame();
  const { width, height } = ASPECT_DIMENSIONS[aspectRatio];
  const font = brandFont || TYPE.fontFamily;
  const isDark = !isLightColor(backgroundColor);
  const chromeBg = isDark ? "#1a1a1f" : "#e8e8ec";
  const chromeText = isDark ? "#a0a0a4" : "#666668";

  // Parse features
  const featureList = features
    ? features.split("|").map((f) => f.trim()).filter(Boolean)
    : body.split(/[,.]/).map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 3);

  // ─── Timeline (frames) ───
  const PHASE = {
    browserEntrance: [0, FPS * 0.8],
    urlType: [FPS * 0.6, FPS * 1.5],
    screenshotReveal: [FPS * 1.2, FPS * 2.2],
    cursorMove: [FPS * 2.2, FPS * 3.5],
    zoomIn: [FPS * 3.2, FPS * 4.5],
    featureCallouts: [FPS * 4.0, FPS * 6.0],
    ctaEntrance: [FPS * 6.0, FPS * 7.0],
    headlineReveal: [FPS * 5.5, FPS * 7.0],
  };

  // Browser frame entrance
  const browserScale = interpolate(frame, PHASE.browserEntrance, [0.92, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT,
  });
  const browserOpacity = interpolate(frame, PHASE.browserEntrance, [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Screenshot zoom
  const screenshotScale = interpolate(frame, PHASE.zoomIn, [1, 1.15], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT,
  });
  const screenshotX = interpolate(frame, PHASE.zoomIn, [0, -40], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT,
  });

  // Cursor position
  const cursorX = interpolate(frame, PHASE.cursorMove, [width * 0.3, width * 0.55], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const cursorY = interpolate(frame, PHASE.cursorMove, [height * 0.45, height * 0.35], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const cursorOpacity = interpolate(frame, [PHASE.cursorMove[0] - 5, PHASE.cursorMove[0], PHASE.zoomIn[1], PHASE.zoomIn[1] + 10], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // URL typing animation
  const urlChars = Math.floor(interpolate(frame, PHASE.urlType, [0, 18], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
  const urlText = "app.yourproduct.co".slice(0, urlChars);

  // Feature callout progress
  const iconProgress = drawProgress(frame, PHASE.featureCallouts[0], FPS * 0.6);

  // CTA entrance
  const ctaAnim = fadeSlideUp(frame, PHASE.ctaEntrance[0], FPS * 0.6, 30);
  const headlineAnim = fadeSlideUp(frame, PHASE.headlineReveal[0], FPS * 0.8, 50);

  const browserPadding = width * 0.06;
  const chromeHeight = 52;

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: font, overflow: "hidden" }}>
      {/* Subtle grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(${accentColor}15 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        opacity: 0.4,
      }} />

      {/* Browser window */}
      <div style={{
        position: "absolute",
        top: height * 0.06,
        left: browserPadding,
        right: browserPadding,
        bottom: height * 0.25,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
        boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}22`,
        transform: `scale(${browserScale})`,
        opacity: browserOpacity,
      }}>
        {/* Chrome bar */}
        <div style={{
          height: chromeHeight,
          backgroundColor: chromeBg,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"}`,
        }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
            ))}
          </div>
          {/* Address bar */}
          <div style={{
            flex: 1,
            height: 30,
            borderRadius: 8,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 12,
          }}>
            <span style={{ fontSize: 13, color: chromeText, fontFamily: "monospace" }}>
              {urlText}
              <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: accentColor }}>|</span>
            </span>
          </div>
        </div>

        {/* Screenshot content area */}
        <div style={{
          position: "relative",
          width: "100%",
          height: `calc(100% - ${chromeHeight}px)`,
          overflow: "hidden",
          backgroundColor: isDark ? "#111114" : "#f5f5f7",
        }}>
          {screenshotUrl ? (
            <Img
              src={screenshotUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${screenshotScale}) translateX(${screenshotX}px)`,
              }}
            />
          ) : (
            /* Placeholder UI skeleton */
            <div style={{ padding: 32 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                {[0.6, 0.3, 0.4].map((w, i) => (
                  <div key={i} style={{
                    height: 12, width: `${w * 100}%`,
                    borderRadius: 6,
                    backgroundColor: `${accentColor}${i === 0 ? "30" : "15"}`,
                  }} />
                ))}
              </div>
              {[0.8, 0.65, 0.72, 0.5].map((w, i) => (
                <div key={i} style={{
                  height: 10, width: `${w * 100}%`,
                  borderRadius: 5,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  marginBottom: 12,
                }} />
              ))}
              <div style={{
                marginTop: 24,
                width: 120, height: 36, borderRadius: 8,
                backgroundColor: accentColor,
                opacity: 0.3,
              }} />
            </div>
          )}

          {/* Click ripple at cursor position */}
          {frame >= PHASE.cursorMove[1] - 5 && frame <= PHASE.cursorMove[1] + 15 && (
            <div style={{
              position: "absolute",
              left: cursorX - browserPadding - 20,
              top: cursorY - height * 0.06 - chromeHeight - 20,
              width: 40, height: 40,
              borderRadius: "50%",
              border: `2px solid ${accentColor}`,
              opacity: interpolate(frame, [PHASE.cursorMove[1] - 5, PHASE.cursorMove[1] + 15], [0.8, 0], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
              transform: `scale(${interpolate(frame, [PHASE.cursorMove[1] - 5, PHASE.cursorMove[1] + 15], [0.5, 2.5], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              })})`,
            }} />
          )}
        </div>
      </div>

      {/* Animated cursor */}
      <div style={{
        position: "absolute",
        left: cursorX,
        top: cursorY,
        opacity: cursorOpacity,
        transform: "translate(-2px, -2px)",
        filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
        zIndex: 50,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill={textColor} stroke="none">
          <path d="M5 3l14 8-6.5 1.5L11 19z" />
        </svg>
      </div>

      {/* Feature callouts */}
      {featureList.slice(0, 3).map((feature, i) => {
        const calloutStart = PHASE.featureCallouts[0] + i * FPS * 0.5;
        const anim = scaleEntrance(frame, calloutStart, FPS * 0.4, 0.7);
        const yPos = height * 0.12 + i * 56;

        return (
          <div key={i} style={{
            position: "absolute",
            right: width * 0.05,
            top: yPos,
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: `${accentColor}18`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 10,
            padding: "8px 14px",
            opacity: anim.opacity,
            transform: anim.transform,
            zIndex: 30,
          }}>
            <IconCheck
              size={18}
              color={accentColor}
              progress={drawProgress(frame, calloutStart + 5, FPS * 0.3)}
            />
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: textColor,
              letterSpacing: -0.3,
            }}>
              {safeTruncate(feature, 20)}
            </span>
          </div>
        );
      })}

      {/* Bottom section: headline + CTA */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `${height * 0.04}px ${browserPadding}px`,
        background: `linear-gradient(transparent, ${backgroundColor}ee 30%, ${backgroundColor})`,
      }}>
        <div style={{
          fontSize: responsiveFontSize(headline, 48, 30),
          fontWeight: 800,
          color: textColor,
          letterSpacing: -1.5,
          lineHeight: 1.0,
          marginBottom: 16,
          ...headlineAnim,
        }}>
          {safeTruncate(headline, 40)}
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: accentColor,
          color: isLightColor(accentColor) ? "#111" : "#fff",
          padding: "12px 24px",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.5,
          ...ctaAnim,
        }}>
          {safeTruncate(cta, 20)}
          <IconArrowRight size={18} color={isLightColor(accentColor) ? "#111" : "#fff"} progress={iconProgress} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
