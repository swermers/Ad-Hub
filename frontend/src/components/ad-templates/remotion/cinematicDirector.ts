/**
 * Cinematic Director — Maps content analysis to cinematic feature profiles.
 *
 * Receives content analysis metadata from the backend and returns a profile
 * that compositions use to decide which effects to apply.
 *
 * This is the bridge between content intelligence and visual execution.
 */

export interface ContentAnalysis {
  energy: "high" | "medium" | "calm";
  structure: "narrative" | "data" | "contrast" | "testimonial" | "list";
  mood: "urgent" | "aspirational" | "educational" | "provocative";
  has_numbers: boolean;
  has_question: boolean;
  headline_length: number;
}

export interface CinematicProfile {
  /** Enable motion blur on fast transitions (high-energy content) */
  motionBlur: boolean;
  /** Parallax depth multiplier: 0 = no parallax, 1 = full depth separation */
  parallaxDepth: number;
  /** Text animation style */
  kineticType: "cascade" | "charReveal" | "typewriter" | "standard";
  /** Floating background particles */
  particlesEnabled: boolean;
  /** Number of particles */
  particleCount: number;
  /** Scene transition style */
  transitionStyle: "fade" | "wipe" | "dissolve" | "blur";
  /** Animation pacing — affects frame timing */
  pacing: "fast" | "medium" | "slow";
  /** Stagger delay between word/element animations (in frames) */
  staggerDelay: number;
}

/**
 * Derive a cinematic profile from content analysis.
 * Each composition reads this to decide which effects to apply.
 */
export function getCinematicProfile(analysis: ContentAnalysis | null | undefined): CinematicProfile {
  // Default profile — safe baseline
  if (!analysis) {
    return {
      motionBlur: false,
      parallaxDepth: 0.5,
      kineticType: "cascade",
      particlesEnabled: false,
      particleCount: 0,
      transitionStyle: "fade",
      pacing: "medium",
      staggerDelay: 4,
    };
  }

  const isHighEnergy = analysis.energy === "high";
  const isCalm = analysis.energy === "calm";
  const isData = analysis.structure === "data";
  const isTestimonial = analysis.structure === "testimonial";
  const isUrgent = analysis.mood === "urgent";
  const isAspirational = analysis.mood === "aspirational";

  return {
    // Motion blur for high-energy, urgent content
    motionBlur: isHighEnergy || isUrgent,

    // Deep parallax for calm/aspirational; shallow for urgent
    parallaxDepth: isCalm || isAspirational ? 1.0 : isUrgent ? 0.2 : 0.5,

    // Character reveal for testimonials; cascade for energy; standard for data
    kineticType: isTestimonial
      ? "charReveal"
      : isHighEnergy
        ? "cascade"
        : isData
          ? "standard"
          : "cascade",

    // Particles for aspirational content
    particlesEnabled: isAspirational || isCalm,
    particleCount: isAspirational ? 12 : isCalm ? 8 : 0,

    // Transition style
    transitionStyle: isUrgent
      ? "wipe"
      : isCalm
        ? "dissolve"
        : isHighEnergy
          ? "blur"
          : "fade",

    // Pacing
    pacing: isHighEnergy || isUrgent ? "fast" : isCalm ? "slow" : "medium",

    // Stagger delay (faster for energy, slower for calm)
    staggerDelay: isHighEnergy ? 2 : isCalm ? 6 : 4,
  };
}
