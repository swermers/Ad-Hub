import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

/**
 * Handwritten Quote — Casual, warm, text-only layout that looks
 * like handwritten notes on a warm background.
 * Inspired by "Same Ad, Same Audience, One Buys, One Scrolls" style.
 */
export function HandwrittenQuoteTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#e8ddd0",
  textColor = "#c0392b",
  accentColor = "#1a1a1a",
  logoUrl,
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  // Split headline into lines for the stacked handwritten effect
  const lines = headline.split(/[,.\n]+/).map((l) => l.trim()).filter(Boolean);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Caveat', 'Segoe Script', 'Comic Sans MS', cursive",
        overflow: "hidden",
        position: "relative",
        padding: `${80 * s}px ${70 * s}px`,
      }}
    >
      {/* Paper texture effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.03) 0%, transparent 40%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Stacked lines — handwritten feel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12 * s,
          position: "relative",
          zIndex: 1,
        }}
      >
        {lines.map((line, i) => {
          // Detect if line has an underlined word (contains underscore or special emphasis)
          const hasEmphasis = line.includes("_");
          const parts = hasEmphasis ? line.split("_") : [line];

          // Dynamic font size based on line length
          const baseFontSize = 38 * s;
          const fontSize = line.length > 25 ? Math.max(24 * s, baseFontSize * (25 / line.length)) : baseFontSize;
          return (
            <div
              key={i}
              style={{
                fontSize,
                fontWeight: 700,
                color: textColor,
                lineHeight: 1.3,
                letterSpacing: 2 * s,
                textTransform: "uppercase",
                maxWidth: "90%",
                wordBreak: "break-word",
                // Slight rotation for handwritten feel
                transform: `rotate(${(i % 2 === 0 ? -0.5 : 0.3)}deg)`,
              }}
            >
              {hasEmphasis
                ? parts.map((part, pi) =>
                    pi % 2 === 1 ? (
                      <span
                        key={pi}
                        style={{
                          textDecoration: "underline",
                          textDecorationColor: textColor,
                          textUnderlineOffset: 4 * s,
                          textDecorationThickness: 2 * s,
                        }}
                      >
                        {part}
                      </span>
                    ) : (
                      <span key={pi}>{part}</span>
                    )
                  )
                : line}
            </div>
          );
        })}
      </div>

      {/* Body text (subtitle / supporting thought) */}
      {body && (
        <p
          style={{
            fontSize: 22 * s,
            fontWeight: 400,
            color: accentColor,
            opacity: 0.6,
            lineHeight: 1.5,
            margin: 0,
            marginTop: 24 * s,
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            position: "relative",
            zIndex: 1,
          }}
        >
          {body}
        </p>
      )}

      {/* CTA — small, bottom-right, understated */}
      <div
        style={{
          position: "absolute",
          bottom: 40 * s,
          right: 50 * s,
          fontSize: 13 * s,
          fontWeight: 600,
          color: accentColor,
          opacity: 0.4,
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          textTransform: "uppercase",
          letterSpacing: 2 * s,
          zIndex: 1,
        }}
      >
        {cta}
      </div>

      {/* Logo in top-right */}
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          style={{
            position: "absolute",
            top: 40 * s,
            right: 50 * s,
            height: 28 * s,
            objectFit: "contain",
            opacity: 0.5,
            zIndex: 1,
          }}
        />
      )}

      {/* Decorative corner element */}
      <div
        style={{
          position: "absolute",
          top: 30 * s,
          right: 30 * s,
          width: 20 * s,
          height: 20 * s,
          border: `2px solid ${textColor}30`,
          borderRadius: 3 * s,
          zIndex: 1,
        }}
      />
    </div>
  );
}
