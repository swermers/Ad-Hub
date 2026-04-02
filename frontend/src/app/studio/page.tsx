"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PipelineFinalizeResult } from "@/lib/api";

import VoiceInput from "./components/VoiceInput";
import VoiceProfileSelector from "./components/VoiceProfileSelector";
import StudioParameters from "./components/StudioParameters";
import PipelineView from "./components/PipelineView";
import ContentOutput from "./components/ContentOutput";

/* ── Phases ── */
type Phase = "compose" | "pipeline" | "output";

/* ── Animation tokens ── */
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function StudioPage() {
  /* ── Shared state ── */
  const [phase, setPhase] = useState<Phase>("compose");

  // Voice / text input
  const [rawText, setRawText] = useState("");
  const [voiceProfileId, setVoiceProfileId] = useState<string | null>(null);

  // Parameters
  const [productId, setProductId] = useState("");
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(["social_post"]);
  const [templateOverride, setTemplateOverride] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(true);
  const [hookText, setHookText] = useState("");
  const [workflowType, setWorkflowType] = useState<string | null>(null);

  // Pipeline result
  const [finalResult, setFinalResult] = useState<PipelineFinalizeResult | null>(null);

  /* ── Derived ── */
  const canBegin = rawText.trim().length > 10 && (productId.length > 0 || !!voiceProfileId);
  const isRunning = phase === "pipeline";

  /* ── Handlers ── */
  const handleBeginSynthesis = useCallback(() => {
    if (!canBegin) return;
    setFinalResult(null);
    setPhase("pipeline");
  }, [canBegin]);

  const handlePipelineComplete = useCallback((result: PipelineFinalizeResult) => {
    setFinalResult(result);
    setPhase("output");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("compose");
    setFinalResult(null);
  }, []);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 md:px-8 py-8 pb-28"
    >
      {/* ── Header ── */}
      <motion.section {...fadeUp(0)} className="mb-10">
        <div className="flex items-start justify-between gap-8 flex-wrap">
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
              Drop a raw idea, voice memo, or concept. Get back newsletters,
              X threads, social posts, and video scripts &mdash; in your voice.
            </p>
            <p className="font-mono text-[11px] text-[#E5E1E4]/30 tracking-wider">
              SRV-STUDIO-04 &middot; PID LP-0042 &middot; LATENCY 42ms
            </p>
          </div>

          {/* Phase indicator pill */}
          <motion.div
            {...fadeUp(0.16)}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl px-6 py-4 min-w-[260px]"
          >
            <div className="flex items-center gap-4">
              {(["compose", "pipeline", "output"] as const).map((p, i) => {
                const labels = ["Compose", "Synthesize", "Review"];
                const icons = ["edit_note", "bolt", "task_alt"];
                const isActive = p === phase;
                const isDone =
                  (p === "compose" && phase !== "compose") ||
                  (p === "pipeline" && phase === "output");
                return (
                  <div key={p} className="flex items-center gap-3">
                    {i > 0 && (
                      <div
                        className={`w-8 h-px ${isDone || isActive ? "bg-[#FF9500]" : "bg-[#353437]"}`}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-[#FF9500]/15 ring-2 ring-[#FF9500]/40"
                            : isDone
                            ? "bg-[#4ade80]/10"
                            : "bg-[#353437]/40"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-lg ${
                            isActive
                              ? "text-[#FF9500]"
                              : isDone
                              ? "text-[#4ade80]"
                              : "text-[#E5E1E4]/30"
                          }`}
                        >
                          {isDone ? "check_circle" : icons[i]}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-medium ${
                          isActive ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                        }`}
                      >
                        {labels[i]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Phase: Compose ── */}
      <AnimatePresence mode="wait">
        {phase === "compose" && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-12 gap-6"
          >
            {/* Left: input area */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <motion.div {...fadeUp(0.24)}>
                <VoiceInput
                  value={rawText}
                  onChange={setRawText}
                  disabled={isRunning}
                />
              </motion.div>

              <motion.div {...fadeUp(0.32)}>
                <VoiceProfileSelector
                  selectedId={voiceProfileId}
                  onSelect={setVoiceProfileId}
                  disabled={isRunning}
                />
              </motion.div>
            </div>

            {/* Right: parameters */}
            <div className="col-span-12 lg:col-span-5">
              <motion.div {...fadeUp(0.4)}>
                <StudioParameters
                  productId={productId}
                  onProductChange={setProductId}
                  selectedOutputs={selectedOutputs}
                  onOutputsChange={setSelectedOutputs}
                  templateOverride={templateOverride}
                  onTemplateChange={setTemplateOverride}
                  autoRun={autoRun}
                  onAutoRunChange={setAutoRun}
                  hookText={hookText}
                  onHookTextChange={setHookText}
                  workflowType={workflowType}
                  onWorkflowTypeChange={setWorkflowType}
                  onBeginSynthesis={handleBeginSynthesis}
                  canBegin={canBegin}
                  isRunning={isRunning}
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── Phase: Pipeline ── */}
        {phase === "pipeline" && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto"
          >
            <PipelineView
              productId={productId || undefined}
              rawText={rawText}
              voiceProfileId={voiceProfileId}
              templateOverride={templateOverride}
              hookText={hookText}
              selectedOutputs={selectedOutputs}
              autoRun={autoRun}
              workflowType={workflowType}
              onComplete={handlePipelineComplete}
              onReset={handleReset}
            />
          </motion.div>
        )}

        {/* ── Phase: Output ── */}
        {phase === "output" && finalResult && (
          <motion.div
            key="output"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <ContentOutput result={finalResult} productId={productId} />

            {/* New session button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#554334] text-sm font-medium text-[#E5E1E4]/60 hover:border-[#FF9500]/50 hover:text-[#FF9500] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">replay</span>
                New Session
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating FAB ── */}
      <AnimatePresence>
        {phase === "compose" && canBegin && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleBeginSynthesis}
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full liquid-gradient shadow-[0_4px_24px_rgba(255,149,0,0.4)] flex items-center justify-center hover:shadow-[0_6px_32px_rgba(255,149,0,0.55)] transition-shadow z-50 group"
          >
            <span className="material-symbols-outlined text-[#2d1600] text-2xl group-hover:rotate-90 transition-transform duration-300">
              bolt
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
