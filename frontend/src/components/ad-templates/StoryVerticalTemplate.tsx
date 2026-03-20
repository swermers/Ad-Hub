import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function StoryVerticalTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#0f172a",
  textColor = "#ffffff",
  accentColor = "#f59e0b",
  screenshotUrl,
  aspectRatio = "9:16",
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
      {/* Full background image if available */}
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

      {/* Dark overlay gradient - heavier at bottom for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: screenshotUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.9) 75%, ${backgroundColor} 100%)`
            : `linear-gradient(180deg, ${backgroundColor} 0%, ${adjustBrightness(backgroundColor, -10)} 100%)`,
          zIndex: 1,
        }}
      />

      {/* Top area - branding / hook */}
      <div
        style={{
          padding: `${80 * s}px ${50 * s}px ${40 * s}px`,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Glowing accent dot */}
        <div
          style={{
            width: 16 * s,
            height: 16 * s,
            borderRadius: "50%",
            backgroundColor: accentColor,
            boxShadow: `0 0 ${20 * s}px ${accentColor}`,
            marginBottom: 20 * s,
          }}
        />

        {/* Top label */}
        <div
          style={{
            fontSize: 16 * s,
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: 3 * s,
          }}
        >
          Swipe Up
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, position: "relative", zIndex: 2 }} />

      {/* Bottom content area */}
      <div
        style={{
          padding: `${40 * s}px ${50 * s}px ${100 * s}px`,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Big headline */}
        <h1
          style={{
            fontSize: 56 * s,
            fontWeight: 900,
            color: textColor,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 20 * s,
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
            opacity: 0.75,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 36 * s,
          }}
        >
          {body}
        </p>

        {/* CTA button - full width for stories */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#000000",
            fontSize: 22 * s,
            fontWeight: 800,
            padding: `${20 * s}px`,
            borderRadius: 14 * s,
            textAlign: "center",
            letterSpacing: 1 * s,
            boxShadow: `0 ${4 * s}px ${32 * s}px ${accentColor}44`,
          }}
        >
          {cta}
        </div>

        {/* Swipe indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 24 * s,
          }}
        >
          <div
            style={{
              width: 40 * s,
              height: 5 * s,
              backgroundColor: textColor,
              opacity: 0.3,
              borderRadius: 3 * s,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
