"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Product, type GenerateStatus } from "@/lib/api";
import { INDUSTRY_THEMES, getTheme } from "@/components/ad-templates/industryThemes";
import { fadeUp, stagger } from "@/lib/motion";

const CREATIVE_PRESETS = [
  { value: "", label: "None", description: "No creative direction — use default generation" },
  { value: "high_end_minimal", label: "High-End Minimal", description: "Luxury brand restraint — Apple, Aesop, Porsche", bestFor: ["saas-tech", "fintech", "real-estate"] },
  { value: "bold_disruptor", label: "Bold Disruptor", description: "Challenger brand energy — contrarian, scroll-stopping", bestFor: ["ecommerce", "fitness", "creative"] },
  { value: "warm_trust", label: "Warm & Trustworthy", description: "Approachable and genuine — Airbnb, Patagonia", bestFor: ["healthcare", "edtech", "real-estate"] },
  { value: "data_driven", label: "Data-Driven Impact", description: "Lead with numbers and proof — Bloomberg, Stripe", bestFor: ["saas-tech", "fintech"] },
  { value: "storyteller", label: "Story-Driven", description: "Emotional narratives — Nike, Dove", bestFor: ["fitness", "healthcare", "creative"] },
  { value: "real_estate_listing", label: "Real Estate Listing", description: "Luxury listings — lifestyle-first, editorial", bestFor: ["real-estate"] },
  { value: "saas_product", label: "SaaS / Tech Product", description: "Clear, sharp product marketing — Linear, Notion", bestFor: ["saas-tech", "edtech"] },
  { value: "ecommerce_conversion", label: "E-Commerce", description: "Desire + conversion — Glossier, Allbirds", bestFor: ["ecommerce"] },
  { value: "local_business", label: "Local Business", description: "Neighborhood trust — personal, warm, community", bestFor: [] },
];

