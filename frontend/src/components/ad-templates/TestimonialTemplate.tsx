import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function TestimonialTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#fafafa",
  textColor = "#1a1a1a",
  accentColor = "#2563eb",
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
        fontFamily: "'Inter', 'Georgia', serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top accent strip */}
      <div
        style={{
          height: 8 * s,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${80 * s}px ${80 * s}px`,
        }}
      >
        {/* Large quotation mark */}
        <div
          style={{
            fontSize: 160 * s,
            fontWeight: 900,
            color: accentColor,
            opacity: 0.15,
            lineHeight: 0.6,
            marginBottom: 10 * s,
            fontFamily: "Georgia, serif",
          }}
        >
          &ldquo;
        </div>

        {/* Testimonial / Hook text */}
        <h1
          style={{
            fontSize: 44 * s,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.3,
            margin: 0,
            marginBottom: 32 * s,
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          {headline}
        </h1>

        {/* Supporting text */}
        <p
          style={{
            fontSize: 22 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.65,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 40 * s,
            maxWidth: 750 * s,
          }}
        >
          {body}
        </p>

        {/* Divider + "avatar" row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16 * s,
            marginBottom: 40 * s,
          }}
        >
          {/* Avatar circle */}
          {screenshotUrl ? (
            <div
              style={{
                width: 56 * s,
                height: 56 * s,
                borderRadius: "50%",
                backgroundImage: `url(${screenshotUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: `3px solid ${accentColor}`,
              }}
            />
          ) : (
            <div
              style={{
                width: 56 * s,
                height: 56 * s,
                borderRadius: "50%",
                backgroundColor: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22 * s,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              ★
            </div>
          )}
          <div>
            <div
              style={{
                display: "flex",
                gap: 4 * s,
                marginBottom: 4 * s,
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  style={{
                    color: "#FFC107",
                    fontSize: 20 * s,
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span
              style={{
                fontSize: 14 * s,
                color: textColor,
                opacity: 0.5,
                fontWeight: 500,
              }}
            >
              Verified Customer
            </span>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 20 * s,
            fontWeight: 700,
            padding: `${16 * s}px ${44 * s}px`,
            borderRadius: 10 * s,
            letterSpacing: 0.5 * s,
          }}
        >
          {cta}
        </div>
      </div>
    </div>
  );
}
