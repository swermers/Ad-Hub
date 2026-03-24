import React from "react";
import type { AdTemplateProps } from "./types";
import type { AspectRatio } from "./types";
import { BeforeAfterTemplate } from "./BeforeAfterTemplate";
import { PainSolutionTemplate } from "./PainSolutionTemplate";
import { StatProofTemplate } from "./StatProofTemplate";
import { BoldHookTemplate } from "./BoldHookTemplate";
import { TestimonialTemplate } from "./TestimonialTemplate";
import { GradientCardTemplate } from "./GradientCardTemplate";
import { MinimalCleanTemplate } from "./MinimalCleanTemplate";
import { SplitImageTemplate } from "./SplitImageTemplate";
import { StoryVerticalTemplate } from "./StoryVerticalTemplate";
import { CarouselCardTemplate } from "./CarouselCardTemplate";
import { UGCStyleTemplate } from "./UGCStyleTemplate";
import { ImageFrameOverlayTemplate } from "./ImageFrameOverlayTemplate";

interface TemplateRendererProps extends AdTemplateProps {
  templateType: string;
}

const TEMPLATES: Record<string, React.ComponentType<AdTemplateProps>> = {
  before_after: BeforeAfterTemplate,
  pain_solution: PainSolutionTemplate,
  stat_proof: StatProofTemplate,
  bold_hook: BoldHookTemplate,
  testimonial: TestimonialTemplate,
  gradient_card: GradientCardTemplate,
  minimal_clean: MinimalCleanTemplate,
  split_image: SplitImageTemplate,
  story_vertical: StoryVerticalTemplate,
  carousel_card: CarouselCardTemplate,
  ugc_style: UGCStyleTemplate,
  image_frame_overlay: ImageFrameOverlayTemplate,
};

export function TemplateRenderer({ templateType, ...props }: TemplateRendererProps) {
  const Component = TEMPLATES[templateType] || PainSolutionTemplate;
  return <Component {...props} />;
}

export { TEMPLATES };

export const TEMPLATE_OPTIONS: {
  value: string;
  label: string;
  description: string;
  bestFor: string[];
  defaultAspect: AspectRatio;
}[] = [
  // --- Original Templates (upgraded) ---
  {
    value: "before_after",
    label: "Before / After",
    description: "Split layout comparing pain state vs. desired outcome",
    bestFor: ["feed", "carousel"],
    defaultAspect: "1:1",
  },
  {
    value: "pain_solution",
    label: "Pain → Solution",
    description: "Bold headline with pain point, solution body, strong CTA",
    bestFor: ["feed"],
    defaultAspect: "1:1",
  },
  {
    value: "stat_proof",
    label: "Stat / Social Proof",
    description: "Big number or statistic with supporting context",
    bestFor: ["feed", "carousel"],
    defaultAspect: "1:1",
  },
  // --- New Visual Templates ---
  {
    value: "bold_hook",
    label: "Bold Hook",
    description: "Scroll-stopping headline with product screenshot background and glowing CTA",
    bestFor: ["feed", "stories", "reels"],
    defaultAspect: "4:5",
  },
  {
    value: "testimonial",
    label: "Testimonial / Review",
    description: "Customer quote with star rating and social proof styling",
    bestFor: ["feed", "carousel"],
    defaultAspect: "1:1",
  },
  {
    value: "gradient_card",
    label: "Product Showcase",
    description: "Floating product card with gradient mesh background and glowing accent",
    bestFor: ["feed", "stories"],
    defaultAspect: "4:5",
  },
  {
    value: "minimal_clean",
    label: "Minimal Clean",
    description: "High-end minimalist design with strong typography and product image",
    bestFor: ["feed", "carousel"],
    defaultAspect: "1:1",
  },
  {
    value: "split_image",
    label: "Split Image + Copy",
    description: "Side-by-side image and text layout, great for product features",
    bestFor: ["feed"],
    defaultAspect: "1:1",
  },
  {
    value: "story_vertical",
    label: "Story / Reel",
    description: "Full-screen vertical format optimized for Instagram Stories and Reels",
    bestFor: ["stories", "reels", "tiktok"],
    defaultAspect: "9:16",
  },
  {
    value: "carousel_card",
    label: "Carousel Card",
    description: "Numbered card with pagination dots, designed for multi-slide carousels",
    bestFor: ["carousel"],
    defaultAspect: "1:1",
  },
  {
    value: "ugc_style",
    label: "UGC / Native",
    description: "Looks like native social content with caption overlay and engagement icons",
    bestFor: ["stories", "reels", "tiktok"],
    defaultAspect: "9:16",
  },
  {
    value: "image_frame_overlay",
    label: "Image Frame Overlay",
    description: "Product photo with promotional badge overlay — great for sales and launches",
    bestFor: ["feed", "stories", "carousel"],
    defaultAspect: "1:1",
  },
];
