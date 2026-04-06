"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type TextRevealAnimation =
  | "reveal-up"
  | "fade-words"
  | "stagger"
  | "scramble";

interface TextRevealProps {
  /** The text content to animate */
  text: string;
  /** Animation style */
  animation?: TextRevealAnimation;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Animation duration (seconds) */
  duration?: number;
  /** Additional CSS class */
  className?: string;
  /** HTML tag to render */
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
}

/**
 * TextReveal — GSAP-powered text animation component.
 *
 * Animates text on mount with one of several reveal styles.
 * Uses @gsap/react useGSAP hook for proper React lifecycle management.
 */
export function TextReveal({
  text,
  animation = "reveal-up",
  delay = 0,
  duration = 0.6,
  className = "",
  as: Tag = "div",
}: TextRevealProps) {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const words = containerRef.current.querySelectorAll(".tr-word");
      if (words.length === 0) return;

      switch (animation) {
        case "reveal-up":
          gsap.fromTo(
            words,
            { y: "100%", opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration,
              delay,
              stagger: 0.05,
              ease: "power3.out",
            },
          );
          break;

        case "fade-words":
          gsap.fromTo(
            words,
            { opacity: 0, filter: "blur(4px)" },
            {
              opacity: 1,
              filter: "blur(0px)",
              duration: duration * 1.2,
              delay,
              stagger: 0.08,
              ease: "power2.out",
            },
          );
          break;

        case "stagger":
          gsap.fromTo(
            words,
            { y: 20, opacity: 0, scale: 0.95 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration,
              delay,
              stagger: 0.06,
              ease: "back.out(1.4)",
            },
          );
          break;

        case "scramble":
          gsap.fromTo(
            words,
            { opacity: 0, x: -10 },
            {
              opacity: 1,
              x: 0,
              duration: duration * 0.8,
              delay,
              stagger: 0.04,
              ease: "power2.out",
            },
          );
          break;
      }
    },
    { scope: containerRef, dependencies: [text, animation, delay, duration] },
  );

  // Split text into word spans for per-word animation
  const words = text.split(/\s+/);

  return (
    <Tag
      ref={containerRef as React.RefObject<never>}
      className={className}
      style={{ overflow: "hidden" }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="tr-word"
          style={{
            display: "inline-block",
            marginRight: "0.25em",
            opacity: 0,
          }}
        >
          {word}
        </span>
      ))}
    </Tag>
  );
}
