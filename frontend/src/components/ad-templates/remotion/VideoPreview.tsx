"use client";

import React from "react";
import { Player } from "@remotion/player";
import { AdComposition } from "./AdComposition";
import { PASComposition } from "./PASComposition";
import { KineticTextComposition } from "./KineticTextComposition";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";

export type VideoStyle = "default" | "pas" | "kinetic";

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
}

const FPS = 30;

/* eslint-disable @typescript-eslint/no-explicit-any */
const STYLE_CONFIG: Record<VideoStyle, { component: React.ComponentType<any>; durationSeconds: number }> = {
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
  videoStyle = "default",
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
        inputProps={{ ...props, aspectRatio }}
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

export const VIDEO_STYLE_OPTIONS: { value: VideoStyle; label: string; description: string }[] = [
  { value: "default", label: "Smooth Reveal", description: "Elegant text reveal with product entrance" },
  { value: "pas", label: "Problem → Solve", description: "3-scene drama: problem, agitate, solve" },
  { value: "kinetic", label: "Kinetic Type", description: "Words appear one-by-one with bounce effects" },
];
