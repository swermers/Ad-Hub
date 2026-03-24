import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

/**
 * Status Card — Simple, friendly card with large title,
 * optional illustration, and descriptive body text.
 * Inspired by WhatsApp "Status ads" card style.
 */
export function StatusCardTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#ffffff",
  textColor = "#1a1a1a",
  accentColor = "#7C6CEB",
  logoUrl,
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
        padding: `${60 * s}px`,
      }}
    >
      {/* Top section: Headline + optional illustration */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16 * s,
        }}
      >
        {/* Large headline */}
        <h1
          style={{
            fontSize: 52 * s,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.05,
            margin: 0,
            maxWidth: screenshotUrl ? "55%" : "100%",
            letterSpacing: -1 * s,
          }}
        >
          {headline}
        </h1>

        {/* Illustration / image area */}
        {screenshotUrl && (
          <div
            style={{
              width: "35%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={screenshotUrl}
              alt=""
              style={{
                width: "100%",
                objectFit: "contain",
                borderRadius: 16 * s,
              }}
            />
          </div>
        )}

        {/* Decorative circle when no image */}
        {!screenshotUrl && (
          <div
            style={{
              position: "relative",
              width: 120 * s,
              height: 120 * s,
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 100 * s,
                height: 100 * s,
                borderRadius: "50%",
                backgroundColor: accentColor,
                top: 0,
                right: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 80 * s,
                height: 80 * s,
                borderRadius: "50%",
                backgroundColor: `${accentColor}40`,
                bottom: 0,
                left: 0,
              }}
            />
          </div>
        )}
      </div>

      {/* Accent underline */}
      <div
        style={{
          width: 40 * s,
          height: 2 * s,
          backgroundColor: textColor,
          opacity: 0.2,
          marginBottom: 20 * s,
        }}
      />

      {/* Spacer to push body text down */}
      <div style={{ flex: 1 }} />

      {/* Body text at bottom */}
      <p
        style={{
          fontSize: 24 * s,
          fontWeight: 400,
          color: textColor,
          lineHeight: 1.45,
          margin: 0,
          maxWidth: "85%",
        }}
      >
        {body}
      </p>

      {/* CTA link */}
      <div
        style={{
          marginTop: 24 * s,
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 8 * s,
          fontSize: 16 * s,
          fontWeight: 600,
          color: accentColor,
        }}
      >
        {cta}
        <span style={{ fontSize: 18 * s }}>&#8594;</span>
      </div>

      {/* Logo in corner */}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          style={{
            position: "absolute",
            bottom: 40 * s,
            right: 60 * s,
            height: 24 * s,
            objectFit: "contain",
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}
