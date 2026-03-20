import React from "react";
import type { AdTemplateProps } from "./types";
import { getDimensions } from "./types";

export function UGCStyleTemplate({
  headline,
  body,
  cta,
  backgroundColor = "#000000",
  textColor = "#ffffff",
  accentColor = "#22c55e",
  screenshotUrl,
  aspectRatio = "9:16",
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
      {/* Full background image (simulating UGC video frame) */}
      {screenshotUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${screenshotUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
          }}
        />
      )}

      {/* Dark vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: screenshotUrl
            ? "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.8) 100%)"
            : `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor}ee 100%)`,
          zIndex: 1,
        }}
      />

      {/* Top bar - simulating app UI */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `${60 * s}px ${40 * s}px ${20 * s}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* "Live" badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * s,
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: `${8 * s}px ${16 * s}px`,
            borderRadius: 20 * s,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: 8 * s,
              height: 8 * s,
              borderRadius: "50%",
              backgroundColor: "#ef4444",
            }}
          />
          <span
            style={{
              fontSize: 13 * s,
              fontWeight: 600,
              color: textColor,
            }}
          >
            Sponsored
          </span>
        </div>
      </div>

      {/* Middle spacer */}
      <div style={{ flex: 1, position: "relative", zIndex: 2 }} />

      {/* Caption overlay - UGC style text */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `${30 * s}px ${40 * s}px`,
        }}
      >
        {/* Hook text - bold caption style */}
        <div
          style={{
            display: "inline",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: textColor,
            fontSize: 36 * s,
            fontWeight: 800,
            lineHeight: 1.8,
            padding: `${6 * s}px ${14 * s}px`,
            boxDecorationBreak: "clone" as const,
            WebkitBoxDecorationBreak: "clone" as const,
          }}
        >
          {headline}
        </div>
      </div>

      {/* Body text */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `${10 * s}px ${40 * s}px`,
        }}
      >
        <p
          style={{
            fontSize: 20 * s,
            fontWeight: 400,
            color: textColor,
            opacity: 0.85,
            lineHeight: 1.5,
            margin: 0,
            textShadow: `0 1px ${3 * s}px rgba(0,0,0,0.5)`,
          }}
        >
          {body}
        </p>
      </div>

      {/* Bottom CTA area */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `${24 * s}px ${40 * s}px ${80 * s}px`,
        }}
      >
        {/* CTA button - full width, app-native style */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#ffffff",
            fontSize: 20 * s,
            fontWeight: 800,
            padding: `${18 * s}px`,
            borderRadius: 12 * s,
            textAlign: "center",
            letterSpacing: 0.5 * s,
          }}
        >
          {cta}
        </div>
      </div>

      {/* Right side engagement icons (simulating social UI) */}
      <div
        style={{
          position: "absolute",
          right: 16 * s,
          bottom: 200 * s,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24 * s,
          zIndex: 2,
        }}
      >
        {[
          { icon: "♥", count: "24K" },
          { icon: "💬", count: "1.2K" },
          { icon: "↗", count: "Share" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4 * s,
            }}
          >
            <div
              style={{
                fontSize: 28 * s,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontSize: 12 * s,
                fontWeight: 600,
                color: textColor,
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
