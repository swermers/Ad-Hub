"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* ── Animation helpers (Command Center design language) ── */
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/* ── Data ── */
const OUTPUT_TYPES = [
  { id: "whitepaper", label: "Whitepaper", icon: "description" },
  { id: "social", label: "Social Thread", icon: "forum" },
  { id: "newsletter", label: "Newsletter", icon: "mail" },
  { id: "script", label: "Script", icon: "movie" },
];

const PROGRESS_STEPS = [
  { label: "Ingest", complete: true },
  { label: "Analyze", complete: true },
  { label: "Synthesize", complete: false },
  { label: "Output", complete: false },
];

const WAVEFORM_HEIGHTS = [12, 20, 28, 36, 44, 52, 44, 36, 28, 20, 16, 10];

export default function StudioPage() {
  const [selectedOutput, setSelectedOutput] = useState("whitepaper");
  const [multiLingualSeo, setMultiLingualSeo] = useState(true);
  const [autoImageGen, setAutoImageGen] = useState(false);
  const [hookText, setHookText] = useState("");

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 md:px-8 py-8 pb-28"
    >
      {/* ── Workflow Header ── */}
      <motion.section {...fadeUp(0)} className="mb-10">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          {/* Left: title block */}
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                Content Studio
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4] mb-3">
              Content <span className="text-[#E5E1E4]/30">Studio</span>
              <span className="text-[#FF9500]">.</span>
            </h1>
            <p className="text-[#E5E1E4]/60 text-base leading-relaxed max-w-lg mb-2">
              Transform raw voice memos and unstructured notes into polished,
              multi-format content — powered by liquid-precision AI synthesis.
            </p>
            <p className="font-mono text-[11px] text-[#E5E1E4]/30 tracking-wider">
              SRV-STUDIO-04 &middot; PID LP-0042 &middot; LATENCY 42ms
            </p>
          </div>

          {/* Right: progress bar */}
          <motion.div
            {...fadeUp(0.16)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl px-6 py-5 min-w-[300px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
                Pipeline
              </span>
              <span className="text-sm font-bold text-[#FF9500]">
                68%{" "}
                <span className="text-[#E5E1E4]/40 font-normal">
                  Synthesizing
                </span>
              </span>
            </div>

            {/* Progress track */}
            <div className="relative flex items-center gap-0">
              {/* Background bar */}
              <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-[#353437]" />
              {/* Filled bar */}
              <motion.div
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "68%" }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
                style={{
                  background: "linear-gradient(90deg, #FF9500, #ffbd7f)",
                }}
              />

              {/* Step dots */}
              <div className="relative flex justify-between w-full">
                {PROGRESS_STEPS.map((s, i) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 z-10 transition-all ${
                        s.complete
                          ? "bg-[#FF9500] border-[#FF9500]"
                          : i === 2
                          ? "bg-[#131315] border-[#FF9500] shadow-[0_0_8px_rgba(255,149,0,0.5)]"
                          : "bg-[#131315] border-[#353437]"
                      }`}
                    />
                    <span className="text-[10px] text-[#E5E1E4]/40 whitespace-nowrap">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Main Bento Grid ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ──── LEFT COLUMN (col-span-7) ──── */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Voice Memo Drop Zone */}
          <motion.div
            {...fadeUp(0.24)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-8 group relative overflow-hidden"
          >
            {/* Subtle background glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04] rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, #FF9500 0%, transparent 70%)",
              }}
            />

            <div className="relative flex flex-col items-center text-center py-8">
              {/* Mic icon with pulse */}
              <div className="relative mb-6">
                {/* Pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute w-20 h-20 rounded-full border border-[#FF9500]/20 animate-ping" />
                  <span
                    className="absolute w-28 h-28 rounded-full border border-[#FF9500]/10 animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                </div>
                <div className="relative w-16 h-16 rounded-full bg-[#FF9500]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-4xl">
                    mic
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-[#E5E1E4] mb-1">
                Drop voice memo here
              </h3>
              <p className="text-sm text-[#E5E1E4]/40 mb-6">
                or drag &amp; drop an audio file to begin synthesis
              </p>

              {/* Waveform Bars - framer-motion animated heights */}
              <div className="flex items-end gap-1.5 h-14 mb-6">
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-2 rounded-full bg-[#FF9500]"
                    style={{ opacity: 0.4 + (h / 52) * 0.6 }}
                    animate={{
                      height: [h * 0.4, h, h * 0.4],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl border border-[#554334] text-sm font-medium text-[#E5E1E4]/70 hover:border-[#FF9500]/50 hover:text-[#E5E1E4] transition-colors"
              >
                <span className="material-symbols-outlined text-base mr-1.5 align-middle">
                  library_music
                </span>
                Select from library
              </motion.button>
            </div>
          </motion.div>

          {/* AI Insights Preview */}
          <motion.div {...fadeUp(0.32)} className="grid grid-cols-2 gap-4">
            {/* Tone Detection */}
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-xl">
                    auto_awesome
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#E5E1E4]/40 uppercase tracking-wider">
                    AI Insight
                  </p>
                  <p className="text-sm font-semibold text-[#E5E1E4]">
                    Tone Detection
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#E5E1E4]/50">Authoritative</span>
                  <span className="text-[#FF9500] font-medium">87%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#353437] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "87%" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                    style={{
                      background: "linear-gradient(90deg, #FF9500, #ffbd7f)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#E5E1E4]/50">Conversational</span>
                  <span className="text-[#ffbd7f] font-medium">62%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#353437] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#ffbd7f]"
                    initial={{ width: 0 }}
                    animate={{ width: "62%" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Complexity Score */}
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-xl">
                    speed
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#E5E1E4]/40 uppercase tracking-wider">
                    AI Insight
                  </p>
                  <p className="text-sm font-semibold text-[#E5E1E4]">
                    Complexity Score
                  </p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span
                  className="font-extrabold text-[#FF9500] leading-none"
                  style={{ fontSize: "2.75rem" }}
                >
                  7.4
                </span>
                <span className="text-sm text-[#E5E1E4]/40 mb-1">/10</span>
              </div>
              <p className="text-xs text-[#E5E1E4]/40 mt-2">
                Graduate-level readability — suitable for professional audiences
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ──── RIGHT COLUMN (col-span-5) ──── */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Studio Parameters Panel */}
          <motion.div
            {...fadeUp(0.4)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-5">
              Studio Parameters
            </h3>

            {/* Output Type Selector - 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {OUTPUT_TYPES.map((t) => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedOutput(t.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                    selectedOutput === t.id
                      ? "border-2 border-[#FF9500] bg-[#FF9500]/10 shadow-[0_0_20px_rgba(255,149,0,0.1)]"
                      : "border border-[#353437] bg-[#1b1b1d]/50 hover:border-[#554334]"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      selectedOutput === t.id
                        ? "text-[#FF9500]"
                        : "text-[#E5E1E4]/40"
                    }`}
                  >
                    {t.icon}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      selectedOutput === t.id
                        ? "text-[#FF9500]"
                        : "text-[#E5E1E4]/60"
                    }`}
                  >
                    {t.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Contextual Hook textarea */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-[#E5E1E4]/50 mb-2 uppercase tracking-wider">
                Contextual Hook
              </label>
              <textarea
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
                placeholder="Add a framing hook or key angle for the output..."
                rows={3}
                className="w-full bg-[#1b1b1d] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/25 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 resize-none transition-all"
              />
            </div>

            {/* Toggle switches */}
            <div className="space-y-4 mb-6">
              {/* Multi-lingual SEO */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg text-[#E5E1E4]/40">
                    translate
                  </span>
                  <span className="text-sm text-[#E5E1E4]/70">
                    Multi-lingual SEO
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMultiLingualSeo(!multiLingualSeo)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    multiLingualSeo ? "bg-[#FF9500]" : "bg-[#353437]"
                  }`}
                >
                  <motion.span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: multiLingualSeo ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>

              {/* Auto-Image Gen */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-lg text-[#E5E1E4]/40">
                    image
                  </span>
                  <span className="text-sm text-[#E5E1E4]/70">
                    Auto-Image Gen
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAutoImageGen(!autoImageGen)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    autoImageGen ? "bg-[#FF9500]" : "bg-[#353437]"
                  }`}
                >
                  <motion.span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: autoImageGen ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>

            {/* Begin Synthesis CTA */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="liquid-gradient w-full py-3.5 rounded-xl text-sm font-bold text-[#2d1600] transition-all hover:shadow-[0_4px_24px_rgba(255,149,0,0.35)]"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">bolt</span>
                Begin Synthesis
              </span>
            </motion.button>
          </motion.div>

          {/* Recent Output Card */}
          <motion.div
            {...fadeUp(0.48)}
            whileHover={{ y: -4 }}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl overflow-hidden"
          >
            <div className="relative h-36 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"
                alt="Q3 Market Strategy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-[#FF9500]/15 text-[#FF9500] text-[10px] font-semibold uppercase tracking-wider mb-1">
                  Whitepaper
                </span>
                <h4 className="text-sm font-semibold text-[#E5E1E4]">
                  Q3 Market Strategy
                </h4>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#E5E1E4]/40">
                <span className="material-symbols-outlined text-sm">
                  schedule
                </span>
                2 hours ago
              </div>
              <div className="flex items-center gap-1 text-xs text-[#FF9500] font-medium">
                <span className="material-symbols-outlined text-sm">
                  open_in_new
                </span>
                View
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Floating FAB ── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full liquid-gradient shadow-[0_4px_24px_rgba(255,149,0,0.4)] flex items-center justify-center hover:shadow-[0_6px_32px_rgba(255,149,0,0.55)] transition-shadow z-50 group"
      >
        <span className="material-symbols-outlined text-[#2d1600] text-2xl group-hover:rotate-90 transition-transform duration-300">
          auto_awesome
        </span>
      </motion.button>
    </motion.div>
  );
}
