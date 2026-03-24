import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import type { AspectRatio } from "../types";
import { getDimensions } from "../types";
import { TYPE, GRID, PALETTE, headlineSize, SPACE, isLightColor } from "./swissDesign";
import { safeTruncate } from "./animationUtils";

export interface SwissCarouselProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
  /**
   * Pipe-delimited slide headlines, e.g. "Slide 1|Slide 2|Slide 3"
   * Falls back to splitting the headline into words if not provided.
   */
  slideHeadlines?: string;
}

/**
 * Swiss Carousel composition.
 *
 * Multi-slide ad — each slide is a clean typographic statement
 * with geometric accents. Pagination dots track progress.
 * Smooth crossfade between slides.
 *
 * 5 slides, 2s per slide = 10 seconds at 30fps = 300 frames
 */
export function SwissCarouselComposition({
  headline,
  body,
  cta,
  backgroundColor = PALETTE.light,
  textColor = PALETTE.dark,
  accentColor = "#2563eb",
  aspectRatio = "1:1",
  brandFont,
  slideHeadlines,
}: SwissCarouselProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = getDimensions(aspectRatio);

  const font = brandFont || TYPE.fontFamily;

  // Parse slides — use pipe-delimited headlines, or split body into slides
  const slides = parseSlides(headline, body, cta, slideHeadlines);
  const slideCount = slides.length;
  const framesPerSlide = Math.floor((fps * 10) / slideCount);
  const transitionFrames = Math.floor(fps * 0.4);

  // Current slide index
  const currentSlideIndex = Math.min(
    Math.floor(frame / framesPerSlide),
    slideCount - 1,
  );
  const frameInSlide = frame - currentSlideIndex * framesPerSlide;

  // Slide entrance/exit
  const slideEnter = interpolate(
    frameInSlide,
    [0, transitionFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const slideExit = currentSlideIndex < slideCount - 1
    ? interpolate(
        frameInSlide,
        [framesPerSlide - transitionFrames, framesPerSlide],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) },
      )
    : 1;
  const slideOpacity = Math.min(slideEnter, slideExit);

  // Text slide-up on enter
  const textY = interpolate(
    frameInSlide,
    [0, transitionFrames],
    [40, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const currentSlide = slides[currentSlideIndex];

  // Accent bar width animation
  const barWidth = interpolate(
    frameInSlide,
    [transitionFrames * 0.5, transitionFrames * 1.5],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  // Geometric accent — rotates position per slide
  const accentPositions = [
    { x: 75, y: 10, size: 25 },
    { x: 5, y: 70, size: 20 },
    { x: 80, y: 75, size: 18 },
    { x: 10, y: 10, size: 22 },
    { x: 60, y: 5, size: 30 },
  ];
  const accentPos = accentPositions[currentSlideIndex % accentPositions.length];

  // Is this the last slide (CTA slide)?
  const isLastSlide = currentSlideIndex === slideCount - 1;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* Geometric accent — circle outline, changes position per slide */}
      <div
        style={{
          position: "absolute",
          left: (accentPos.x / 100) * width,
          top: (accentPos.y / 100) * height,
          width: (accentPos.size / 100) * width,
          height: (accentPos.size / 100) * height,
          borderRadius: "50%",
          border: `3px solid ${accentColor}`,
          opacity: slideOpacity * 0.25,
          transform: `scale(${slideEnter})`,
        }}
      />

      {/* Slide number — top left */}
      <div
        style={{
          position: "absolute",
          top: GRID.margin,
          left: GRID.margin,
          opacity: slideOpacity * 0.4,
        }}
      >
        <span
          style={{
            fontSize: TYPE.caption.size,
            fontWeight: TYPE.caption.weight,
            letterSpacing: TYPE.caption.tracking,
            textTransform: "uppercase",
            color: accentColor,
          }}
        >
          {String(currentSlideIndex + 1).padStart(2, "0")} / {String(slideCount).padStart(2, "0")}
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          left: GRID.margin,
          right: GRID.margin,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: slideOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        {/* Slide headline */}
        <h1
          style={{
            fontSize: headlineSize(safeTruncate(currentSlide.text, 25)),
            fontWeight: TYPE.display.weight,
            lineHeight: TYPE.display.lineHeight,
            letterSpacing: TYPE.display.tracking,
            color: textColor,
            margin: 0,
            textTransform: "uppercase",
            maxWidth: GRID.spanWidth(10, width),
          }}
        >
          {safeTruncate(currentSlide.text, 25)}
        </h1>

        {/* Accent bar */}
        <div
          style={{
            width: `${barWidth}%`,
            maxWidth: GRID.spanWidth(6, width),
            height: 5,
            backgroundColor: accentColor,
            marginTop: 28,
            marginBottom: 28,
          }}
        />

        {/* Sub-text (body on first slide, CTA on last) */}
        {currentSlide.sub && (
          <p
            style={{
              fontSize: TYPE.body.size,
              fontWeight: TYPE.body.weight,
              lineHeight: TYPE.body.lineHeight,
              color: textColor,
              opacity: 0.6,
              margin: 0,
              maxWidth: GRID.spanWidth(7, width),
            }}
          >
            {currentSlide.sub}
          </p>
        )}

        {/* CTA on last slide */}
        {isLastSlide && (
          <div
            style={{
              marginTop: 40,
              display: "inline-flex",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                backgroundColor: accentColor,
                color: isLightColor(accentColor) ? PALETTE.dark : PALETTE.light,
                fontSize: TYPE.cta.size,
                fontWeight: TYPE.cta.weight,
                letterSpacing: TYPE.cta.tracking,
                textTransform: "uppercase",
                padding: "20px 52px",
              }}
            >
              {cta}
            </div>
          </div>
        )}
      </div>

      {/* Pagination dots — bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: GRID.margin,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {slides.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentSlideIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentSlideIndex ? accentColor : textColor,
              opacity: i === currentSlideIndex ? 1 : 0.2,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

interface SlideContent {
  text: string;
  sub?: string;
}

function parseSlides(
  headline: string,
  body: string,
  cta: string,
  slideHeadlines?: string,
): SlideContent[] {
  // If pipe-delimited slide headlines provided, use those
  if (slideHeadlines && slideHeadlines.includes("|")) {
    const headlines = slideHeadlines.split("|").map((s) => s.trim()).filter(Boolean);
    return headlines.map((text, i) => ({
      text,
      sub: i === 0 ? body : undefined,
    }));
  }

  // Otherwise, construct slides from headline + body
  // Slide 1: Hook/problem
  // Slide 2-3: Key points from body
  // Slide 4: Value prop
  // Slide 5: CTA slide
  const bodyParts = body
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const slides: SlideContent[] = [
    { text: headline, sub: bodyParts[0] || undefined },
  ];

  // Add body parts as middle slides
  for (let i = 0; i < Math.min(bodyParts.length, 3); i++) {
    slides.push({ text: bodyParts[i] });
  }

  // CTA slide
  slides.push({ text: cta, sub: headline });

  // Ensure we have 3-5 slides
  while (slides.length < 3) {
    slides.splice(slides.length - 1, 0, { text: headline });
  }
  if (slides.length > 5) {
    return slides.slice(0, 5);
  }

  return slides;
}
