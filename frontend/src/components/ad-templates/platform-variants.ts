/**
 * Platform-native rendering configuration.
 *
 * Content designed FOR a specific platform performs 40-60% better than
 * reformatted content. These configs adjust template rendering per platform.
 */

import type { AspectRatio } from "./types";

export interface PlatformConfig {
  /** Default aspect ratio for this platform */
  defaultAspect: AspectRatio;
  /** Max slides for carousel content */
  maxSlides: number;
  /** Typography scale multipliers */
  typography: {
    headlineScale: number;
    bodyScale: number;
  };
  /** Visual style bias */
  style: "visual-first" | "text-heavy" | "entertainment" | "conversion";
  /** How to handle slide 2 (Instagram resurfaces it) */
  slide2Strategy: "secondary-hook" | "context" | "benefit";
  /** Font preference override */
  fontPreference?: "serif" | "sans-serif" | "mono";
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    defaultAspect: "4:5",
    maxSlides: 10,
    typography: { headlineScale: 1.1, bodyScale: 1.0 },
    style: "visual-first",
    slide2Strategy: "secondary-hook", // IG resurfaces slide 2 in feed
  },
  linkedin: {
    defaultAspect: "1:1", // LinkedIn carousels are square/PDF-style
    maxSlides: 12,
    typography: { headlineScale: 1.0, bodyScale: 1.05 },
    style: "text-heavy",
    slide2Strategy: "context", // LinkedIn users read sequentially
    fontPreference: "serif", // Authority / editorial feel
  },
  tiktok: {
    defaultAspect: "9:16",
    maxSlides: 8,
    typography: { headlineScale: 1.2, bodyScale: 0.9 },
    style: "entertainment",
    slide2Strategy: "secondary-hook",
  },
  meta: {
    defaultAspect: "4:5",
    maxSlides: 10,
    typography: { headlineScale: 1.0, bodyScale: 1.0 },
    style: "conversion",
    slide2Strategy: "benefit", // Meta users respond to value props
  },
  general: {
    defaultAspect: "4:5",
    maxSlides: 10,
    typography: { headlineScale: 1.0, bodyScale: 1.0 },
    style: "visual-first",
    slide2Strategy: "secondary-hook",
  },
};

/**
 * Get platform config, with fallback to general.
 */
export function getPlatformConfig(platform: string): PlatformConfig {
  return PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general;
}

/**
 * Get the best aspect ratio for a platform + content type combination.
 */
export function getBestAspectRatio(
  platform: string,
  contentType: string,
): AspectRatio {
  const config = getPlatformConfig(platform);

  // Stories and reels are always vertical
  if (contentType === "story" || contentType === "reel") {
    return "9:16";
  }

  return config.defaultAspect;
}
