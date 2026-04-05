import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function CarouselCardTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#18181b",
  textColor = "#ffffff",
  accentColor = "#ec4899",
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
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(160deg, ${backgroundColor} 0%, ${adjustBrightness(backgroundColor, 15)} 100%)`,
        }}
      />

      {/* Accent glow in corner */}
      <div
        style={{
          position: "absolute",
          top: -200 * s,
          right: -200 * s,
          width: 500 * s,
          height: 500 * s,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Number / Step indicator */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: `${60 * s}px ${60 * s}px ${0}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 120 * s,
            fontWeight: 900,
            color: accentColor,
            opacity: 0.2,
            lineHeight: 1,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          01
        </div>

        {/* Carousel dots indicator */}
        <div
          style={{
            display: "flex",
            gap: 8 * s,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === 0 ? 24 * s : 8 * s,
                height: 8 * s,
                borderRadius: 4 * s,
                backgroundColor: i === 0 ? accentColor : `${textColor}33`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Product image area */}
      {screenshotUrl && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            margin: `${20 * s}px ${60 * s}px`,
            flex: "0 1 auto",
            maxHeight: "40%",
            borderRadius: 16 * s,
            overflow: "hidden",
            boxShadow: `0 ${8 * s}px ${32 * s}px rgba(0,0,0,0.3)`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${screenshotUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: screenshotUrl ? "flex-start" : "center",
          padding: `${screenshotUrl ? 20 : 0}px ${60 * s}px ${60 * s}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 46 * s,
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
            opacity: 0.6,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 32 * s,
          }}
        >
          {body}
        </p>

        {/* CTA row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16 * s,
          }}
        >
          <div
            style={{
              backgroundColor: accentColor,
              color: "#ffffff",
              fontSize: 18 * s,
              fontWeight: 700,
              padding: `${14 * s}px ${36 * s}px`,
              borderRadius: 10 * s,
            }}
          >
            {cta}
          </div>
          <span
            style={{
              fontSize: 24 * s,
              color: textColor,
              opacity: 0.4,
            }}
          >
            →
          </span>
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
