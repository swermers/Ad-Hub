/**
 * Data Hype Composition
 *
 * Animated data visualization for stats-heavy ads:
 * - Counting number animation (e.g. "10,000+ users")
 * - Animated bar chart
 * - Growth trend line
 * - Social proof counter
 *
 * Best for: Fintech, SaaS metrics, e-commerce, growth stories
 * Duration: 6 seconds @ 30fps
 */

import { AbsoluteFill, useCurrentFrame, Sequence } from "remotion";
import type { AspectRatio } from "../types";
import { ASPECT_DIMENSIONS } from "../types";
import { TYPE, isLightColor } from "./swissDesign";
import { IconTrending, IconZap } from "./icons";
import {
  drawProgress,
  animatedCounter,
  springScale,
  springSlideUp,
  springStagger,
  springBlurIn,
  animatedMeshGradient,
  vignetteOverlay,
  breathe,
  responsiveFontSize,
  safeTruncate,
  shiftHue,
} from "./animationUtils";

interface DataHypeProps {
  headline: string;
  body: string;
  cta: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  screenshotUrl?: string;
  aspectRatio?: AspectRatio;
  brandFont?: string;
  /** Main stat number (e.g. "340") */
  statNumber?: string;
  /** Unit/suffix for the stat (e.g. "%", "K+", "M") */
  statSuffix?: string;
  /** Pipe-delimited bar chart labels (e.g. "Q1|Q2|Q3|Q4") */
  chartLabels?: string;
}

const FPS = 30;

