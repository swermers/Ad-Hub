"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Product } from "@/lib/api";

const OUTPUT_TYPES = [
  { id: "newsletter", label: "Newsletter", icon: "mail" },
  { id: "social", label: "Social Posts", icon: "forum" },
  { id: "video_script", label: "Video Script", icon: "movie" },
  { id: "x_thread", label: "X Thread", icon: "tag" },
];

const TEMPLATE_OPTIONS = [
  { id: "A", label: "Reflective Essay", desc: "First-person observation + metaphor" },
  { id: "B", label: "Practical Guide", desc: "Scenario + 3-5 actionable steps" },
  { id: "C", label: "Personal Story", desc: "Anecdote + lesson + reflection" },
  { id: "D", label: "Quick Hit", desc: "Observation + reframe + question" },
];

interface StudioParametersProps {
  productId: string;
  onProductChange: (id: string) => void;
  selectedOutputs: string[];
  onOutputsChange: (outputs: string[]) => void;
  templateOverride: string | null;
  onTemplateChange: (template: string | null) => void;
  autoRun: boolean;
  onAutoRunChange: (v: boolean) => void;
  hookText: string;
  onHookTextChange: (v: string) => void;
  onBeginSynthesis: () => void;
  canBegin: boolean;
  isRunning: boolean;
}

export default function StudioParameters({
  productId,
  onProductChange,
  selectedOutputs,
  onOutputsChange,
  templateOverride,
  onTemplateChange,
  autoRun,
  onAutoRunChange,
  hookText,
  onHookTextChange,
  onBeginSynthesis,
  canBegin,
  isRunning,
}: StudioParametersProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    api
      .listProducts()
      .then((p) => {
        setProducts(p);
        if (!productId && p.length > 0) onProductChange(p[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const toggleOutput = (id: string) => {
    if (selectedOutputs.includes(id)) {
      onOutputsChange(selectedOutputs.filter((o) => o !== id));
    } else {
      onOutputsChange([...selectedOutputs, id]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Product Selector */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
      >
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-3">
          Product
        </label>
        {loadingProducts ? (
          <div className="h-10 rounded-xl bg-[#353437]/30 animate-pulse" />
        ) : (
          <select
            value={productId}
            onChange={(e) => onProductChange(e.target.value)}
            className="w-full bg-[#131315]/60 border border-[#353437] rounded-xl px-4 py-2.5 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%23E5E1E4' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </motion.div>

      {/* Studio Parameters Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-4">
          Output Types
        </h3>

        {/* Output Type Multi-Select */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {OUTPUT_TYPES.map((t) => {
            const active = selectedOutputs.includes(t.id);
            return (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleOutput(t.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl transition-all text-left ${
                  active
                    ? "border-2 border-[#FF9500] bg-[#FF9500]/10 shadow-[0_0_16px_rgba(255,149,0,0.08)]"
                    : "border border-[#353437] bg-[#1b1b1d]/50 hover:border-[#554334]"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl ${
                    active ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                  }`}
                >
                  {t.icon}
                </span>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-[#FF9500]" : "text-[#E5E1E4]/60"
                  }`}
                >
                  {t.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Template Override */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-2.5">
            Template Style
          </label>
          <div className="space-y-1.5">
            {/* Auto option */}
            <button
              onClick={() => onTemplateChange(null)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-xs ${
                !templateOverride
                  ? "bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500]"
                  : "border border-transparent hover:bg-[#1b1b1d] text-[#E5E1E4]/50"
              }`}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Auto-detect from content
            </button>
            {TEMPLATE_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTemplateChange(t.id)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                  templateOverride === t.id
                    ? "bg-[#FF9500]/10 border border-[#FF9500]/30"
                    : "border border-transparent hover:bg-[#1b1b1d]"
                }`}
              >
                <span
                  className={`text-xs font-bold w-5 text-center ${
                    templateOverride === t.id ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                  }`}
                >
                  {t.id}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-medium ${
                      templateOverride === t.id ? "text-[#FF9500]" : "text-[#E5E1E4]/60"
                    }`}
                  >
                    {t.label}
                  </p>
                  <p className="text-[10px] text-[#E5E1E4]/30 truncate">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Contextual Hook */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50 mb-2">
            Contextual Hook
          </label>
          <textarea
            value={hookText}
            onChange={(e) => onHookTextChange(e.target.value)}
            placeholder="Add a framing hook or key angle for the output..."
            rows={2}
            className="w-full bg-[#131315]/60 border border-[#353437] rounded-xl px-3 py-2.5 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 resize-none transition-all"
          />
        </div>

        {/* Toggle: Auto-run pipeline */}
        <div className="flex items-center justify-between py-1 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-[#E5E1E4]/40">
              fast_forward
            </span>
            <div>
              <span className="text-sm text-[#E5E1E4]/70">Auto-run pipeline</span>
              <p className="text-[10px] text-[#E5E1E4]/30">Skip manual approval between steps</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onAutoRunChange(!autoRun)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              autoRun ? "bg-[#FF9500]" : "bg-[#353437]"
            }`}
          >
            <motion.span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
              animate={{ x: autoRun ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
      </motion.div>

      {/* Begin Synthesis CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.button
          whileHover={canBegin && !isRunning ? { scale: 1.03 } : {}}
          whileTap={canBegin && !isRunning ? { scale: 0.97 } : {}}
          onClick={onBeginSynthesis}
          disabled={!canBegin || isRunning}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
            canBegin && !isRunning
              ? "liquid-gradient text-[#2d1600] hover:shadow-[0_4px_24px_rgba(255,149,0,0.35)]"
              : "bg-[#353437] text-[#E5E1E4]/30 cursor-not-allowed"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {isRunning ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Pipeline Running...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">bolt</span>
                Begin Synthesis
              </>
            )}
          </span>
        </motion.button>

        {!canBegin && !isRunning && (
          <p className="text-[10px] text-[#E5E1E4]/25 text-center mt-2">
            Add some text and select at least one output type to begin
          </p>
        )}
      </motion.div>
    </div>
  );
}
