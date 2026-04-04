import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";
import { PaperTexture, GrainOverlay } from "./textures";

/**
 * Editorial Stack — Bold stacked typography layout.
 * Inspired by CPG billboard ads (RELOAD / REORDER / REFILL style).
 * Text-dominant with optional product image, AI-generated image, and brand logo.
 */
export function EditorialStackTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#D4E157",
  textColor = "#1a1a1a",
  accentColor = "#000000",
  logoUrl,
  screenshotUrl,
  imageUrl,
  aspectRatio = "4:5",
  scale = 1,
}: AdTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  // Split headline into stacked lines by word
  const words = headline.split(/\s+/);
  const stackLines =
    words.length <= 3
      ? words
      : [
          words.slice(0, Math.ceil(words.length / 2)).join(" "),
          words.slice(Math.ceil(words.length / 2)).join(" "),
        ];

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
      {/* Premium texture overlays */}
      <PaperTexture opacity={0.12} />
      <GrainOverlay opacity={0.2} blend="soft-light" />

      {/* AI-generated image as accent element */}
      {imageUrl && (
        <div
          style={{
            position: "absolute",
            top: "5%",
            right: "3%",
            width: "42%",
            height: "48%",
            zIndex: 1,
            borderRadius: 12 * s,
            overflow: "hidden",
            boxShadow: `0 ${8 * s}px ${32 * s}px rgba(0,0,0,0.15)`,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}
      {/* Product image floating on the right side */}
      {screenshotUrl && (
        <div
          style={{
            position: "absolute",
            top: "8%",
            right: "5%",
            width: "40%",
            height: "45%",
            zIndex: 1,
          }}
        >
          <img
            src={screenshotUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.15))",
            }}
          />
        </div>
      )}

      {/* Top bar with body text (like tagline) */}
      <div
        style={{
          padding: `${40 * s}px ${60 * s}px ${20 * s}px`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 2,
        }}
      >
        {/* Logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{
              height: 40 * s,
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: 36 * s,
              height: 36 * s,
              borderRadius: "50%",
              border: `2px solid ${textColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14 * s,
              fontWeight: 800,
              color: textColor,
            }}
          >
            {cta.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Body text as tagline in top-right */}
        <p
          style={{
            fontSize: 14 * s,
            fontWeight: 600,
            color: textColor,
            opacity: 0.7,
            maxWidth: "40%",
            textAlign: "right",
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: 1 * s,
            margin: 0,
          }}
        >
          {body}
        </p>
      </div>

      {/* Stacked headline — the hero */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: `0 ${60 * s}px ${50 * s}px`,
          zIndex: 2,
        }}
      >
        {stackLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: Math.min(96 * s, (width * 0.85) / Math.max(line.length * 0.55, 1)),
              fontWeight: 900,
              color: textColor,
              lineHeight: 0.95,
              textTransform: "uppercase",
              letterSpacing: -2 * s,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {line}
          </div>
        ))}

        {/* CTA at bottom */}
        <div
          style={{
            marginTop: 24 * s,
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 8 * s,
            backgroundColor: accentColor,
            color: backgroundColor,
            fontSize: 14 * s,
            fontWeight: 700,
            padding: `${10 * s}px ${28 * s}px`,
            borderRadius: 6 * s,
            textTransform: "uppercase",
            letterSpacing: 1.5 * s,
          }}
        >
          {cta} &rarr;
        </div>
      </div>

      {/* Side vertical text */}
      <div
        style={{
          position: "absolute",
          right: 20 * s,
          bottom: "15%",
          writingMode: "vertical-rl",
          fontSize: 10 * s,
          fontWeight: 600,
          color: textColor,
          opacity: 0.3,
          textTransform: "uppercase",
          letterSpacing: 3 * s,
          zIndex: 2,
        }}
      >
        {cta}
      </div>
    </div>
  );
}