export function DataHypeComposition({
  headline,
  body,
  cta,
  backgroundColor = "#0a0a0f",
  textColor = "#ffffff",
  accentColor = "#22c55e",
  aspectRatio = "1:1",
  brandFont,
  statNumber,
  statSuffix,
  chartLabels,
}: DataHypeProps) {
  const frame = useCurrentFrame();
  const { width, height } = ASPECT_DIMENSIONS[aspectRatio];
  const font = brandFont || TYPE.fontFamily;

  // Parse stat number
  const targetNum = parseInt(statNumber || "0", 10) || 340;
  const suffix = statSuffix || "%";

  // Parse chart data (generate synthetic growth bars if none provided)
  const labels = chartLabels
    ? chartLabels.split("|").map((l) => l.trim())
    : ["Jan", "Feb", "Mar", "Apr", "May"];
  const barValues = labels.map((_, i) => 0.3 + (i / labels.length) * 0.6 + Math.sin(i * 1.5) * 0.1);

  // ─── Timeline (frames) ───
  const PHASE = {
    bgPulse: [0, FPS * 0.5],
    statEntrance: [FPS * 0.3, FPS * 1.5],
    statCount: [FPS * 1.0, FPS * 3.0],
    headlineReveal: [FPS * 1.5, FPS * 2.5],
    chartDraw: [FPS * 2.5, FPS * 4.5],
    trendLine: [FPS * 3.0, FPS * 4.5],
    ctaEntrance: [FPS * 4.5, FPS * 5.2],
  };

  // Stat number — spring scale entrance + breathing pulse after count finishes
  const currentNum = animatedCounter(frame, PHASE.statCount[0], PHASE.statCount[1] - PHASE.statCount[0], targetNum);
  const statAnim = springScale(frame, FPS, PHASE.statEntrance[0], 0.6, "bouncy");
  const statPulse = breathe(frame, PHASE.statCount[1], 45, 0.025);

  // Headline — spring blur-in + spring slide-up
  const headlineBlur = springBlurIn(frame, FPS, PHASE.headlineReveal[0], 12, "smooth");
  const headlineSlide = springSlideUp(frame, FPS, PHASE.headlineReveal[0], 30, "smooth");

  // CTA — spring slide-up
  const ctaAnim = springSlideUp(frame, FPS, PHASE.ctaEntrance[0], 20, "snappy");

  // Chart bars — spring stagger
  const barSprings = springStagger(frame, FPS, labels.length, PHASE.chartDraw[0], 4, "snappy");

  // Trend line draw (kept as-is)
  const trendProgress = drawProgress(frame, PHASE.trendLine[0], FPS * 1.2);

  // Accent glow
  const accentSecondary = shiftHue(accentColor, 40);

  // Animated mesh gradient background
  const bgGradient = animatedMeshGradient(frame, FPS, backgroundColor, accentColor, 0.15);

  // Vignette overlay
  const vignette = vignetteOverlay(0.5);

  // Layout calculations
  const padding = width * 0.07;
  const chartAreaTop = height * 0.48;
  const chartAreaHeight = height * 0.30;

  return (
    <AbsoluteFill style={{ backgroundColor, fontFamily: font, overflow: "hidden" }}>
      {/* Animated mesh gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: bgGradient,
      }} />

      {/* Cinematic vignette overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: vignette,
        pointerEvents: "none",
      }} />

      {/* Scene 1: Big stat number */}
      <Sequence from={0} durationInFrames={FPS * 6} name="stat-number">
        <div style={{
          position: "absolute",
          top: height * 0.06,
          left: padding,
          right: padding,
          textAlign: "center",
          ...statAnim,
        }}>
          {/* Stat label */}
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase" as const,
            letterSpacing: 3,
            marginBottom: 12,
            opacity: statAnim.opacity,
          }}>
            {safeTruncate(body, 30)}
          </div>

          {/* Big number with breathing pulse */}
          <div style={{
            fontSize: responsiveFontSize(`${currentNum}${suffix}`, 140, 8, 0.5),
            fontWeight: 900,
            color: textColor,
            letterSpacing: -4,
            lineHeight: 0.9,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${statPulse})`,
          }}>
            {currentNum.toLocaleString()}<span style={{ color: accentColor }}>{suffix}</span>
          </div>

          {/* Trend badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
            padding: "6px 14px",
            borderRadius: 20,
            backgroundColor: `${accentColor}18`,
            border: `1px solid ${accentColor}30`,
            opacity: headlineSlide.opacity,
          }}>
            <IconTrending size={16} color={accentColor} progress={drawProgress(frame, PHASE.headlineReveal[0], FPS * 0.5)} />
            <span style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>
              Growth
            </span>
          </div>
        </div>
      </Sequence>

      {/* Scene 2: Headline with blur-in */}
      <Sequence from={0} durationInFrames={FPS * 6} name="headline">
        <div style={{
          position: "absolute",
          top: height * 0.38,
          left: padding,
          right: padding,
          textAlign: "center",
          fontSize: responsiveFontSize(headline, 36, 35),
          fontWeight: 700,
          color: textColor,
          letterSpacing: -0.5,
          lineHeight: 1.15,
          opacity: headlineBlur.opacity,
          filter: headlineBlur.filter,
          transform: `${headlineSlide.transform} ${headlineBlur.transform}`,
        }}>
          {safeTruncate(headline, 50)}
        </div>
      </Sequence>

      {/* Scene 3: Bar chart with spring stagger */}
      <Sequence from={0} durationInFrames={FPS * 6} name="bar-chart">
        <div style={{
          position: "absolute",
          top: chartAreaTop,
          left: padding,
          right: padding,
          height: chartAreaHeight,
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
        }}>
          {labels.map((label, i) => {
            const barProgress = barSprings[i];
            const barH = barValues[i] * chartAreaHeight * barProgress;
            const isLast = i === labels.length - 1;

            return (
              <div key={i} style={{
                flex: 1,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                gap: 6,
              }}>
                <div style={{
                  width: "100%",
                  height: barH,
                  borderRadius: 6,
                  background: isLast
                    ? `linear-gradient(180deg, ${accentColor}, ${accentSecondary})`
                    : `linear-gradient(180deg, ${accentColor}60, ${accentColor}25)`,
                  boxShadow: isLast ? `0 4px 20px ${accentColor}40` : "none",
                  transition: "height 0.1s",
                }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: `${textColor}60`,
                  letterSpacing: 0.5,
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Trend line overlay on chart */}
        <svg
          style={{
            position: "absolute",
            top: chartAreaTop,
            left: padding,
            width: width - padding * 2,
            height: chartAreaHeight,
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${width - padding * 2} ${chartAreaHeight}`}
        >
          <polyline
            points={barValues.map((v, i) => {
              const x = i * ((width - padding * 2) / (labels.length - 1));
              const y = chartAreaHeight - v * chartAreaHeight;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke={accentColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={800}
            strokeDashoffset={800 * (1 - trendProgress)}
            opacity={0.6}
          />
        </svg>
      </Sequence>

      {/* Scene 4: CTA with spring slide-up */}
      <Sequence from={0} durationInFrames={FPS * 6} name="cta">
        <div style={{
          position: "absolute",
          bottom: height * 0.05,
          left: padding,
          right: padding,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...ctaAnim,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: accentColor,
            color: isLightColor(accentColor) ? "#111" : "#fff",
            padding: "14px 28px",
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: 0.5,
            boxShadow: `0 8px 30px ${accentColor}40`,
          }}>
            {safeTruncate(cta, 25)}
            <IconZap size={18} color={isLightColor(accentColor) ? "#111" : "#fff"} />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
