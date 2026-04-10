"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/* ── Step definitions ── */
const STEPS = [
  {
    id: "product",
    number: "01",
    title: "Add Your Product or Brand",
    description:
      "Add a product, SaaS tool, or personal brand. Include your website URL so we can auto-extract your voice, messaging, and key details.",
    details: [
      "Give it a name, description, and website URL",
      "Click 'Start Crawl' to auto-extract brand voice and messaging",
      "Review the generated Brand Brief and tweak as needed",
      "Set up your Brand Profile with tone, colors, and content rules",
    ],
    cta: { label: "Create Product", href: "/products/new" },
    icon: "inventory_2",
    checkKey: "hasProducts",
  },
  {
    id: "generate",
    number: "02",
    title: "Generate Content",
    description:
      "Drop a raw idea, topic, or voice memo into the Studio. Get back social posts, ad copy, email drafts, and video scripts — all matching your brand voice.",
    details: [
      "Open the Studio and describe your idea or paste raw text",
      "Select your voice profile and content types",
      "Review generated pieces in the Content library",
      "Approve, edit, or regenerate until you're happy",
    ],
    cta: { label: "Open Studio", href: "/studio" },
    icon: "auto_awesome",
    checkKey: "hasContent",
  },
  {
    id: "ads",
    number: "03",
    title: "Create Ad Campaigns",
    description:
      "Generate dozens of ad variations from your pain points. The optimizer learns which angles work and auto-generates more winners.",
    details: [
      "Go to Campaigns and select your product",
      "Choose pain points or import from CSV",
      "Generate 10-50 ad variations in one batch",
      "Export as images or push to your ad platform",
    ],
    cta: { label: "Create Ads", href: "/campaigns" },
    icon: "layers",
    checkKey: "hasAds",
  },
];

