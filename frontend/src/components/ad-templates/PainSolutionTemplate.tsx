import React from "react";
import type { AdTemplateProps } from "./BeforeAfterTemplate";

export function PainSolutionTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#0f0f23",
  textColor = "#ffffff",
  accentColor = "#6c63ff",
  scale = 1,
}: AdTemplateProps) {
  const size = 1080 * scale;

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
        padding: 80 * scale,
      }}
    >
      {/* Decorative accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6 * scale,
          background: `linear-gradient(90deg, ${accentColor}, #ff6b6b)`,
        }}
      />

      {/* Pain point headline */}
      <h1
        style={{
          fontSize: 52 * scale,
          fontWeight: 800,
          color: textColor,
          textAlign: "center",
          lineHeight: 1.2,
          margin: 0,
          marginBottom: 40 * scale,
        }}
      >
        {headline}
      </h1>

      {/* Divider */}
      <div
        style={{
          width: 80 * scale,
          height: 4 * scale,
          backgroundColor: accentColor,
          borderRadius: 2 * scale,
          marginBottom: 40 * scale,
        }}
      />

      {/* Solution body */}
      <p
        style={{
          fontSize: 28 * scale,
          fontWeight: 400,
          color: textColor,
          opacity: 0.85,
          textAlign: "center",
          lineHeight: 1.5,
          margin: 0,
          marginBottom: 60 * scale,
          maxWidth: 800 * scale,
        }}
      >
        {body}
      </p>

      {/* CTA button */}
      <div
        style={{
          backgroundColor: accentColor,
          color: "#ffffff",
          fontSize: 24 * scale,
          fontWeight: 700,
          padding: `${20 * scale}px ${60 * scale}px`,
          borderRadius: 50 * scale,
          letterSpacing: 1 * scale,
        }}
      >
        {cta}
      </div>
    </div>
  );
}
