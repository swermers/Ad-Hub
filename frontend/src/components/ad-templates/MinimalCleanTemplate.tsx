import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function MinimalCleanTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  accentColor = "#000000",
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
      {/* Top section with product image */}
      <div
        style={{
          flex: screenshotUrl ? "0 0 50%" : "0 0 30%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {screenshotUrl ? (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${screenshotUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 80 * s,
                background: `linear-gradient(transparent, ${backgroundColor})`,
              }}
            />
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              paddingTop: 60 * s,
            }}
          >
            {/* Geometric accent */}
            <div
              style={{
                width: 200 * s,
                height: 4 * s,
                backgroundColor: accentColor,
              }}
            />
          </div>
        )}
      </div>

      {/* Text content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${40 * s}px ${80 * s}px ${60 * s}px`,
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 52 * s,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 20 * s,
            letterSpacing: -1.5 * s,
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
            opacity: 0.55,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 40 * s,
            maxWidth: 700 * s,
          }}
        >
          {body}
        </p>

        {/* CTA - minimal style */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 12 * s,
            backgroundColor: accentColor,
            color: backgroundColor === "#ffffff" ? "#ffffff" : textColor,
            fontSize: 18 * s,
            fontWeight: 600,
            padding: `${14 * s}px ${36 * s}px`,
            borderRadius: 8 * s,
          }}
        >
          {cta}
          <span style={{ fontSize: 20 * s }}>→</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          height: 4 * s,
          backgroundColor: accentColor,
        }}
      />
    </div>
  );
}
