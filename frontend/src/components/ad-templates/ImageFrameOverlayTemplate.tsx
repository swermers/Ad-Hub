import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

// Badge styles: "sale", "new", "best-seller", "limited", "featured"

export function ImageFrameOverlayTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#0a0a0c",
  textColor = "#f0f0f5",
  accentColor = "#FF3366",
  screenshotUrl,
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  const padding = 60 * s;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Full-bleed product screenshot background */}
      {screenshotUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${screenshotUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
          }}
        />
      )}

      {/* Subtle vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.4) 100%)
          `,
          zIndex: 1,
        }}
      />

      {/* Badge / ribbon — top-left */}
      <div
        style={{
          position: "absolute",
          top: 40 * s,
          left: 36 * s,
          zIndex: 3,
          transform: "rotate(-3deg)",
          transformOrigin: "top left",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 22 * s,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 2.5 * s,
            padding: `${14 * s}px ${32 * s}px`,
            borderRadius: 8 * s,
            boxShadow: `0 ${6 * s}px ${24 * s}px rgba(0,0,0,0.45), 0 ${2 * s}px ${8 * s}px ${accentColor}55`,
            lineHeight: 1.2,
          }}
        >
          {headline}
        </div>
      </div>

      {/* Frosted glass strip at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: `${32 * s}px ${padding}px ${40 * s}px`,
          borderTop: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        {/* Body text */}
        <p
          style={{
            fontSize: 22 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.9,
            lineHeight: 1.55,
            margin: 0,
            marginBottom: 28 * s,
            maxWidth: 800 * s,
          }}
        >
          {body}
        </p>

        {/* CTA pill button */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 20 * s,
            fontWeight: 700,
            padding: `${14 * s}px ${40 * s}px`,
            borderRadius: 50 * s,
            letterSpacing: 0.8 * s,
            boxShadow: `0 ${4 * s}px ${20 * s}px ${accentColor}55`,
          }}
        >
          {cta} &rarr;
        </div>
      </div>
    </div>
  );
}
