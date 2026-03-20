"use client";

import React from "react";
import { Player } from "@remotion/player";
import { AdComposition } from "./AdComposition";
import { PASComposition } from "./PASComposition";
import { KineticTextComposition } from "./KineticTextComposition";
import { SwissTypeComposition } from "./SwissTypeComposition";
import { SwissGridComposition } from "./SwissGridComposition";
import { SwissMinimalComposition } from "./SwissMinimalComposition";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";

export type VideoStyle =
  | "swiss-type"
  | "swiss-grid"
  | "swiss-minimal"
  | "default"
  | "pas"
  | "kinetic";

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
}

const FPS = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */
const STYLE_CONFIG: Record<VideoStyle, { component: React.ComponentType<any>; durationSeconds: number }> = {
  "swiss-type": { component: SwissTypeComposition, durationSeconds: 5 },
  "swiss-grid": { component: SwissGridComposition, durationSeconds: 5 },
  "swiss-minimal": { component: SwissMinimalComposition, durationSeconds: 5 },
  default: { component: AdComposition, durationSeconds: 5 },
  pas: { component: PASComposition, durationSeconds: 6 },
  kinetic: { component: KineticTextComposition, durationSeconds: 5 },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function VideoPreview({
  previewWidth = 540,
  autoPlay = true,
  loop = true,
  aspectRatio = "1:1",
  videoStyle = "swiss-type",
  brandFont,
  ...props
}: VideoPreviewProps) {
  const dims = ASPECT_DIMENSIONS[aspectRatio];
  const scale = previewWidth / dims.width;
  const previewHeight = dims.height * scale;
  const config = STYLE_CONFIG[videoStyle];

  return (
    <div>
      <Player
        component={config.component}
        inputProps={{ ...props, aspectRatio, brandFont }}
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
  { value: "swiss-type", label: "Swiss Type", description: "Oversized typography with geometric accents" },
  { value: "swiss-grid", label: "Swiss Grid", description: "Color blocks on a strict grid layout" },
  { value: "swiss-minimal", label: "Swiss Minimal", description: "Maximum whitespace, single focal statement" },
  { value: "default", label: "Smooth Reveal", description: "Elegant text reveal with product entrance" },
  { value: "pas", label: "Problem → Solve", description: "3-scene drama: problem, agitate, solve" },
  { value: "kinetic", label: "Kinetic Type", description: "Words appear one-by-one with bounce effects" },
];
