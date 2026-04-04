"use client";

import React from "react";
import type { AspectRatio } from "./types";
import { getDimensions } from "./types";
import { GrainOverlay } from "./textures";
import { AccentLine, DotGrid } from "./design-elements";

interface CarouselSlide {
  type: "hook" | "problem" | "proof" | "feature" | "rehook" | "cta";
  headline: string;
  body?: string;
  imageUrl?: string;
  isAnimated?: boolean;
  slideNumber: number;
  totalSlides: number;
}

interface CarouselGeneratorProps {
  /** The pain point / hook for slide 1 */
  headline: string;
  /** Body text / features to spread across slides */
  body: string;
  /** CTA for the final slide */
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  imageUrl?: string;
  aspectRatio?: AspectRatio;
  scale?: number;
}

/**
 * Generates a carousel narrative with rehook pattern:
 * Slide 1: Hook (pain point question)
 * Slide 2: Problem amplification (secondary hook for IG resurfacing)
 * Slide 3: Proof / feature
 * Slide 4: Rehook — pattern interrupt to prevent drop-off
 * Slide 5: CTA
 *
 * Variable slide count based on available content.
 */
export function generateCarouselSlides(headline: string, body: string, cta: string): CarouselSlide[] {
  const sentences = body.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const slides: CarouselSlide[] = [];

  // Slide 1: Hook
  slides.push({
    type: "hook",
    headline,
    isAnimated: true,
    slideNumber: 1,
    totalSlides: 0,
  });

  // Slide 2: Problem (secondary hook)
  slides.push({
    type: "problem",
    headline: sentences[0]?.trim() || "Here's the truth...",
    body: sentences[1]?.trim(),
    slideNumber: 2,
    totalSlides: 0,
  });

  // Slide 3: Proof
  slides.push({
    type: "proof",
    headline: sentences[2]?.trim() || sentences[1]?.trim() || "The proof is clear",
    body: sentences[3]?.trim(),
    slideNumber: 3,
    totalSlides: 0,
  });

  // Slide 4: Rehook (pattern interrupt at drop-off point)
  if (sentences.length >= 3) {
    const rehookText = sentences[Math.min(3, sentences.length - 1)]?.trim() || "Think about that.";
    slides.push({
      type: "rehook",
      headline: rehookText,
      isAnimated: true,
      slideNumber: 4,
      totalSlides: 0,
    });
  }

  // Additional feature slides if there's enough content
  if (sentences.length >= 5) {
    slides.push({
      type: "feature",
      headline: sentences[4]?.trim() || "One more thing",
      body: sentences[5]?.trim(),
      slideNumber: slides.length + 1,
      totalSlides: 0,
    });
  }

  // Final: CTA
  slides.push({
    type: "cta",
    headline: cta,
    body: sentences[sentences.length - 1]?.trim() || "Don't wait.",
    slideNumber: slides.length + 1,
    totalSlides: 0,
  });

  // Set totalSlides and slideNumber
  const total = slides.length;
  slides.forEach((slide, i) => {
    slide.totalSlides = total;
    slide.slideNumber = i + 1;
  });

  return slides;
}

