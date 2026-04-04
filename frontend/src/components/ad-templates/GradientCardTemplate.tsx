import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";
import { GrainOverlay, NoiseGradient } from "./textures";

export function GradientCardTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#0a0a1a",
  textColor = "#ffffff",
  accentColor = "#7c3aed",
  screenshotUrl,
  imageUrl,
  aspectRatio = "4:5",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Gradient mesh background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 50%, ${accentColor}33 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, ${accentColor}22 0%, transparent 40%),
            radial-gradient(ellipse at 60% 80%, ${shiftHue(accentColor)}22 0%, transparent 40%)
          `,
        }}
      />

      {/* Premium texture overlays */}
      <GrainOverlay opacity={0.25} />
      <NoiseGradient opacity={0.15} color={accentColor} />

      {/* Floating card with product shot */}
      <div
        style={{
          flex: aspectRatio === "9:16" ? "0 0 45%" : "0 0 50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          padding: `${60 * s}px ${60 * s}px ${20 * s}px`,
        }}
      >
        <div
          style={{
            width: "85%",
            height: "90%",
            borderRadius: 24 * s,
            overflow: "hidden",
            boxShadow: `0 ${20 * s}px ${60 * s}px rgba(0,0,0,0.4), 0 0 ${80 * s}px ${accentColor}33`,
            border: `1px solid rgba(255,255,255,0.1)`,
            backgroundColor: "#1a1a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {(imageUrl || screenshotUrl) ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${imageUrl || screenshotUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          ) : (
            <div
              style={{
                width: "80%",
                height: "80%",
                borderRadius: 16 * s,
                background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}11)`,
                border: `1px solid ${accentColor}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 60 * s,
                  height: 60 * s,
                  borderRadius: 16 * s,
                  backgroundColor: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28 * s,
                  color: "#fff",
                  fontWeight: 900,
                }}
              >
                ▶
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Text content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${20 * s}px ${70 * s}px ${60 * s}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 48 * s,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 16 * s,
          }}
        >
          {headline}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: 22 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.7,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 36 * s,
            maxWidth: 700 * s,
          }}
        >
          {body}
        </p>

        {/* CTA with gradient */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            background: `linear-gradient(135deg, ${accentColor}, ${shiftHue(accentColor)})`,
            color: "#ffffff",
            fontSize: 20 * s,
            fontWeight: 700,
            padding: `${16 * s}px ${44 * s}px`,
            borderRadius: 50 * s,
            letterSpacing: 0.5 * s,
            boxShadow: `0 ${4 * s}px ${24 * s}px ${accentColor}55`,
          }}
        >
          {cta}
        </div>
      </div>
    </div>
  );
}

function shiftHue(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + 40);
  const g = Math.max(0, ((num >> 8) & 0xff) - 20);
  const b = Math.min(255, (num & 0xff) + 60);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
