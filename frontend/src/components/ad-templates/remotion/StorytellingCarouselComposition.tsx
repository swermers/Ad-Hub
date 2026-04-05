import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  Sequence,
  Easing,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";

export interface StorytellingCarouselVideoProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  aspectRatio?: AspectRatio;
  /** Pipe-delimited slide headlines */
  slideHeadlines?: string;
}

/**
 * Storytelling Carousel — Remotion composition.
 *
 * Renders multi-slide storytelling narrative as animated video.
 * Each slide: 3s hold with text reveal animation + brand-colored transitions.
 * Hook/rehook slides get extra motion (scale pulse, glow).
 * Static slides get Ken Burns (slow zoom/pan).
 */
export function StorytellingCarouselComposition({
  headline,
  body,
  cta,
  backgroundColor = "#1a1a1a",
  textColor = "#f5f0eb",
  accentColor = "#d4a574",
  aspectRatio = "4:5",
  slideHeadlines,
}: StorytellingCarouselVideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  // Parse slides from pipe-delimited headlines or body text
  const slideTexts = slideHeadlines
    ? slideHeadlines.split("|").map((s) => s.trim())
    : [headline, ...body.split(/[.!?]+/).filter((s) => s.trim().length > 0).slice(0, 5), cta];

  const slideCount = slideTexts.length;
  const framesPerSlide = Math.floor(durationInFrames / slideCount);
  const currentIndex = Math.min(Math.floor(frame / framesPerSlide), slideCount - 1);
  const frameInSlide = frame - currentIndex * framesPerSlide;

  // Determine if this is a "dynamic" slide (hook = 0, rehook ≈ midpoint)
  const isHook = currentIndex === 0;
  const isRehook = currentIndex === Math.floor(slideCount / 2);
  const isCta = currentIndex === slideCount - 1;
  const isInverted = isRehook;

  const bg = isInverted ? accentColor : backgroundColor;
  const text = isInverted ? backgroundColor : textColor;
  const accent = isInverted ? backgroundColor : accentColor;

  // Text reveal animation
  const textRevealProgress = interpolate(
    frameInSlide,
    [0, fps * 0.6],
    [0, 1],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const textY = interpolate(textRevealProgress, [0, 1], [30, 0]);
  const textOpacity = textRevealProgress;

  // Ken Burns effect (slow zoom + diagonal pan) for static slides
  const kenBurnsScale = isHook || isRehook
    ? 1
    : interpolate(frameInSlide, [0, framesPerSlide], [1, 1.08], { extrapolateRight: "clamp" });
  // Diagonal pan direction alternates per slide
  const panX = isHook || isRehook
    ? 0
    : interpolate(frameInSlide, [0, framesPerSlide], [0, currentIndex % 2 === 0 ? 8 : -8], { extrapolateRight: "clamp" });
  const panY = isHook || isRehook
    ? 0
    : interpolate(frameInSlide, [0, framesPerSlide], [0, currentIndex % 3 === 0 ? -5 : 5], { extrapolateRight: "clamp" });

  // Accent line animation
  const lineWidth = interpolate(
    frameInSlide,
    [fps * 0.2, fps * 0.8],
    [0, 60],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Transition wipe (brand-colored)
  const wipeProgress = interpolate(
    frameInSlide,
    [0, fps * 0.3],
    [100, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  // Slide number
  const slideNum = String(currentIndex + 1).padStart(2, "0");
  const totalNum = String(slideCount).padStart(2, "0");

  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      {/* Ken Burns background zoom + diagonal pan */}
      <AbsoluteFill
        style={{
          transform: `scale(${kenBurnsScale}) translate(${panX}px, ${panY}px)`,
          transformOrigin: isHook ? "center top" : "center center",
        }}
      />

      {/* Grain texture overlay (using CSS) */}
      <AbsoluteFill
        style={{
          background: "url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJnIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9InNhdHVyYXRlIiB2YWx1ZXM9IjAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI2cpIi8+PC9zdmc+)",
          opacity: 0.15,
          mixBlendMode: "overlay",
        }}
      />

      {/* Brand-colored transition wipe */}
      {wipeProgress > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: accent,
            transform: `translateX(-${wipeProgress}%)`,
            zIndex: 10,
          }}
        />
      )}

      {/* Slide number — top right */}
      <div
        style={{
          position: "absolute",
          top: 28,
          right: 32,
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: 13,
          letterSpacing: "0.08em",
          color: `${text}66`,
          opacity: textOpacity,
          zIndex: 2,
        }}
      >
        {slideNum} / {totalNum}
      </div>

      {/* Accent line (insight/takeaway slides) */}
      {!isHook && !isCta && (
        <div
          style={{
            position: "absolute",
            top: height * 0.4,
            left: 48,
            width: lineWidth,
            height: 2,
            backgroundColor: accent,
            opacity: 0.6,
            zIndex: 2,
          }}
        />
      )}

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          bottom: isCta ? "35%" : "20%",
          left: 48,
          right: 48,
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: isHook ? 56 : isRehook ? 48 : isCta ? 44 : 36,
            fontWeight: isHook ? 700 : 500,
            fontStyle: isCta ? "italic" : "normal",
            lineHeight: 1.2,
            color: text,
            margin: 0,
            letterSpacing: "-0.01em",
            maxWidth: "90%",
          }}
        >
          {slideTexts[currentIndex]}
        </h1>
      </div>

      {/* Bottom accent on hook */}
      {isHook && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 48,
            width: lineWidth,
            height: 2,
            backgroundColor: accent,
            opacity: 0.5,
            zIndex: 2,
          }}
        />
      )}

      {/* Pagination dots */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          zIndex: 2,
        }}
      >
        {slideTexts.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? accent : `${text}33`,
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}
