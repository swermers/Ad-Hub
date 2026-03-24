"use client";

import React from "react";
import { Player } from "@remotion/player";
import { AdComposition } from "./AdComposition";
import { PASComposition } from "./PASComposition";
import { KineticTextComposition } from "./KineticTextComposition";
import { SwissTypeComposition } from "./SwissTypeComposition";
import { SwissGridComposition } from "./SwissGridComposition";
import { SwissMinimalComposition } from "./SwissMinimalComposition";
import { SwissCarouselComposition } from "./SwissCarouselComposition";
import { SwissStoryComposition } from "./SwissStoryComposition";
import { SwissBoldComposition } from "./SwissBoldComposition";
import { SwissStackComposition } from "./SwissStackComposition";
import { HandDrawnComposition } from "./HandDrawnComposition";
import { SaasDemoComposition } from "./SaasDemoComposition";
import { DataHypeComposition } from "./DataHypeComposition";
import { SocialProofComposition } from "./SocialProofComposition";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";

export type VideoStyle =
  | "swiss-bold"
  | "swiss-stack"
  | "swiss-type"
  | "swiss-grid"
  | "swiss-minimal"
  | "swiss-carousel"
  | "swiss-story"
  | "default"
  | "pas"
  | "kinetic"
  | "hand-drawn"
  | "saas-demo"
  | "data-hype"
  | "social-proof";

interface VideoPreviewProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  videoStyle?: VideoStyle;
  previewWidth?: number;
  autoPlay?: boolean;
  loop?: boolean;
  brandFont?: string;
  /** Pipe-delimited slide headlines for carousel format */
  slideHeadlines?: string;
}

const FPS = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */
const STYLE_CONFIG: Record<VideoStyle, {
  component: React.ComponentType<any>;
  durationSeconds: number;
  /** Override aspect ratio for this style (e.g. story forces 9:16) */
  forceAspect?: AspectRatio;
}> = {
  "swiss-bold": { component: SwissBoldComposition, durationSeconds: 5 },
  "swiss-stack": { component: SwissStackComposition, durationSeconds: 6 },
  "swiss-type": { component: SwissTypeComposition, durationSeconds: 5 },
  "swiss-grid": { component: SwissGridComposition, durationSeconds: 5 },
  "swiss-minimal": { component: SwissMinimalComposition, durationSeconds: 5 },
  "swiss-carousel": { component: SwissCarouselComposition, durationSeconds: 10 },
  "swiss-story": { component: SwissStoryComposition, durationSeconds: 6, forceAspect: "9:16" },
  default: { component: AdComposition, durationSeconds: 5 },
  pas: { component: PASComposition, durationSeconds: 6 },
  kinetic: { component: KineticTextComposition, durationSeconds: 5 },
  "hand-drawn": { component: HandDrawnComposition, durationSeconds: 8 },
  "saas-demo": { component: SaasDemoComposition, durationSeconds: 8 },
  "data-hype": { component: DataHypeComposition, durationSeconds: 6 },
  "social-proof": { component: SocialProofComposition, durationSeconds: 7, forceAspect: "9:16" },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function VideoPreview({
  previewWidth = 540,
  autoPlay = true,
  loop = true,
  aspectRatio = "1:1",
  videoStyle = "swiss-type",
  brandFont,
  slideHeadlines,
  ...props
}: VideoPreviewProps) {
  const config = STYLE_CONFIG[videoStyle];
  const effectiveAspect = config.forceAspect || aspectRatio;
  const dims = ASPECT_DIMENSIONS[effectiveAspect];
  const scale = previewWidth / dims.width;
  const previewHeight = dims.height * scale;

  return (
    <div>
      <Player
        component={config.component}
        inputProps={{ ...props, aspectRatio: effectiveAspect, brandFont, slideHeadlines }}
        durationInFrames={FPS * config.durationSeconds}
        compositionWidth={dims.width}
        compositionHeight={dims.height}
        fps={FPS}
        style={{
          width: previewWidth,
          height: previewHeight,
          borderRadius: 12,
          overflow: "hidden",
        }}
        autoPlay={autoPlay}
        loop={loop}
        controls
      />
    </div>
  );
}

/** Swiss styles first — they're the primary design language */
export const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string; description: string }[] = [
  { value: "swiss-bold", label: "Bold Editorial", description: "Saturated card, oversized type, emphasis contrast — scroll-stopping" },
  { value: "swiss-stack", label: "Dark Stack", description: "Dark glass card with stacked items, cross separators, premium feel" },
  { value: "swiss-type", label: "Swiss Type", description: "Oversized typography with geometric accents" },
  { value: "swiss-grid", label: "Swiss Grid", description: "Color blocks on a strict grid layout" },
  { value: "swiss-minimal", label: "Swiss Minimal", description: "Maximum whitespace, single focal statement" },
  { value: "swiss-carousel", label: "Carousel", description: "Multi-slide carousel with pagination (10s)" },
  { value: "swiss-story", label: "Story / Reel", description: "Full-screen vertical with swipe-up CTA (9:16)" },
  { value: "default", label: "Smooth Reveal", description: "Elegant text reveal with product entrance" },
  { value: "pas", label: "Problem → Solve", description: "3-scene drama: problem, agitate, solve" },
  { value: "kinetic", label: "Kinetic Type", description: "Words appear one-by-one with bounce effects" },
  { value: "hand-drawn", label: "Hand-Drawn", description: "Organic, warm feel — animated underlines, sketched accents, b-roll support (8s)" },
  { value: "saas-demo", label: "SaaS Demo", description: "Browser mockup with cursor animation, feature callouts, zoom-in effect (8s)" },
  { value: "data-hype", label: "Data Hype", description: "Animated stats counter, bar chart, growth trend line — metrics-driven (6s)" },
  { value: "social-proof", label: "Social Proof", description: "Star ratings, review count, user counter, verified badge — trust-building (9:16, 7s)" },
];
