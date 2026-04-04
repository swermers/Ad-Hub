/**
 * Remotion Root — registers all compositions for server-side rendering.
 *
 * Used by:
 *   - `@remotion/bundler` to create a webpack bundle
 *   - `@remotion/renderer` to render compositions to MP4/WebM
 *   - CLI: `npx remotion render src/components/ad-templates/remotion/Root.tsx <compositionId> output.mp4`
 */
import React from "react";
import { Composition } from "remotion";

import { AdComposition } from "./AdComposition";
import { PASComposition } from "./PASComposition";
import { KineticTextComposition } from "./KineticTextComposition";
import { SwissTypeComposition } from "./SwissTypeComposition";
import { SwissGridComposition } from "./SwissGridComposition";
import { SwissMinimalComposition } from "./SwissMinimalComposition";
import { SwissCarouselComposition } from "./SwissCarouselComposition";
import { SwissStoryComposition } from "./SwissStoryComposition";
import { SwissBoldComposition } from "./SwissBoldComposition";
import { SwissStackComposition } from "./SwissStackComposition";
import { HandDrawnComposition } from "./HandDrawnComposition";
import { SaasDemoComposition } from "./SaasDemoComposition";
import { DataHypeComposition } from "./DataHypeComposition";
import { SocialProofComposition } from "./SocialProofComposition";
import { ImageFrameOverlayComposition } from "./ImageFrameOverlayComposition";
import { StorytellingCarouselComposition } from "./StorytellingCarouselComposition";

const FPS = 30;

/** Default props used when no inputProps are provided (e.g. Remotion Studio preview) */
const DEFAULT_PROPS = {
  headline: "Your Headline Here",
  body: "Body copy goes here. Describe your product or service.",
  cta: "Get Started",
  backgroundColor: "#0f0f0e",
  textColor: "#fafaf8",
  accentColor: "#FF9500",
};

/**
 * Each entry maps a VideoStyle to a Composition registration.
 * compositionId matches the VideoStyle key used in the frontend.
 */
const COMPOSITIONS: {
  id: string;
  component: React.ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  durationSeconds: number;
  width: number;
  height: number;
}[] = [
  { id: "default", component: AdComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "swiss-bold", component: SwissBoldComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "swiss-stack", component: SwissStackComposition, durationSeconds: 6, width: 1080, height: 1080 },
  { id: "swiss-type", component: SwissTypeComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "swiss-grid", component: SwissGridComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "swiss-minimal", component: SwissMinimalComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "swiss-carousel", component: SwissCarouselComposition, durationSeconds: 10, width: 1080, height: 1080 },
  { id: "swiss-story", component: SwissStoryComposition, durationSeconds: 6, width: 1080, height: 1920 },
  { id: "pas", component: PASComposition, durationSeconds: 6, width: 1080, height: 1080 },
  { id: "kinetic", component: KineticTextComposition, durationSeconds: 5, width: 1080, height: 1080 },
  { id: "hand-drawn", component: HandDrawnComposition, durationSeconds: 8, width: 1080, height: 1080 },
  { id: "saas-demo", component: SaasDemoComposition, durationSeconds: 8, width: 1080, height: 1080 },
  { id: "data-hype", component: DataHypeComposition, durationSeconds: 6, width: 1080, height: 1080 },
  { id: "social-proof", component: SocialProofComposition, durationSeconds: 7, width: 1080, height: 1920 },
  { id: "image-overlay", component: ImageFrameOverlayComposition, durationSeconds: 7, width: 1080, height: 1080 },
  { id: "storytelling-carousel", component: StorytellingCarouselComposition, durationSeconds: 18, width: 1080, height: 1350 },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {COMPOSITIONS.map((c) => (
        <Composition
          key={c.id}
          id={c.id}
          component={c.component}
          durationInFrames={FPS * c.durationSeconds}
          fps={FPS}
          width={c.width}
          height={c.height}
          defaultProps={DEFAULT_PROPS}
        />
      ))}
    </>
  );
};
