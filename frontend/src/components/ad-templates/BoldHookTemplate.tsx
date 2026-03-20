import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function BoldHookTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#000000",
  textColor = "#ffffff",
  accentColor = "#FF3366",
  screenshotUrl,
  aspectRatio = "1:1",
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
      {/* Gradient overlay from bottom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: screenshotUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 60%, ${backgroundColor} 100%)`
            : `linear-gradient(135deg, ${backgroundColor} 0%, ${adjustBrightness(backgroundColor, -20)} 100%)`,
          zIndex: 1,
        }}
      />

      {/* Product screenshot background */}
      {screenshotUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${screenshotUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            zIndex: 0,
          }}
        />
      )}

      {/* Decorative accent shapes */}
      <div
        style={{
          position: "absolute",
          top: -100 * s,
          right: -100 * s,
          width: 400 * s,
          height: 400 * s,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />

      {/* Content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: `${80 * s}px ${70 * s}px`,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Accent tag */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 16 * s,
            fontWeight: 700,
            padding: `${8 * s}px ${20 * s}px`,
            borderRadius: 6 * s,
            textTransform: "uppercase",
            letterSpacing: 2 * s,
            marginBottom: 24 * s,
          }}
        >
          Stop Scrolling
        </div>

        {/* Big bold headline */}
        <h1
          style={{
            fontSize: 64 * s,
            fontWeight: 900,
            color: textColor,
            lineHeight: 1.05,
            margin: 0,
            marginBottom: 24 * s,
            textTransform: "uppercase",
            letterSpacing: -1 * s,
          }}
        >
          {headline}
        </h1>

        {/* Accent underline */}
        <div
          style={{
            width: 100 * s,
            height: 6 * s,
            backgroundColor: accentColor,
            borderRadius: 3 * s,
            marginBottom: 24 * s,
          }}
        />

        {/* Supporting text */}
        <p
          style={{
            fontSize: 24 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.8,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 40 * s,
            maxWidth: 700 * s,
          }}
        >
          {body}
        </p>

        {/* CTA button */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 22 * s,
            fontWeight: 800,
            padding: `${18 * s}px ${48 * s}px`,
            borderRadius: 50 * s,
            letterSpacing: 1 * s,
            boxShadow: `0 ${8 * s}px ${32 * s}px ${accentColor}66`,
          }}
        >
          {cta} →
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