export function CarouselSlideTemplate({
  slide,
  backgroundColor = "#0a0a0a",
  textColor = "#ffffff",
  accentColor = "#6366f1",
  screenshotUrl,
  imageUrl,
  aspectRatio = "4:5",
  scale = 1,
}: {
  slide: CarouselSlide;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  imageUrl?: string;
  aspectRatio?: AspectRatio;
  scale?: number;
}) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  const isRehook = slide.type === "rehook";

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: isRehook ? accentColor : backgroundColor,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Texture overlay */}
      <GrainOverlay opacity={0.25} />

      {/* Gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 20% 80%, ${accentColor}22 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, ${accentColor}11 0%, transparent 40%)
          `,
        }}
      />

      {/* Design elements */}
      {slide.type === "hook" && (
        <div style={{ position: "absolute", bottom: 50 * s, right: 30 * s, zIndex: 0 }}>
          <DotGrid color={accentColor} opacity={0.06} scale={s * 0.7} />
        </div>
      )}

      {/* Slide number */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: `${60 * s}px ${60 * s}px ${20 * s}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 100 * s,
            fontWeight: 900,
            color: isRehook ? backgroundColor : accentColor,
            opacity: 0.15,
            lineHeight: 1,
          }}
        >
          {String(slide.slideNumber).padStart(2, "0")}
        </div>

        {/* Pagination dots */}
        <div style={{ display: "flex", gap: 8 * s }}>
          {Array.from({ length: slide.totalSlides }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i + 1 === slide.slideNumber ? 24 * s : 8 * s,
                height: 8 * s,
                borderRadius: 4 * s,
                backgroundColor: i + 1 === slide.slideNumber
                  ? (isRehook ? backgroundColor : accentColor)
                  : `${textColor}33`,
                transition: "width 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Screenshot/image area for proof slides */}
      {slide.type === "proof" && (imageUrl || screenshotUrl) && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            margin: `${10 * s}px ${60 * s}px ${20 * s}px`,
            height: height * 0.3,
            borderRadius: 16 * s,
            overflow: "hidden",
            boxShadow: `0 ${8 * s}px ${32 * s}px rgba(0,0,0,0.3)`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${imageUrl || screenshotUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: slide.type === "cta" ? "center" : "flex-end",
          alignItems: slide.type === "cta" ? "center" : "flex-start",
          padding: `${20 * s}px ${60 * s}px ${60 * s}px`,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Accent line on rehook */}
        {isRehook && (
          <div style={{ marginBottom: 20 * s }}>
            <AccentLine color={backgroundColor} opacity={0.6} scale={s} />
          </div>
        )}

        {/* Type label */}
        {slide.type === "hook" && (
          <div
            style={{
              fontSize: 14 * s,
              fontWeight: 700,
              color: accentColor,
              textTransform: "uppercase",
              letterSpacing: 3 * s,
              marginBottom: 16 * s,
            }}
          >
            Swipe →
          </div>
        )}

        {/* Main text */}
        <h1
          style={{
            fontSize: slide.type === "cta" ? 48 * s : isRehook ? 52 * s : 46 * s,
            fontWeight: 800,
            color: slide.type === "cta"
              ? accentColor
              : isRehook
              ? backgroundColor
              : textColor,
            lineHeight: 1.15,
            margin: 0,
            marginBottom: slide.body ? 16 * s : 0,
            textAlign: slide.type === "cta" ? "center" : "left",
          }}
        >
          {slide.headline}
        </h1>

        {/* Sub text */}
        {slide.body && (
          <p
            style={{
              fontSize: 22 * s,
              fontWeight: 400,
              color: isRehook ? backgroundColor : textColor,
              opacity: 0.6,
              lineHeight: 1.5,
              margin: 0,
              textAlign: slide.type === "cta" ? "center" : "left",
            }}
          >
            {slide.body}
          </p>
        )}

        {/* CTA button on last slide */}
        {slide.type === "cta" && (
          <div
            style={{
              marginTop: 40 * s,
              backgroundColor: accentColor,
              color: "#fff",
              fontSize: 20 * s,
              fontWeight: 700,
              padding: `${16 * s}px ${48 * s}px`,
              borderRadius: 50 * s,
              boxShadow: `0 ${4 * s}px ${24 * s}px ${accentColor}55`,
            }}
          >
            Get Started →
          </div>
        )}
      </div>

      {/* Bottom swipe indicator (not on last slide) */}
      {slide.type !== "cta" && (
        <div
          style={{
            position: "absolute",
            bottom: 24 * s,
            right: 24 * s,
            fontSize: 24 * s,
            color: isRehook ? backgroundColor : textColor,
            opacity: 0.3,
            zIndex: 1,
          }}
        >
          →
        </div>
      )}
    </div>
  );
}
