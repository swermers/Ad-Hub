"use client";

import React from "react";
import type { AspectRatio } from "./types";
import { getDimensions } from "./types";
import { GrainOverlay, NoiseGradient, PaperTexture, VignetteOverlay } from "./textures";
import { AccentLine, QuoteMarks, ArrowChevron, DotGrid, DiagonalCut, FlowLine } from "./design-elements";

// ─── Slide Types ─────────────────────────────────────────────────────────────

export interface StorytellingSlide {
  role: "hook" | "build" | "rehook" | "insight" | "takeaway" | "cta";
  headline: string;
  subtext?: string;
  detail?: string;
  inverted?: boolean;
  featured?: boolean;
  imageUrl?: string;
  isAnimated?: boolean;
  slideNumber: number;
  totalSlides: number;
}

// ─── Slide Generator ─────────────────────────────────────────────────────────

/**
 * Generate a storytelling carousel from headline/body/cta.
 *
 * Narrative arc:
 *   1. Hook — bold, high-contrast, information gap (80% of engagement weight)
 *   2. Secondary hook — almost as compelling (IG resurfaces slide 2)
 *   3-4. Build — one insight per slide, digestible
 *   5. Rehook — pattern interrupt to prevent drop-off
 *   6-7. Insight/Takeaway — deep value, save-worthy
 *   8. CTA — direct, value-driven action
 */
export function generateStorytellingSlides(
  headline: string,
  body: string,
  cta: string,
): StorytellingSlide[] {
  const sentences = body
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Build adaptive slide count based on available content
  const hasEnoughContent = sentences.length >= 4;
  const slides: StorytellingSlide[] = [];

  // Slide 1: Hook — the scroll-stopper
  slides.push({
    role: "hook",
    headline,
    subtext: sentences[0] || undefined,
    isAnimated: true, // Mixed media: hook gets motion
    slideNumber: 1,
    totalSlides: 0, // Set after
  });

  // Slide 2: Secondary hook — IG resurfaces this if slide 1 doesn't convert
  slides.push({
    role: "build",
    headline: sentences[1] || sentences[0] || "Here's what most people miss.",
    subtext: sentences[2] || undefined,
    slideNumber: 2,
    totalSlides: 0,
  });

  if (hasEnoughContent) {
    // Slide 3: Build
    slides.push({
      role: "build",
      headline: sentences[2] || "But there's more to it.",
      subtext: sentences[3] || undefined,
      detail: sentences[4] || undefined,
      slideNumber: 3,
      totalSlides: 0,
    });

    // Slide 4: Insight
    slides.push({
      role: "insight",
      headline: sentences[3] || sentences[2] || "The real pattern.",
      subtext: sentences[5] || sentences[4] || undefined,
      inverted: true,
      slideNumber: 4,
      totalSlides: 0,
    });

    // Slide 5: Rehook — pattern interrupt at drop-off point
    const rehookText = sentences[4] || sentences[3] || "Let that sink in.";
    slides.push({
      role: "rehook",
      headline: rehookText.length > 40 ? rehookText.slice(0, 37) + "..." : rehookText,
      featured: true,
      isAnimated: true, // Mixed media: rehook gets motion
      slideNumber: 5,
      totalSlides: 0,
    });

    // Slide 6: Takeaway
    if (sentences.length >= 5) {
      slides.push({
        role: "takeaway",
        headline: sentences[sentences.length - 2] || "The takeaway.",
        detail: sentences[sentences.length - 1] || undefined,
        slideNumber: 6,
        totalSlides: 0,
      });
    }
  }

  // Final slide: CTA
  slides.push({
    role: "cta",
    headline: cta || "Learn More",
    subtext: sentences[sentences.length - 1] || undefined,
    slideNumber: slides.length + 1,
    totalSlides: 0,
  });

  // Set totalSlides on all
  const total = slides.length;
  for (const slide of slides) {
    slide.totalSlides = total;
    slide.slideNumber = slides.indexOf(slide) + 1;
  }

  return slides;
}

// ─── Slide Renderer ──────────────────────────────────────────────────────────

interface StorytellingSlideTemplateProps {
  slide: StorytellingSlide;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  aspectRatio?: AspectRatio;
  scale?: number;
}

