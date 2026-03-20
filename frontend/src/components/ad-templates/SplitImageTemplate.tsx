import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function SplitImageTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#111827",
  textColor = "#ffffff",
  accentColor = "#10b981",
  screenshotUrl,
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;
  const isVertical = aspectRatio === "9:16";

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        display: "flex",
        flexDirection: isVertical ? "column" : "row",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Image / Visual side */}
      <div
        style={{
          flex: isVertical ? "0 0 45%" : "0 0 48%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {screenshotUrl ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${screenshotUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${accentColor}33 0%, ${accentColor}11 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Decorative pattern */}
            <div style={{ position: "relative", width: "70%", height: "70%" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    inset: `${i * 15}%`,
                    border: `2px solid ${accentColor}${i === 0 ? "44" : i === 1 ? "33" : "22"}`,
                    borderRadius: 20 * s,
                    transform: `rotate(${i * 5}deg)`,
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 80 * s,
                  height: 80 * s,
                  borderRadius: 20 * s,
                  backgroundColor: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32 * s,
                  color: "#fff",
                }}
              >
                ✦
              </div>
            </div>
          </div>
        )}

        {/* Edge gradient for blend */}
        {!isVertical && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 60 * s,
              background: `linear-gradient(90deg, transparent, ${backgroundColor})`,
            }}
          />
        )}
        {isVertical && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 60 * s,
              background: `linear-gradient(transparent, ${backgroundColor})`,
            }}
          />
        )}
      </div>

      {/* Text side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: isVertical
            ? `${30 * s}px ${60 * s}px ${60 * s}px`
            : `${60 * s}px ${60 * s}px ${60 * s}px ${40 * s}px`,
        }}
      >
        {/* Accent dot + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            marginBottom: 20 * s,
          }}
        >
          <div
            style={{
              width: 10 * s,
              height: 10 * s,
              borderRadius: "50%",
              backgroundColor: accentColor,
            }}
          />
          <span
            style={{
              fontSize: 14 * s,
              fontWeight: 600,
              color: accentColor,
              textTransform: "uppercase",
              letterSpacing: 2 * s,
            }}
          >
            Featured
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: isVertical ? 48 * s : 44 * s,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: 18 * s,
          }}
        >
          {headline}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: 20 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.65,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 32 * s,
          }}
        >
          {body}
        </p>

        {/* CTA */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 18 * s,
            fontWeight: 700,
            padding: `${14 * s}px ${40 * s}px`,
            borderRadius: 8 * s,
          }}
        >
          {cta}
        </div>
      </div>
    </div>
  );
}
