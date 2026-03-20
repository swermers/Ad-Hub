import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export type { AdTemplateProps } from "./types";

export function BeforeAfterTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#1a1a2e",
  textColor = "#ffffff",
  accentColor = "#e94560",
  aspectRatio = "1:1",
  scale = 1,
}: AdTemplateProps) {
  const { width: size } = getDimensions(aspectRatio, scale);
  const height = getDimensions(aspectRatio, scale).height;

  return (
    <div
      style={{
        width: size,
        height,
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header label */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16 * scale,
          paddingTop: 60 * scale,
          paddingBottom: 20 * scale,
        }}
      >
        <span
          style={{
            fontSize: 18 * scale,
            fontWeight: 700,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: 3 * scale,
          }}
        >
          Before
        </span>
        <span
          style={{
            fontSize: 18 * scale,
            fontWeight: 400,
            color: textColor,
            opacity: 0.4,
          }}
        >
          vs
        </span>
        <span
          style={{
            fontSize: 18 * scale,
            fontWeight: 700,
            color: "#4ecca3",
            textTransform: "uppercase",
            letterSpacing: 3 * scale,
          }}
        >
          After
        </span>
      </div>

      {/* Split content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: `0 ${60 * scale}px`,
          gap: 30 * scale,
        }}
      >
        {/* Before side */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(233, 69, 96, 0.1)",
            borderRadius: 20 * scale,
            padding: 40 * scale,
            border: `2px solid rgba(233, 69, 96, 0.3)`,
          }}
        >
          <div
            style={{
              fontSize: 48 * scale,
              marginBottom: 20 * scale,
            }}
          >
            &#x1F629;
          </div>
          <p
            style={{
              fontSize: 26 * scale,
              fontWeight: 600,
              color: textColor,
              textAlign: "center",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {headline}
          </p>
        </div>

        {/* After side */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(78, 204, 163, 0.1)",
            borderRadius: 20 * scale,
            padding: 40 * scale,
            border: `2px solid rgba(78, 204, 163, 0.3)`,
          }}
        >
          <div
            style={{
              fontSize: 48 * scale,
              marginBottom: 20 * scale,
            }}
          >
            &#x1F680;
          </div>
          <p
            style={{
              fontSize: 26 * scale,
              fontWeight: 600,
              color: textColor,
              textAlign: "center",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {body}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: `${40 * scale}px 0 ${60 * scale}px`,
        }}
      >
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
          }}
        >
          {cta}
        </div>
      </div>
    </div>
  );
}
