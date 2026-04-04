"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AspectRatio } from "./types";
import {
  generateStorytellingSlides,
  StorytellingSlideTemplate,
} from "./StorytellingCarouselGenerator";

interface StorytellingCarouselPreviewProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  imageUrl?: string;
  aspectRatio?: AspectRatio;
  /** Scale for the preview (typically < 1 for preview, 1 for export) */
  previewScale?: number;
}

/**
 * Interactive storytelling carousel preview with navigation.
 * Click left/right to navigate, dot indicators show position.
 * Used in the content detail page for carousel content.
 */
export function StorytellingCarouselPreview({
  headline,
  body,
  cta,
  backgroundColor = "#1a1a1a",
  textColor,
  accentColor = "#d4a574",
  imageUrl,
  aspectRatio = "4:5",
  previewScale = 0.4,
}: StorytellingCarouselPreviewProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const slides = generateStorytellingSlides(headline, body, cta);

  // Pass imageUrl to hook slide
  if (imageUrl && slides[0]) {
    slides[0].imageUrl = imageUrl;
  }

  const goTo = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <div
      style={{
        background: "#111",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Slide area */}
      <div
        style={{
          position: "relative",
          cursor: "pointer",
          userSelect: "none",
          overflow: "hidden",
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x > rect.width / 2) {
            goTo(current + 1);
          } else {
            goTo(current - 1);
          }
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <StorytellingSlideTemplate
              slide={slides[current]}
              backgroundColor={backgroundColor}
              textColor={textColor}
              accentColor={accentColor}
              aspectRatio={aspectRatio}
              scale={previewScale}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center",
          padding: "14px 0",
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              border: "none",
              background: i === current ? accentColor : "rgba(255,255,255,0.25)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Navigation hint */}
      <p
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "rgba(255,255,255,0.3)",
          margin: 0,
          paddingBottom: "12px",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.05em",
        }}
      >
        tap left / right to navigate &middot; {current + 1} of {slides.length}
      </p>
    </div>
  );
}
