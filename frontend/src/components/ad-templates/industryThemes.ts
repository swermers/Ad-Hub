/**
 * Industry-specific theme presets for ad templates.
 * Each theme provides a curated color palette and animation pacing
 * optimized for the visual language of that industry vertical.
 */

export interface IndustryTheme {
  id: string;
  label: string;
  description: string;
  /** Primary brand-feel colors */
  colors: {
    background: string;
    text: string;
    accent: string;
    accentSecondary: string;
  };
  /** Suggested animation pacing multiplier (1.0 = normal) */
  pacing: number;
  /** Best-fit video styles for this industry */
  recommendedStyles: string[];
  /** Best-fit static templates */
  recommendedTemplates: string[];
  /** Best-fit design styles (visual aesthetics) */
  recommendedDesignStyles: string[];
}

export const INDUSTRY_THEMES: IndustryTheme[] = [
  // 1. SaaS / Tech — Trust Blue, clean, professional
  {
    id: "saas-tech",
    label: "SaaS / Tech",
    description: "Clean, professional, trust-building — blues and purples",
    colors: {
      background: "#0f1117",
      text: "#f0f0f5",
      accent: "#6366f1",
      accentSecondary: "#818cf8",
    },
    pacing: 1.0,
    recommendedStyles: ["saas-demo", "swiss-minimal", "swiss-bold", "data-hype"],
    recommendedTemplates: ["bold_hook", "gradient_card", "minimal_clean", "stat_proof"],
    recommendedDesignStyles: ["flat", "minimalism", "bauhaus"],
  },
  // 2. Fintech / Banking — Growth Green, data-driven, premium dark
  {
    id: "fintech",
    label: "Fintech",
    description: "Data-driven, growth-focused — greens on dark",
    colors: {
      background: "#0a0f0d",
      text: "#e8f5e9",
      accent: "#22c55e",
      accentSecondary: "#4ade80",
    },
    pacing: 0.9,
    recommendedStyles: ["data-hype", "swiss-grid", "swiss-type", "swiss-stack"],
    recommendedTemplates: ["stat_proof", "minimal_clean", "bold_hook"],
    recommendedDesignStyles: ["flat", "minimalism", "neo_3d"],
  },
  // 3. E-Commerce / DTC — Energetic, warm, conversion-focused
  {
    id: "ecommerce",
    label: "E-Commerce",
    description: "Energetic, warm, conversion-focused — amber and coral",
    colors: {
      background: "#1a1008",
      text: "#fff8f0",
      accent: "#f59e0b",
      accentSecondary: "#fb923c",
    },
    pacing: 1.2,
    recommendedStyles: ["social-proof", "swiss-bold", "kinetic", "swiss-carousel"],
    recommendedTemplates: ["bold_hook", "before_after", "testimonial", "ugc_style"],
    recommendedDesignStyles: ["popping_colors", "y2k", "memphis"],
  },
  // 4. Healthcare / Wellness — Calm, trustworthy, clean
  {
    id: "healthcare",
    label: "Healthcare",
    description: "Calm, trustworthy, clinical — teals and soft greens",
    colors: {
      background: "#0f1a1a",
      text: "#e0f2f1",
      accent: "#14b8a6",
      accentSecondary: "#5eead4",
    },
    pacing: 0.85,
    recommendedStyles: ["swiss-minimal", "hand-drawn", "swiss-type", "pas"],
    recommendedTemplates: ["before_after", "testimonial", "pain_solution", "minimal_clean"],
    recommendedDesignStyles: ["minimalism", "cottagecore", "flat"],
  },
  // 5. Education / EdTech — Knowledge-focused, approachable
  {
    id: "edtech",
    label: "Education",
    description: "Approachable, knowledge-focused — warm purples",
    colors: {
      background: "#140f1a",
      text: "#f3e8ff",
      accent: "#a855f7",
      accentSecondary: "#c084fc",
    },
    pacing: 0.95,
    recommendedStyles: ["kinetic", "swiss-carousel", "saas-demo", "swiss-stack"],
    recommendedTemplates: ["stat_proof", "pain_solution", "carousel_card", "split_image"],
    recommendedDesignStyles: ["hand_drawn_doodles", "flat", "rubber_hose"],
  },
  // 6. Real Estate — Premium, warm, aspirational
  {
    id: "real-estate",
    label: "Real Estate",
    description: "Premium, aspirational — warm golds and deep navies",
    colors: {
      background: "#0c0f1a",
      text: "#f5f0e8",
      accent: "#d4a537",
      accentSecondary: "#e8c468",
    },
    pacing: 0.9,
    recommendedStyles: ["swiss-minimal", "swiss-bold", "swiss-grid", "default"],
    recommendedTemplates: ["bold_hook", "gradient_card", "split_image", "story_vertical"],
    recommendedDesignStyles: ["minimalism", "neoclassical", "90s_editorial"],
  },
  // 7. Fitness / Lifestyle — Bold, high-energy, motivation
  {
    id: "fitness",
    label: "Fitness",
    description: "Bold, high-energy, motivational — reds and oranges",
    colors: {
      background: "#1a0a0a",
      text: "#fff0f0",
      accent: "#ef4444",
      accentSecondary: "#f97316",
    },
    pacing: 1.3,
    recommendedStyles: ["kinetic", "swiss-bold", "social-proof", "pas"],
    recommendedTemplates: ["bold_hook", "before_after", "ugc_style", "testimonial"],
    recommendedDesignStyles: ["popping_colors", "cybercore", "vintage_80s"],
  },
  // 8. Creative / Agency — Distinctive, bold, artistic
  {
    id: "creative",
    label: "Creative / Agency",
    description: "Distinctive, artistic, experimental — hot pinks and cyans",
    colors: {
      background: "#0f0a14",
      text: "#f8f0ff",
      accent: "#ec4899",
      accentSecondary: "#06b6d4",
    },
    pacing: 1.1,
    recommendedStyles: ["hand-drawn", "kinetic", "swiss-grid", "swiss-type"],
    recommendedTemplates: ["gradient_card", "split_image", "ugc_style", "bold_hook"],
    recommendedDesignStyles: ["psychedelic", "indie_collage", "memphis", "bauhaus"],
  },
];

/** Get theme by ID */
export function getTheme(id: string): IndustryTheme | undefined {
  return INDUSTRY_THEMES.find((t) => t.id === id);
}

/** Get recommended video styles for an industry */
export function getRecommendedStyles(industryId: string): string[] {
  return getTheme(industryId)?.recommendedStyles || [];
}

/** Get recommended static templates for an industry */
export function getRecommendedTemplates(industryId: string): string[] {
  return getTheme(industryId)?.recommendedTemplates || [];
}

/** Get recommended design styles for an industry */
export function getRecommendedDesignStyles(industryId: string): string[] {
  return getTheme(industryId)?.recommendedDesignStyles || [];
}
