"use client";

import React from "react";
import { Player } from "@remotion/player";
import { AdComposition } from "./AdComposition";
import type { AdCompositionProps } from "./AdComposition";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";

interface VideoPreviewProps extends AdCompositionProps {
  aspectRatio?: AspectRatio;
  previewWidth?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

const FPS = 30;
const DURATION_SECONDS = 5;

export function VideoPreview({
  previewWidth = 540,
  autoPlay = true,
  loop = true,
  aspectRatio = "1:1",
  ...props
}: VideoPreviewProps) {
  const dims = ASPECT_DIMENSIONS[aspectRatio];
  const scale = previewWidth / dims.width;
  const previewHeight = dims.height * scale;

  return (
    <Player
      component={AdComposition}
      inputProps={{ ...props, aspectRatio }}
      durationInFrames={FPS * DURATION_SECONDS}
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
  );
}
