import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function StatProofTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#ffffff",
  textColor = "#1a1a1a",
  accentColor = "#2563eb",
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width: size, height } = getDimensions(aspectRatio, scale);

  return (
    <div
      style={{
        width: size,
        height,
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
      {/* Background accent circle */}
      <div
        style={{
          position: "absolute",
          width: 600 * scale,
          height: 600 * scale,
          borderRadius: "50%",
          backgroundColor: accentColor,
          opacity: 0.05,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Stat headline */}
      <h1
        style={{
          fontSize: 96 * scale,
          fontWeight: 900,
          color: accentColor,
          textAlign: "center",
          lineHeight: 1,
          margin: 0,
          marginBottom: 24 * scale,
          position: "relative",
        }}
      >
        {headline}
      </h1>

      {/* Supporting context */}
      <p
        style={{
          fontSize: 30 * scale,
          fontWeight: 500,
          color: textColor,
          textAlign: "center",
          lineHeight: 1.4,
          margin: 0,
          marginBottom: 60 * scale,
          maxWidth: 700 * scale,
          position: "relative",
        }}
      >
        {body}
      </p>

      {/* CTA button */}
      <div
        style={{
          backgroundColor: accentColor,
          color: "#ffffff",
          fontSize: 22 * scale,
          fontWeight: 700,
          padding: `${18 * scale}px ${50 * scale}px`,
          borderRadius: 12 * scale,
          textTransform: "uppercase",
          letterSpacing: 2 * scale,
          position: "relative",
        }}
      >
        {cta}
      </div>
    </div>
  );
}
