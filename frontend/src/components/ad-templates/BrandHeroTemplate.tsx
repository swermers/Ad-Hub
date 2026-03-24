import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

/**
 * Brand Hero — Clean white/neutral background with centered graphic,
 * tagline with bold keyword, and brand footer (logo + store badges).
 * Inspired by the TRAIT running app ad.
 */
export function BrandHeroTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  accentColor = "#000000",
  logoUrl,
  screenshotUrl,
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  // Parse headline to bold the first word (e.g. "The RUNNING app")
  const headlineWords = headline.split(/\s+/);
  const boldWord = headlineWords.length > 1 ? headlineWords[1] : headlineWords[0];

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
      {/* Central graphic area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${80 * s}px ${60 * s}px ${20 * s}px`,
        }}
      >
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt=""
            style={{
              maxWidth: "70%",
              maxHeight: "80%",
              objectFit: "contain",
            }}
          />
        ) : (
          /* Abstract geometric placeholder */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6 * s,
              alignItems: "flex-end",
            }}
          >
            {[1, 0.85, 0.7, 0.55, 0.4].map((w, i) => (
              <div
                key={i}
                style={{
                  width: 280 * s * w,
                  height: 40 * s,
                  backgroundColor: accentColor,
                  borderRadius: 4 * s,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Headline / tagline section */}
      <div
        style={{
          padding: `${20 * s}px ${60 * s}px`,
        }}
      >
        <p
          style={{
            fontSize: 28 * s,
            fontWeight: 400,
            color: textColor,
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {headlineWords.map((word, i) => (
            <React.Fragment key={i}>
              {i > 0 && " "}
              {word.toUpperCase() === boldWord.toUpperCase() ? (
                <strong style={{ fontWeight: 900 }}>{word}</strong>
              ) : (
                word
              )}
            </React.Fragment>
          ))}
        </p>
        {body && (
          <p
            style={{
              fontSize: 18 * s,
              fontWeight: 400,
              color: textColor,
              opacity: 0.5,
              lineHeight: 1.4,
              margin: 0,
              marginTop: 8 * s,
            }}
          >
            {body}
          </p>
        )}
      </div>

      {/* Brand footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${24 * s}px ${60 * s}px ${40 * s}px`,
          borderTop: `1px solid ${textColor}10`,
        }}
      >
        {/* Logo / Brand name */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{ height: 28 * s, objectFit: "contain" }}
          />
        ) : (
          <span
            style={{
              fontSize: 22 * s,
              fontWeight: 900,
              color: textColor,
              letterSpacing: -0.5 * s,
              textTransform: "uppercase",
            }}
          >
            {cta.split(/\s+/)[0]}
          </span>
        )}

        {/* CTA badges */}
        <div style={{ display: "flex", gap: 8 * s }}>
          <div
            style={{
              padding: `${6 * s}px ${16 * s}px`,
              border: `1.5px solid ${textColor}`,
              borderRadius: 6 * s,
              fontSize: 11 * s,
              fontWeight: 600,
              color: textColor,
              letterSpacing: 0.5 * s,
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}