const DESIGN_STYLES = [
  { value: "", label: "None", description: "No design style — use default generation" },
  { value: "flat", label: "Flat", description: "Simple, two-dimensional design without shadows or textures" },
  { value: "psychedelic", label: "Psychedelic", description: "Vibrant, swirling colors and distorted 60s visuals" },
  { value: "minimalism", label: "Minimalism", description: "Less is more — clean lines, ample white space" },
  { value: "japanese", label: "Japanese", description: "Bold typography and clean modern layouts" },
  { value: "poster_collage", label: "Poster Collage", description: "Layered, cut-and-paste mixed media" },
  { value: "indie_collage", label: "Indie Collage", description: "DIY, gritty zine culture aesthetic" },
  { value: "indie_groovy", label: "Indie Groovy", description: "70s-inspired wavy shapes and warm tones" },
  { value: "vintage_80s", label: "Vintage 80s", description: "Neon-tinged, high-contrast retro" },
  { value: "90s_editorial", label: "90s Editorial", description: "High-fashion magazine with serif fonts" },
  { value: "neo_3d", label: "Neo 3D", description: "Smooth, clay-like 3D rendered objects" },
  { value: "popping_colors", label: "Popping Colors", description: "High-saturation, high-energy palettes" },
  { value: "y2k", label: "Y2K", description: "Futuristic, metallic, blobby late-90s aesthetic" },
  { value: "liquid_retro", label: "Liquid Retro", description: "Psychedelic shapes meet retro-futurism" },
  { value: "metallic_typography", label: "Metallic Typography", description: "Chrome-like, liquid metal text effects" },
  { value: "font_mixing", label: "Font Mixing", description: "Multiple contrasting typefaces" },
  { value: "hand_drawn_doodles", label: "Hand-drawn Doodles", description: "Sketches and scribbles, organic feel" },
  { value: "noi_brutalism", label: "Noi Brutalism", description: "Raw, unpolished, high-contrast layouts" },
  { value: "rubber_hose", label: "Rubber Hose", description: "Classic 1920s/30s animation style" },
  { value: "romantasy", label: "Romantasy", description: "Romance meets fantasy — ethereal, dreamy" },
  { value: "pixel_art", label: "Pixel Art", description: "Low-resolution retro game graphics" },
  { value: "neoclassical", label: "Neoclassical", description: "Classical art and architecture influence" },
  { value: "memphis", label: "Memphis", description: "Geometric shapes, squiggles, and pastels" },
  { value: "cottagecore", label: "Cottagecore", description: "Nostalgic rural charm with flowers" },
  { value: "cybercore", label: "Cybercore", description: "Dark, techy glitches and neon" },
  { value: "brutalism", label: "Brutalism", description: "Bold, raw structure over beauty" },
  { value: "bauhaus", label: "Bauhaus", description: "Geometric forms and functionalism" },
];

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
  { value: "editorial_stack", label: "Editorial Stack" },
  { value: "brand_hero", label: "Brand Hero" },
  { value: "status_card", label: "Status Card" },
  { value: "handwritten_quote", label: "Handwritten Quote" },
  { value: "billboard", label: "Billboard" },
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
  const [industryVertical, setIndustryVertical] = useState("");
  const [logoFile, setLogoFile] = useState<string>("");
  const [creativePreset, setCreativePreset] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [usePremiumModel, setUsePremiumModel] = useState(false);
  const [designStyle, setDesignStyle] = useState("");

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

  // Auto-suggest a creative preset when industry changes
  useEffect(() => {
    if (!industryVertical || creativePreset) return;
    const autoMap: Record<string, string> = {
      "real-estate": "real_estate_listing",
      "saas-tech": "saas_product",
      "ecommerce": "ecommerce_conversion",
      "fintech": "data_driven",
      "healthcare": "warm_trust",
      "fitness": "bold_disruptor",
      "creative": "bold_disruptor",
      "edtech": "warm_trust",
    };
    const suggested = autoMap[industryVertical];
    if (suggested) setCreativePreset(suggested);
  }, [industryVertical, creativePreset]);

  // Auto-suggest a design style when industry changes
  useEffect(() => {
    if (!industryVertical || designStyle) return;
    const styleMap: Record<string, string> = {
      "saas-tech": "flat",
      "fintech": "minimalism",
      "ecommerce": "popping_colors",
      "healthcare": "minimalism",
      "edtech": "hand_drawn_doodles",
      "real-estate": "neoclassical",
      "fitness": "cybercore",
      "creative": "psychedelic",
    };
    const suggested = styleMap[industryVertical];
    if (suggested) setDesignStyle(suggested);
  }, [industryVertical, designStyle]);

  const handleGenerate = async () => {
    if (!productId) return;
    setGenerating(true);
    setStatus(null);

    try {
      // Get industry colors if a vertical is selected
      const theme = industryVertical ? getTheme(industryVertical) : undefined;
      const industryColors = theme ? theme.colors : undefined;

      const result = await api.generateContent(productId, {
        content_types: contentTypes,
        platforms,
        count,
        funnel_stage: funnelStage,
        instructions: instructions || undefined,
        template_type: templateType || undefined,
        aspect_ratio: aspectRatio || undefined,
        industry_vertical: industryVertical || undefined,
        creative_preset: creativePreset || undefined,
        image_url: imageUrl || undefined,
        industry_colors: industryColors,
        use_premium_model: usePremiumModel,
        design_style: designStyle || undefined,
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
            <ChipButton
              active={contentTypes.length === 6}
              onClick={() => {
                if (contentTypes.length === 6) {
                  setContentTypes([]);
                } else {
                  setContentTypes(["social_post", "ad_copy", "carousel", "story", "email", "blog_draft"]);
                }
              }}
            >
              All
            </ChipButton>
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
            <ChipButton
              active={platforms.length === 5}
              onClick={() => {
                if (platforms.length === 5) {
                  setPlatforms([]);
                } else {
                  setPlatforms(["twitter", "linkedin", "meta", "google", "general"]);
                }
              }}
            >
              All
            </ChipButton>
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

        {/* Industry Vertical */}
        <motion.div {...fadeUp(0.22)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Industry Vertical
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Auto-recommends templates &amp; color palettes for your industry
          </p>
          <div className="flex flex-wrap gap-2">
            <ChipButton
              active={industryVertical === ""}
              onClick={() => setIndustryVertical("")}
            >
              Auto
            </ChipButton>
            {INDUSTRY_THEMES.map((theme) => (
              <ChipButton
                key={theme.id}
                active={industryVertical === theme.id}
                onClick={() => setIndustryVertical(theme.id)}
              >
                {theme.label}
              </ChipButton>
            ))}
          </div>
          {industryVertical && (() => {
            const theme = getTheme(industryVertical);
            if (!theme) return null;
            const templateLabels = theme.recommendedTemplates.slice(0, 3).map((t) => {
              const match = TEMPLATE_CHOICES.find((c) => c.value === t);
              return match ? match.label : t;
            });
            return (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {[theme.colors.background, theme.colors.text, theme.colors.accent, theme.colors.accentSecondary].map((color, i) => (
                    <span
                      key={i}
                      className="inline-block w-4 h-4 rounded-full border border-[#E5E1E4]/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-[#E5E1E4]/30">
                  Recommended: {templateLabels.join(", ")}
                </span>
              </div>
            );
          })()}
        </motion.div>

        {/* Creative Preset */}
        <motion.div {...fadeUp(0.24)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Creative Direction
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Sets the tone, style, and copywriting approach for generated ads
          </p>
          <div className="flex flex-wrap gap-2">
            {CREATIVE_PRESETS
              .filter((p) => {
                // Show "None" always, plus presets that match selected industry or have no bestFor
                if (p.value === "") return true;
                if (!industryVertical) return true;
                return (p.bestFor?.length ?? 0) === 0 || p.bestFor?.includes(industryVertical);
              })
              .map((preset) => (
                <ChipButton
                  key={preset.value}
                  active={creativePreset === preset.value}
                  onClick={() => setCreativePreset(preset.value)}
                >
                  {preset.label}
                </ChipButton>
              ))}
          </div>
          {creativePreset && (() => {
            const preset = CREATIVE_PRESETS.find((p) => p.value === creativePreset);
            return preset ? (
              <p className="mt-2 text-xs text-[#E5E1E4]/40 font-mono">
                {preset.description}
              </p>
            ) : null;
          })()}
        </motion.div>

        {/* Design Style */}
        <motion.div {...fadeUp(0.25)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Design Style
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Visual aesthetic direction for generated imagery and ads
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {DESIGN_STYLES
              .filter((s) => s.value === "" || [
                "flat", "minimalism", "psychedelic", "y2k", "brutalism", "bauhaus", "neo_3d", "popping_colors",
              ].includes(s.value))
              .map((style) => (
                <ChipButton
                  key={style.value}
                  active={designStyle === style.value}
                  onClick={() => setDesignStyle(style.value)}
                >
                  {style.label}
                </ChipButton>
              ))}
          </div>
          <select
            value={designStyle}
            onChange={(e) => setDesignStyle(e.target.value)}
            className="w-full px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors appearance-none cursor-pointer"
          >
            {DESIGN_STYLES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {designStyle && (() => {
            const style = DESIGN_STYLES.find((s) => s.value === designStyle);
            return style ? (
              <p className="mt-2 text-xs text-[#E5E1E4]/40 font-mono">
                {style.description}
              </p>
            ) : null;
          })()}
        </motion.div>

        {/* Visual Template */}
        <motion.div {...fadeUp(0.26)}>
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
        <motion.div {...fadeUp(0.30)}>
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
        <motion.div {...fadeUp(0.34)}>
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

        {/* Brand Assets — Logo upload */}
        <motion.div {...fadeUp(0.38)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Brand Logo
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Optional — appears in templates that support a logo slot
          </p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4]/60 hover:border-[#FF9500]/30 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {logoFile ? "Logo uploaded" : "Upload logo"}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setLogoFile(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            {logoFile && (
              <div className="flex items-center gap-2">
                <img src={logoFile} alt="Logo" className="h-8 w-8 object-contain rounded" />
                <button
                  onClick={() => setLogoFile("")}
                  className="text-[#ffb4ab] text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Hero Image URL */}
        <motion.div {...fadeUp(0.39)}>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">
            Hero Image URL
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mb-3 font-mono">
            Paste a URL to a listing photo, product shot, or hero image to use in templates
          </p>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/listing-photo.jpg"
              className="flex-1 px-4 py-3 glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 transition-colors"
            />
            {imageUrl && (
              <button
                onClick={() => setImageUrl("")}
                className="text-[#ffb4ab] text-xs hover:underline shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-[#554334]/30 w-32 h-32">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Premium Model Toggle */}
        <motion.div {...fadeUp(0.40)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-1">
                Premium Quality
              </p>
              <p className="text-xs text-[#E5E1E4]/30 font-mono">
                Uses Claude Opus for sharper, more nuanced ad copy (auto-enabled for ad copy)
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setUsePremiumModel(!usePremiumModel)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                usePremiumModel
                  ? "bg-[#FF9500]"
                  : "bg-[#353437]/60"
              }`}
            >
              <motion.div
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ left: usePremiumModel ? 24 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div {...fadeUp(0.42)}>
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
            placeholder={
              industryVertical === "real-estate"
                ? "e.g., 4BR/3BA in Westlake, $1.2M, focus on the open kitchen and backyard views..."
                : industryVertical === "saas-tech"
                ? "e.g., Focus on the new AI features and how they save 5+ hours per week..."
                : industryVertical === "ecommerce"
                ? "e.g., Summer collection drop, highlight the linen fabric and earth tones..."
                : "e.g., Focus on the new curation features and how they save time..."
            }
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
        <motion.div {...fadeUp(0.46)}>
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