export function StorytellingSlideTemplate({
  slide,
  backgroundColor = "#1a1a1a",
  textColor = "#f5f0eb",
  accentColor = "#d4a574",
  aspectRatio = "4:5",
  scale = 1,
}: StorytellingSlideTemplateProps) {
  const { width, height } = getDimensions(aspectRatio, scale);
  const s = scale;

  const isInverted = slide.inverted;
  const isFeatured = slide.featured;
  const bg = isInverted ? accentColor : backgroundColor;
  const text = isInverted ? backgroundColor : textColor;
  const mutedText = isInverted
    ? `${backgroundColor}AA`
    : `${textColor}88`;
  const accent = isInverted ? backgroundColor : accentColor;

  return (
    <div
      style={{
        width,
        height,
        background: bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${56 * s}px ${48 * s}px`,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Texture layers */}
      <GrainOverlay opacity={isInverted ? 0.2 : 0.3} />
      {slide.role === "rehook" && <NoiseGradient opacity={0.2} color={accent} />}
      {slide.role === "insight" && <PaperTexture opacity={0.1} />}
      {slide.role === "hook" && <VignetteOverlay opacity={0.3} />}

      {/* AI-generated image background on hook/featured slides */}
      {slide.imageUrl && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${slide.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, ${bg}ee 60%, ${bg} 100%)`,
              zIndex: 0,
            }}
          />
        </>
      )}

      {/* Design elements based on role */}
      {slide.role === "hook" && (
        <div style={{ position: "absolute", top: -60 * s, right: -40 * s, zIndex: 0 }}>
          <DiagonalCut color={accent} opacity={0.08} scale={s * 1.5} />
        </div>
      )}
      {slide.role === "build" && (
        <div style={{ position: "absolute", bottom: 40 * s, right: 30 * s, zIndex: 0 }}>
          <DotGrid color={accent} opacity={0.08} scale={s * 0.8} />
        </div>
      )}
      {slide.role === "insight" && (
        <div style={{ position: "absolute", top: "20%", left: -20 * s, zIndex: 0 }}>
          <FlowLine color={accent} opacity={0.1} scale={s * 0.8} />
        </div>
      )}
      {slide.role === "takeaway" && (
        <div style={{ position: "absolute", top: 80 * s, right: 40 * s, zIndex: 0 }}>
          <QuoteMarks color={accent} opacity={0.08} scale={s * 1.2} />
        </div>
      )}

      {/* Slide number — top right */}
      <div
        style={{
          position: "absolute",
          top: 28 * s,
          right: 32 * s,
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: 11 * s,
          letterSpacing: "0.08em",
          color: mutedText,
          zIndex: 1,
        }}
      >
        {String(slide.slideNumber).padStart(2, "0")} / {String(slide.totalSlides).padStart(2, "0")}
      </div>

      {/* Brand mark — top left on first and last slides */}
      {(slide.slideNumber === 1 || slide.role === "cta") && (
        <div
          style={{
            position: "absolute",
            top: 28 * s,
            left: 32 * s,
            fontFamily: "'DM Mono', 'Courier New', monospace",
            fontSize: 10 * s,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 1,
          }}
        >
          ●
        </div>
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Accent line before headline on insight/takeaway/rehook slides */}
        {(slide.role === "insight" || slide.role === "takeaway" || slide.role === "rehook") && (
          <div style={{ marginBottom: 28 * s }}>
            <AccentLine color={accent} opacity={0.6} scale={s} />
          </div>
        )}

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: isFeatured
              ? 42 * s
              : slide.role === "hook"
              ? 52 * s
              : 32 * s,
            fontWeight: isFeatured ? 600 : slide.role === "hook" ? 700 : 500,
            fontStyle: slide.role === "cta" ? "italic" : "normal",
            lineHeight: 1.2,
            color: text,
            margin: 0,
            marginBottom: (slide.subtext || slide.detail) ? 24 * s : 0,
            letterSpacing: "-0.01em",
            maxWidth: "90%",
          }}
        >
          {slide.headline}
        </h1>

        {/* Subtext */}
        {slide.subtext && (
          <p
            style={{
              fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
              fontSize: 16 * s,
              lineHeight: 1.65,
              color: mutedText,
              margin: 0,
              marginBottom: slide.detail ? 20 * s : 0,
              maxWidth: "85%",
              fontWeight: 400,
            }}
          >
            {slide.subtext}
          </p>
        )}

        {/* Detail / pull quote */}
        {slide.detail && slide.role !== "cta" && (
          <p
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: isFeatured ? 30 * s : 18 * s,
              fontStyle: isFeatured ? "normal" : "italic",
              fontWeight: isFeatured ? 500 : 400,
              lineHeight: 1.4,
              color: isFeatured ? accent : accent,
              margin: 0,
              maxWidth: "90%",
            }}
          >
            {slide.detail}
          </p>
        )}

        {/* CTA slide layout */}
        {slide.role === "cta" && (
          <div style={{ marginTop: 16 * s }}>
            <div style={{ marginBottom: 12 * s }}>
              <ArrowChevron color={accent} opacity={0.6} scale={s * 1.5} />
            </div>
            {slide.subtext && (
              <p
                style={{
                  fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
                  fontSize: 14 * s,
                  color: mutedText,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {slide.subtext}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line on hook slide */}
      {slide.role === "hook" && (
        <div
          style={{
            position: "absolute",
            bottom: 36 * s,
            left: 48 * s,
            zIndex: 1,
          }}
        >
          <AccentLine color={accent} opacity={0.5} scale={s} />
        </div>
      )}
    </div>
  );
}
