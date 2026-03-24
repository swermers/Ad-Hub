import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";
import { QRCodeBlock } from "./QRCodeBlock";

/**
 * Billboard — Bold headline + centered illustration/product +
 * brand footer with logo and QR-code-style element.
 * Inspired by "bash" everyday shopping billboard ad.
 */
export function BillboardTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  accentColor = "#3B5CFF",
  logoUrl,
  screenshotUrl,
  qrUrl,
  aspectRatio = "4:5",
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
      {/* Bold headline at top */}
      <div
        style={{
          padding: `${60 * s}px ${60 * s}px ${24 * s}px`,
        }}
      >
        <h1
          style={{
            fontSize: 58 * s,
            fontWeight: 900,
            color: textColor,
            lineHeight: 1.0,
            margin: 0,
            letterSpacing: -2 * s,
          }}
        >
          {headline}
        </h1>
      </div>

      {/* Central illustration / product image */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${20 * s}px ${60 * s}px`,
          position: "relative",
        }}
      >
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt=""
            style={{
              maxWidth: "80%",
              maxHeight: "90%",
              objectFit: "contain",
            }}
          />
        ) : (
          /* Placeholder illustration — simple line-art person */
          <div
            style={{
              width: "60%",
              height: "80%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 200 280"
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "70%", height: "70%" }}
            >
              {/* Head */}
              <circle cx="100" cy="50" r="25" />
              {/* Body */}
              <line x1="100" y1="75" x2="100" y2="170" />
              {/* Arms */}
              <line x1="100" y1="110" x2="60" y2="90" />
              <line x1="100" y1="110" x2="145" y2="85" />
              {/* Wave hand */}
              <line x1="145" y1="85" x2="155" y2="65" />
              {/* Legs */}
              <line x1="100" y1="170" x2="70" y2="250" />
              <line x1="100" y1="170" x2="130" y2="250" />
            </svg>
          </div>
        )}

        {/* "Download the app" side text */}
        {body && (
          <div
            style={{
              position: "absolute",
              right: 50 * s,
              bottom: 40 * s,
              fontSize: 12 * s,
              fontWeight: 600,
              color: textColor,
              opacity: 0.5,
              maxWidth: 80 * s,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {body}
          </div>
        )}
      </div>

      {/* Brand footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${24 * s}px ${60 * s}px ${40 * s}px`,
        }}
      >
        {/* Logo / brand name */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{ height: 32 * s, objectFit: "contain" }}
          />
        ) : (
          <span
            style={{
              fontSize: 28 * s,
              fontWeight: 900,
              color: textColor,
              letterSpacing: -0.5 * s,
            }}
          >
            {cta.split(/\s+/)[0].toLowerCase()}
          </span>
        )}

        {/* QR code — only shown when a qrUrl is provided */}
        {qrUrl && (
          <QRCodeBlock
            value={qrUrl}
            size={56 * s}
            fgColor={textColor}
            label="Scan"
            labelSize={10 * s}
          />
        )}

        {/* CTA badge when no QR */}
        {!qrUrl && (
          <div
            style={{
              padding: `${8 * s}px ${20 * s}px`,
              border: `1.5px solid ${textColor}`,
              borderRadius: 6 * s,
              fontSize: 13 * s,
              fontWeight: 600,
              color: textColor,
              letterSpacing: 0.5 * s,
            }}
          >
            {cta}
          </div>
        )}
      </div>
    </div>
  );
}
