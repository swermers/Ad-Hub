import React from "react";

interface LoFiFilterProps {
  enabled: boolean;
  children: React.ReactNode;
  intensity?: "light" | "medium" | "heavy";
}

/**
 * Wraps any template with a lo-fi / authentic filter.
 * Adds film grain, slight desaturation, and vignette to make
 * polished designs look more like organic UGC content.
 *
 * Research shows UGC-style content outperforms polished ads by +55% ROI.
 */
export function LoFiFilter({ enabled, children, intensity = "medium" }: LoFiFilterProps) {
  if (!enabled) return <>{children}</>;

  const config = INTENSITY_CONFIG[intensity];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Original content with slight adjustments */}
      <div
        style={{
          filter: `saturate(${config.saturation}) contrast(${config.contrast}) brightness(${config.brightness})`,
        }}
      >
        {children}
      </div>

      {/* Film grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${config.grainOpacity}'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          mixBlendMode: "overlay",
          opacity: config.grainOverlayOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${config.vignetteStrength}) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle warm tint */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(255, 200, 150, ${config.warmTint})`,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

const INTENSITY_CONFIG = {
  light: {
    saturation: 0.92,
    contrast: 1.02,
    brightness: 1.01,
    grainOpacity: 0.3,
    grainOverlayOpacity: 0.15,
    vignetteStrength: 0.15,
    warmTint: 0.03,
  },
  medium: {
    saturation: 0.85,
    contrast: 1.05,
    brightness: 0.98,
    grainOpacity: 0.4,
    grainOverlayOpacity: 0.25,
    vignetteStrength: 0.25,
    warmTint: 0.05,
  },
  heavy: {
    saturation: 0.75,
    contrast: 1.1,
    brightness: 0.95,
    grainOpacity: 0.5,
    grainOverlayOpacity: 0.35,
    vignetteStrength: 0.35,
    warmTint: 0.08,
  },
};
