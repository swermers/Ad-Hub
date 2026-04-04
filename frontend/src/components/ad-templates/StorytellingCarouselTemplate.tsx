"use client";

import React from "react";
import type { AdTemplateProps } from "./types";
import {
  generateStorytellingSlides,
  StorytellingSlideTemplate,
} from "./StorytellingCarouselGenerator";

/**
 * Storytelling Carousel — single-slide wrapper for the TemplateRenderer registry.
 *
 * Renders the hook slide (slide 1) as a preview. The full interactive carousel
 * is available via StorytellingCarouselPreview in the content detail page.
 */
export function StorytellingCarouselTemplate({
  headline,
  body,
  cta,
  backgroundColor,
  textColor,
  accentColor,
  imageUrl,
  aspectRatio = "4:5",
  scale = 1,
}: AdTemplateProps) {
  const slides = generateStorytellingSlides(headline, body, cta);
  const hookSlide = slides[0];

  // Pass imageUrl to hook slide if available
  if (imageUrl) {
    hookSlide.imageUrl = imageUrl;
  }

  return (
    <StorytellingSlideTemplate
      slide={hookSlide}
      backgroundColor={backgroundColor}
      textColor={textColor}
      accentColor={accentColor}
      aspectRatio={aspectRatio}
      scale={scale}
    />
  );
}
