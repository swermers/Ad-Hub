"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Product, type GenerateStatus } from "@/lib/api";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const TEMPLATE_CHOICES = [
  { value: "", label: "Auto (Best for platform)" },
  { value: "bold_hook", label: "Bold Hook" },
  { value: "pain_solution", label: "Pain \u2192 Solution" },
  { value: "before_after", label: "Before / After" },
  { value: "stat_proof", label: "Stat / Social Proof" },
  { value: "testimonial", label: "Testimonial" },
  { value: "gradient_card", label: "Product Showcase" },
  { value: "minimal_clean", label: "Minimal Clean" },
  { value: "split_image", label: "Split Image + Copy" },
  { value: "story_vertical", label: "Story / Reel" },
  { value: "carousel_card", label: "Carousel Card" },
  { value: "ugc_style", label: "UGC / Native" },
];

const ASPECT_CHOICES = [
  { value: "", label: "Auto" },
  { value: "1:1", label: "1:1 Square" },
  { value: "4:5", label: "4:5 Portrait" },
  { value: "9:16", label: "9:16 Story" },
];

/** Toggle chip button with micro-interactions */
function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
        active
          ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500] shadow-lg shadow-[#FF9500]/15"
          : "glass-prism bg-[#1b1b1d]/60 backdrop-blur-xl text-[#E5E1E4]/60 border-[#554334]/30 hover:border-[#FF9500]/30 hover:text-[#E5E1E4]/80"
      }`}
    >
      {children}
    </motion.button>
  );
}

/** Animated generation progress overlay */
function GenerationProgress({
  status,
}: {
  status: GenerateStatus | null;
}) {
  const steps = [
    { label: "Analyzing product", icon: "01" },
    { label: "Crafting copy", icon: "02" },
    { label: "Generating visuals", icon: "03" },
    { label: "Polishing output", icon: "04" },
  ];

  const piecesGenerated = status?.pieces_generated ?? 0;
  const activeStep =
    piecesGenerated === 0 ? 0 : piecesGenerated <= 2 ? 1 : piecesGenerated <= 4 ? 2 : 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-prism rounded-2xl border border-[#FF9500]/20 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 overflow-hidden"
    >
      {/* Animated glow bar at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#353437] overflow-hidden rounded-t-2xl">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FF9500] via-[#ffbd7f] to-[#FF9500]"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{ width: "60%" }}
        />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF9500]" />
        </span>
        <p className="text-sm font-semibold text-[#E5E1E4]">
          Generating content...
        </p>
        <span className="ml-auto font-mono text-[10px] text-[#E5E1E4]/30 tracking-wider">
          {piecesGenerated} pieces created
        </span>
      </div>

      {/* Step indicators */}
      <div className="grid grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all duration-500 ${
                i <= activeStep
                  ? "bg-[#FF9500]/15 border-[#FF9500]/30 text-[#FF9500]"
                  : "bg-[#353437]/30 border-[#554334]/20 text-[#E5E1E4]/20"
              }`}
              animate={
                i === activeStep
                  ? { scale: [1, 1.08, 1] }
                  : {}
              }
              transition={
                i === activeStep
                  ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            >
              {step.icon}
            </motion.div>
            <p
              className={`text-[10px] font-medium text-center transition-colors duration-500 ${
                i <= activeStep ? "text-[#E5E1E4]/60" : "text-[#E5E1E4]/20"
              }`}
            >
              {step.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-1.5 rounded-full bg-[#353437]/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#FF9500] to-[#ffbd7f]"
          initial={{ width: "5%" }}
          animate={{ width: `${Math.max(5, (activeStep + 1) * 25)}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

function GenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<GenerateStatus | null>(null);

  const [productId, setProductId] = useState(
    searchParams.get("product_id") || ""
  );
  const [contentTypes, setContentTypes] = useState<string[]>(["social_post"]);
  const [platforms, setPlatforms] = useState<string[]>(["twitter"]);
  const [count, setCount] = useState(5);
  const [funnelStage, setFunnelStage] = useState("awareness");
  const [instructions, setInstructions] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");

  useEffect(() => {
    api
      .listProducts()
      .then((p) => {
        setProducts(p);
        if (!productId && p.length > 0) setProductId(p[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  const handleGenerate = async () => {
    if (!productId) return;
    setGenerating(true);
    setStatus(null);

    try {
      const result = await api.generateContent(productId, {
        content_types: contentTypes,
        platforms,
        count,
        funnel_stage: funnelStage,
        instructions: instructions || undefined,
        template_type: templateType || undefined,
        aspect_ratio: aspectRatio || undefined,
      });
      setStatus(result);

      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const s = await api.getGenerateStatus(productId, result.task_id);
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            clearInterval(interval);
            setGenerating(false);
            if (s.status === "completed") {
              router.push(`/content?product_id=${productId}`);
            }
          }
        } catch {
          clearInterval(interval);
          setGenerating(false);
        }
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Loading skeleton
  if (loading)
    return (
      <motion.div
        className="animate-pulse space-y-6 max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="space-y-3">
          <div className="h-3 w-32 bg-[#FF9500]/20 rounded" />
          <div className="h-12 w-80 bg-[#E5E1E4]/10 rounded" />
          <div className="h-4 w-56 bg-[#E5E1E4]/5 rounded" />
        </div>
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 h-16" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 bg-[#1b1b1d]/60 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-[#1b1b1d]/60 rounded-xl" />
          ))}
        </div>
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 h-28" />
        <div className="h-12 w-full bg-[#FF9500]/20 rounded-2xl" />
      </motion.div>
    );

  // Empty state - no products
  if (products.length === 0)
    return (
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
        className="max-w-3xl"
      >
        <motion.div {...fadeUp(0)} className="mb-10">
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Generate
          </p>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
            Create<span className="text-[#E5E1E4]/30">{" "}Content.</span>
          </h1>
        </motion.div>

        <motion.div
          {...fadeUp(0.12)}
          className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF9500]/10 border border-[#FF9500]/20 flex items-center justify-center"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </motion.div>
          <p className="text-sm font-semibold text-[#E5E1E4]/50">
            No products found
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-6 max-w-sm mx-auto">
            Add a product first so we can tailor content to your brand, audience, and goals.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/products")}
            className="inline-flex px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/30 transition-shadow"
          >
            Add Your First Product
          </motion.button>
        </motion.div>
      </motion.div>
    );

  // Compute estimated output count
  const estimatedPieces = contentTypes.length * platforms.length * count;

  return (
    <motion.div
      className="max-w-3xl"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
            Content Studio
          </p>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
          </span>
        </div>
        <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
          Generate<span className="text-[#E5E1E4]/30">{" "}Content.</span>
        </h1>
        <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
          SYS:GENERATE // configure &amp; launch // {new Date().toLocaleDateString()}
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* Product Selection */}
        <motion.div {...fadeUp(0.06)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Product
          </p>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-3 glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Content Types */}
        <motion.div {...fadeUp(0.1)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Content Types
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ["social_post", "Social Post"],
              ["ad_copy", "Ad Copy"],
              ["carousel", "Carousel"],
              ["story", "Story / Reel"],
              ["email", "Email"],
              ["blog_draft", "Blog Draft"],
            ].map(([value, label]) => (
              <ChipButton
                key={value}
                active={contentTypes.includes(value)}
                onClick={() => toggleItem(contentTypes, setContentTypes, value)}
              >
                {label}
              </ChipButton>
            ))}
          </div>
        </motion.div>

        {/* Platforms */}
        <motion.div {...fadeUp(0.14)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Platforms
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ["twitter", "Twitter/X"],
              ["linkedin", "LinkedIn"],
              ["meta", "Meta/Facebook"],
              ["google", "Google Ads"],
              ["general", "General"],
            ].map(([value, label]) => (
              <ChipButton
                key={value}
                active={platforms.includes(value)}
                onClick={() => toggleItem(platforms, setPlatforms, value)}
              >
                {label}
              </ChipButton>
            ))}
          </div>
        </motion.div>

        {/* Funnel Stage */}
        <motion.div {...fadeUp(0.18)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Funnel Stage
          </p>
          <div className="flex gap-2">
            {[
              ["awareness", "Awareness"],
              ["consideration", "Consideration"],
              ["conversion", "Conversion"],
            ].map(([value, label]) => (
              <ChipButton
                key={value}
                active={funnelStage === value}
                onClick={() => setFunnelStage(value)}
              >
                {label}
              </ChipButton>
            ))}
          </div>
        </motion.div>

        {/* Visual Template */}
        <motion.div {...fadeUp(0.22)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Visual Template
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Choose how the visual preview will look for generated content
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CHOICES.slice(0, 5).map(({ value, label }) => (
              <ChipButton
                key={value}
                active={templateType === value}
                onClick={() => setTemplateType(value)}
              >
                {label}
              </ChipButton>
            ))}
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors appearance-none cursor-pointer"
            >
              {TEMPLATE_CHOICES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Aspect Ratio */}
        <motion.div {...fadeUp(0.26)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Aspect Ratio
          </p>
          <div className="flex gap-2">
            {ASPECT_CHOICES.map(({ value, label }) => (
              <ChipButton
                key={value}
                active={aspectRatio === value}
                onClick={() => setAspectRatio(value)}
              >
                {label}
              </ChipButton>
            ))}
          </div>
        </motion.div>

        {/* Count Slider */}
        <motion.div {...fadeUp(0.3)}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
              Variations per type/platform
            </p>
            <span className="text-2xl font-bold text-[#E5E1E4] tracking-tight">
              {count}
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#353437]/60
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[#FF9500]
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-[#FF9500]/30
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[#FF9500]
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:duration-150
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-[#FF9500]
                [&::-moz-range-thumb]:shadow-lg
                [&::-moz-range-thumb]:shadow-[#FF9500]/30
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[#FF9500]
                [&::-moz-range-track]:bg-[#353437]/60
                [&::-moz-range-track]:rounded-full
                [&::-moz-range-track]:h-1.5"
            />
            {/* Filled track */}
            <div
              className="absolute top-1/2 left-0 h-1.5 rounded-full bg-gradient-to-r from-[#FF9500] to-[#ffbd7f] pointer-events-none -translate-y-1/2"
              style={{ width: `${((count - 1) / 9) * 100}%` }}
            />
          </div>
          <p className="text-xs text-[#E5E1E4]/30 mt-2 font-mono">
            Estimated output: ~{estimatedPieces} piece{estimatedPieces !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Instructions */}
        <motion.div {...fadeUp(0.34)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
            Additional Instructions
            <span className="text-[#E5E1E4]/20 font-medium normal-case tracking-normal ml-2">
              optional
            </span>
          </p>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="e.g., Focus on the new curation features and how they save time..."
            className="w-full px-4 py-3 glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 transition-colors resize-none"
          />
        </motion.div>

        {/* Status / Progress */}
        <AnimatePresence mode="wait">
          {status && generating && (
            <GenerationProgress status={status} />
          )}
        </AnimatePresence>

        {status?.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-prism rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 backdrop-blur-xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-[#ffb4ab]">
                Generation failed
              </p>
              <p className="text-xs text-[#ffb4ab]/60 mt-0.5">
                {status.error}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStatus(null)}
              className="text-[#ffb4ab]/60 hover:text-[#ffb4ab] text-xs font-medium px-3 py-1.5 rounded-lg border border-[#ffb4ab]/20 hover:bg-[#ffb4ab]/10 transition-colors"
            >
              Dismiss
            </motion.button>
          </motion.div>
        )}

        {/* Generate Button */}
        <motion.div {...fadeUp(0.38)}>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleGenerate}
            disabled={generating || !productId || contentTypes.length === 0}
            className="w-full px-6 py-4 bg-[#FF9500] text-[#2d1600] rounded-2xl text-sm font-bold tracking-wide hover:shadow-lg hover:shadow-[#FF9500]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </motion.span>
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Content
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <motion.div
          className="animate-pulse space-y-6 max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="space-y-3">
            <div className="h-3 w-32 bg-[#FF9500]/20 rounded" />
            <div className="h-12 w-80 bg-[#E5E1E4]/10 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-16"
            />
          ))}
        </motion.div>
      }
    >
      <GenerateForm />
    </Suspense>
  );
}
