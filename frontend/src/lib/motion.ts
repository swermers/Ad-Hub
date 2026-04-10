/**
 * Shared Framer Motion animation tokens used across pages.
 */

/** Fade-up entrance animation. Accepts an optional delay in seconds. */
export const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

/** Stagger children entrance animation (0.08s between each child). */
export const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