/* ── Main component ── */
export function GettingStarted({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Load completed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ad-hub-onboarding");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedSteps(new Set(parsed.completed || []));
        // Jump to first incomplete step
        const firstIncomplete = STEPS.findIndex(
          (s) => !parsed.completed?.includes(s.id)
        );
        if (firstIncomplete >= 0) setCurrentStep(firstIncomplete);
      }
    } catch {
      // ignore
    }
  }, [open]);

  const markComplete = useCallback(
    (stepId: string) => {
      const next = new Set(completedSteps);
      next.add(stepId);
      setCompletedSteps(next);
      localStorage.setItem(
        "ad-hub-onboarding",
        JSON.stringify({ completed: Array.from(next) })
      );
      // Advance to next step
      const idx = STEPS.findIndex((s) => s.id === stepId);
      if (idx < STEPS.length - 1) setCurrentStep(idx + 1);
    },
    [completedSteps]
  );

  const resetProgress = useCallback(() => {
    setCompletedSteps(new Set());
    setCurrentStep(0);
    localStorage.removeItem("ad-hub-onboarding");
  }, []);

  const progress = (completedSteps.size / STEPS.length) * 100;
  const step = STEPS[currentStep];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-[61] flex flex-col glass-prism border-l border-white/5 bg-[#131315]/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#FF9500] text-[10px] uppercase tracking-[0.2em] font-bold mb-1">
                    Getting Started
                  </p>
                  <h2 className="text-xl font-black tracking-tight text-[#E5E1E4]">
                    Set Up Your Content Engine
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[#E5E1E4]/40 hover:text-[#E5E1E4] hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-[#353437]/60 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF9500] to-[#ffbd7f]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="text-[10px] font-bold text-[#E5E1E4]/40 whitespace-nowrap">
                  {completedSteps.size}/{STEPS.length}
                </span>
              </div>
            </div>

            {/* Step Navigation (vertical) */}
            <div className="flex flex-1 overflow-hidden">
              {/* Step list */}
              <div className="w-16 border-r border-white/5 py-4 flex flex-col items-center gap-1">
                {STEPS.map((s, i) => {
                  const done = completedSteps.has(s.id);
                  const active = i === currentStep;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(i)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        done
                          ? "bg-[#FF9500]/15 text-[#FF9500] border border-[#FF9500]/30"
                          : active
                          ? "bg-[#353437]/60 text-[#E5E1E4] border border-[#554334]"
                          : "text-[#E5E1E4]/30 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      {done ? (
                        <span className="material-symbols-outlined text-base">
                          check
                        </span>
                      ) : (
                        s.number
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="p-6 space-y-5"
                  >
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#FF9500] text-xl">
                          {step.icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/30">
                          Step {step.number}
                        </p>
                        <h3 className="text-lg font-bold text-[#E5E1E4] tracking-tight">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#E5E1E4]/60 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Details list */}
                    <div className="space-y-2.5">
                      {step.details.map((detail, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.06 }}
                          className="flex items-start gap-3"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#FF9500]/60 shrink-0" />
                          <span className="text-sm text-[#E5E1E4]/50 leading-relaxed">
                            {detail}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Status */}
                    {completedSteps.has(step.id) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/20"
                      >
                        <span className="material-symbols-outlined text-[#FF9500] text-base">
                          check_circle
                        </span>
                        <span className="text-sm font-medium text-[#FF9500]">
                          Completed
                        </span>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <Link
                        href={step.cta.href}
                        onClick={onClose}
                        className="flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-bold bg-[#FF9500] text-[#2d1600] hover:brightness-110 transition"
                      >
                        {step.cta.label}
                      </Link>
                      {!completedSteps.has(step.id) && (
                        <button
                          onClick={() => markComplete(step.id)}
                          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[#554334] text-[#E5E1E4]/60 hover:border-[#FF9500]/40 hover:text-[#E5E1E4] transition-colors"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t border-white/5">
                      <button
                        onClick={() =>
                          setCurrentStep(Math.max(0, currentStep - 1))
                        }
                        disabled={currentStep === 0}
                        className="text-xs font-medium text-[#E5E1E4]/40 hover:text-[#E5E1E4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        &larr; Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentStep(
                            Math.min(STEPS.length - 1, currentStep + 1)
                          )
                        }
                        disabled={currentStep === STEPS.length - 1}
                        className="text-xs font-medium text-[#E5E1E4]/40 hover:text-[#E5E1E4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={resetProgress}
                className="text-[10px] uppercase tracking-wider font-medium text-[#E5E1E4]/30 hover:text-[#E5E1E4]/60 transition-colors"
              >
                Reset Progress
              </button>
              <button
                onClick={onClose}
                className="text-[10px] uppercase tracking-wider font-medium text-[#E5E1E4]/30 hover:text-[#E5E1E4]/60 transition-colors"
              >
                Close Guide
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Inline banner for dashboard ── */
export function GettingStartedBanner({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("ad-hub-onboarding");
    if (!saved) {
      setDismissed(false);
    } else {
      try {
        const parsed = JSON.parse(saved);
        // Show banner if not all steps are completed
        setDismissed((parsed.completed?.length ?? 0) >= STEPS.length);
      } catch {
        setDismissed(false);
      }
    }
  }, []);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-prism rounded-2xl border border-[#FF9500]/20 bg-[#FF9500]/5 p-5 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-[#FF9500]/15 border border-[#FF9500]/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[#FF9500]">
          rocket_launch
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#E5E1E4] mb-0.5">
          New here? Follow the setup guide
        </p>
        <p className="text-xs text-[#E5E1E4]/40">
          3 steps to set up your brand and start generating content.
        </p>
      </div>
      <button
        onClick={onOpen}
        className="px-4 py-2 rounded-xl text-sm font-bold bg-[#FF9500] text-[#2d1600] hover:brightness-110 transition whitespace-nowrap shrink-0"
      >
        Get Started
      </button>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(
            "ad-hub-onboarding",
            JSON.stringify({ completed: STEPS.map((s) => s.id), dismissed: true })
          );
        }}
        className="p-1 text-[#E5E1E4]/30 hover:text-[#E5E1E4]/60 transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </motion.div>
  );
}
