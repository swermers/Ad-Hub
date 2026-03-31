"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  api,
  type PipelineSharpenResult,
  type PipelineDraftResult,
  type PipelineExpandedPiece,
  type PipelineFinalizeResult,
} from "@/lib/api";
import type { VideoStyle } from "@/components/ad-templates/remotion/VideoPreview";

const DynamicVideoPreview = dynamic(
  () => import("@/components/ad-templates/remotion/VideoPreview").then((m) => m.VideoPreview),
  { ssr: false, loading: () => <div className="h-48 rounded-xl bg-[#131315]/60 animate-pulse" /> },
);

/* ── Pipeline step definitions ─────────────────────────────────────────────── */

const FULL_STEPS = [
  { id: "sharpen", label: "Idea Sharpener", icon: "diamond", desc: "Finding the core observation" },
  { id: "draft", label: "Newsletter Draft", icon: "edit_note", desc: "Writing the primary piece" },
  { id: "expand", label: "Multi-format", icon: "hub", desc: "Expanding to all platforms" },
  { id: "finalize", label: "Finalize", icon: "check_circle", desc: "Saving to your content library" },
] as const;

const QUICK_STEPS = [
  { id: "sharpen", label: "Idea Sharpener", icon: "diamond", desc: "Finding the core observation" },
  { id: "expand", label: "Multi-format", icon: "hub", desc: "Generating platform content" },
  { id: "finalize", label: "Finalize", icon: "check_circle", desc: "Saving to your content library" },
] as const;

type StepId = "sharpen" | "draft" | "expand" | "finalize";
type StepStatus = "pending" | "running" | "done" | "error";

interface PipelineViewProps {
  productId: string;
  rawText: string;
  voiceProfileId: string | null;
  templateOverride: string | null;
  hookText: string;
  selectedOutputs: string[];
  autoRun: boolean;
  onComplete: (result: PipelineFinalizeResult) => void;
  onReset: () => void;
}

export default function PipelineView({
  productId,
  rawText,
  voiceProfileId,
  templateOverride,
  hookText,
  selectedOutputs,
  autoRun,
  onComplete,
  onReset,
}: PipelineViewProps) {
  // Quick mode = newsletter not in selectedOutputs
  const quickMode = !selectedOutputs.includes("newsletter");
  const STEPS = quickMode ? QUICK_STEPS : FULL_STEPS;

  const [stepStatuses, setStepStatuses] = useState<Record<StepId, StepStatus>>({
    sharpen: "running",
    draft: quickMode ? "done" : "pending",  // skip draft in quick mode
    expand: "pending",
    finalize: "pending",
  });
  const [currentStep, setCurrentStep] = useState<StepId>("sharpen");

  // Step outputs
  const [sharpenResult, setSharpenResult] = useState<PipelineSharpenResult | null>(null);
  const [draftResult, setDraftResult] = useState<PipelineDraftResult | null>(null);
  const [expandResult, setExpandResult] = useState<PipelineExpandedPiece[] | null>(null);
  const [finalizeResult, setFinalizeResult] = useState<PipelineFinalizeResult | null>(null);

  // Editing state
  const [editingStep, setEditingStep] = useState<StepId | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Prevent double-runs
  const ranRef = useRef(false);

  // Auto-kick off step 1
  useEffect(() => {
    if (!ranRef.current) {
      ranRef.current = true;
      runSharpen();
    }
  }, []);

  /* ── Step runners ───────────────────────────────────────────────────────── */

  const setStatus = (step: StepId, status: StepStatus) => {
    setStepStatuses((prev) => ({ ...prev, [step]: status }));
  };

  const runSharpen = async () => {
    setError(null);
    setStatus("sharpen", "running");
    setCurrentStep("sharpen");

    try {
      const input = hookText ? `${rawText}\n\nContextual angle: ${hookText}` : rawText;
      const result = await api.pipelineSharpen({
        product_id: productId,
        raw_text: input,
        voice_profile_id: voiceProfileId || undefined,
      });
      setSharpenResult(result);
      setStatus("sharpen", "done");

      if (autoRun) {
        if (quickMode) {
          runQuickExpand(result);
        } else {
          runDraft(result);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sharpening failed");
      setStatus("sharpen", "error");
    }
  };

  const runDraft = async (seed?: PipelineSharpenResult) => {
    const seedData = seed || sharpenResult;
    if (!seedData) return;

    setError(null);
    setStatus("draft", "running");
    setCurrentStep("draft");

    try {
      const result = await api.pipelineDraft({
        product_id: productId,
        seed: seedData,
        voice_profile_id: voiceProfileId || undefined,
        template_override: templateOverride || undefined,
      });
      setDraftResult(result);
      setStatus("draft", "done");

      if (autoRun) {
        runExpand(seedData, result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drafting failed");
      setStatus("draft", "error");
    }
  };

  const runQuickExpand = async (seed?: PipelineSharpenResult) => {
    const seedData = seed || sharpenResult;
    if (!seedData) return;

    setError(null);
    setStatus("expand", "running");
    setCurrentStep("expand");

    const platforms = selectedOutputs.includes("social")
      ? ["twitter", "linkedin", "meta"]
      : ["twitter", "linkedin"];

    const contentTypes = ["social_post"];

    try {
      const result = await api.pipelineQuickExpand({
        product_id: productId,
        seed: seedData,
        voice_profile_id: voiceProfileId || undefined,
        platforms,
        content_types: contentTypes,
        include_video_script: selectedOutputs.includes("video_script"),
        include_thread: selectedOutputs.includes("x_thread"),
        include_video_ad: selectedOutputs.includes("video_ad"),
        include_carousel: selectedOutputs.includes("carousel"),
      });
      setExpandResult(result.pieces);
      setStatus("expand", "done");

      if (autoRun) {
        runFinalize(seedData, undefined, result.pieces);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expansion failed");
      setStatus("expand", "error");
    }
  };

  const runExpand = async (seed?: PipelineSharpenResult, draft?: PipelineDraftResult) => {
    const seedData = seed || sharpenResult;
    const draftData = draft || draftResult;
    if (!seedData || !draftData) return;

    setError(null);
    setStatus("expand", "running");
    setCurrentStep("expand");

    const platforms = selectedOutputs.includes("social")
      ? ["twitter", "linkedin", "meta"]
      : [];

    try {
      const result = await api.pipelineExpand({
        product_id: productId,
        seed: seedData,
        draft: draftData,
        voice_profile_id: voiceProfileId || undefined,
        platforms: platforms.length > 0 ? platforms : ["twitter", "linkedin"],
        include_video_script: selectedOutputs.includes("video_script"),
        include_thread: selectedOutputs.includes("x_thread"),
        include_video_ad: selectedOutputs.includes("video_ad"),
        include_carousel: selectedOutputs.includes("carousel"),
      });
      setExpandResult(result.pieces);
      setStatus("expand", "done");

      if (autoRun) {
        runFinalize(seedData, draftData, result.pieces);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expansion failed");
      setStatus("expand", "error");
    }
  };

  const runFinalize = async (
    seed?: PipelineSharpenResult,
    draft?: PipelineDraftResult,
    pieces?: PipelineExpandedPiece[],
  ) => {
    const seedData = seed || sharpenResult;
    const draftData = draft || draftResult;
    const piecesData = pieces || expandResult;
    if (!seedData || !piecesData) return;

    setError(null);
    setStatus("finalize", "running");
    setCurrentStep("finalize");

    // In full mode, combine newsletter draft + expanded pieces
    // In quick mode, just use expanded pieces directly
    const allPieces: PipelineExpandedPiece[] = [];
    if (draftData) {
      allPieces.push({
        content_type: "newsletter",
        platform: "general",
        title: draftData.title,
        body: draftData.body,
        hook: draftData.subject_line,
        cta: null,
        funnel_stage: "awareness",
        metadata: { template_used: draftData.template_used, preview_text: draftData.preview_text },
      });
    }
    allPieces.push(...piecesData);

    try {
      const result = await api.pipelineFinalize({
        product_id: productId,
        seed: seedData,
        pieces: allPieces,
        save_seed: true,
      });
      setFinalizeResult(result);
      setStatus("finalize", "done");
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalization failed");
      setStatus("finalize", "error");
    }
  };

  /* ── Approve / Regenerate handlers ──────────────────────────────────────── */

  const handleApprove = (step: StepId) => {
    if (step === "sharpen") {
      if (quickMode) runQuickExpand();
      else runDraft();
    } else if (step === "draft") runExpand();
    else if (step === "expand") runFinalize();
  };

  const handleRegenerate = (step: StepId) => {
    if (step === "sharpen") runSharpen();
    else if (step === "draft") runDraft();
    else if (step === "expand") {
      if (quickMode) runQuickExpand();
      else runExpand();
    }
  };

  /* ── Edit helpers ───────────────────────────────────────────────────────── */

  const startEdit = (step: StepId) => {
    if (step === "sharpen" && sharpenResult) {
      setEditBuffer(sharpenResult.seed);
    } else if (step === "draft" && draftResult) {
      setEditBuffer(draftResult.body);
    }
    setEditingStep(step);
  };

  const saveEdit = () => {
    if (editingStep === "sharpen" && sharpenResult) {
      setSharpenResult({ ...sharpenResult, seed: editBuffer });
    } else if (editingStep === "draft" && draftResult) {
      setDraftResult({ ...draftResult, body: editBuffer });
    }
    setEditingStep(null);
    setEditBuffer("");
  };

  /* ── Progress calculation ───────────────────────────────────────────────── */

  const activeStepIds = STEPS.map((s) => s.id as StepId);
  const doneCount = activeStepIds.filter((id) => stepStatuses[id] === "done").length;
  const progressPct = Math.round((doneCount / STEPS.length) * 100);
  const activeStep = STEPS.find((s) => stepStatuses[s.id as StepId] === "running");

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Progress Header */}
      <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            {quickMode ? "Quick Pipeline" : "Content Pipeline"}
          </span>
          <span className="text-sm font-bold text-[#FF9500]">
            {progressPct}%{" "}
            <span className="text-[#E5E1E4]/40 font-normal text-xs">
              {finalizeResult ? "Complete" : activeStep?.desc || "Waiting"}
            </span>
          </span>
        </div>

        {/* Step progress bar */}
        <div className="relative flex items-center">
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-[#353437]" />
          <motion.div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "linear-gradient(90deg, #FF9500, #ffbd7f)" }}
          />
          <div className="relative flex justify-between w-full">
            {STEPS.map((step) => {
              const status = stepStatuses[step.id as StepId];
              return (
                <div key={step.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-4 h-4 rounded-full border-2 z-10 transition-all flex items-center justify-center ${
                      status === "done"
                        ? "bg-[#FF9500] border-[#FF9500]"
                        : status === "running"
                        ? "bg-[#131315] border-[#FF9500] shadow-[0_0_8px_rgba(255,149,0,0.5)]"
                        : status === "error"
                        ? "bg-[#131315] border-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.3)]"
                        : "bg-[#131315] border-[#353437]"
                    }`}
                  >
                    {status === "done" && (
                      <span className="material-symbols-outlined text-[10px] text-[#2d1600]">
                        check
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      status === "done"
                        ? "text-[#FF9500]"
                        : status === "running"
                        ? "text-[#E5E1E4]/70"
                        : "text-[#E5E1E4]/30"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-start gap-3"
          >
            <span className="material-symbols-outlined text-[#ffb4ab] text-lg mt-0.5">error</span>
            <div className="flex-1">
              <p className="text-sm text-[#ffb4ab]">{error}</p>
              <button
                onClick={() => handleRegenerate(currentStep)}
                className="text-xs text-[#FF9500] mt-1 hover:underline"
              >
                Retry this step
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Cards */}
      <div className="space-y-4">
        {/* Step 1: Sharpen */}
        <AnimatePresence>
          {stepStatuses.sharpen !== "pending" && (
            <StepCard
              step={STEPS[0]}
              status={stepStatuses.sharpen}
              isEditing={editingStep === "sharpen"}
              onApprove={() => handleApprove("sharpen")}
              onRegenerate={() => handleRegenerate("sharpen")}
              onEdit={() => startEdit("sharpen")}
              showActions={stepStatuses.sharpen === "done" && stepStatuses.draft === "pending"}
            >
              {stepStatuses.sharpen === "running" && <StepLoading />}
              {stepStatuses.sharpen === "done" && sharpenResult && (
                editingStep === "sharpen" ? (
                  <EditView
                    value={editBuffer}
                    onChange={setEditBuffer}
                    onSave={saveEdit}
                    onCancel={() => setEditingStep(null)}
                  />
                ) : (
                  <SharpenOutput data={sharpenResult} />
                )
              )}
            </StepCard>
          )}
        </AnimatePresence>

        {/* Step 2: Draft (skipped in quick mode) */}
        {!quickMode && (
          <AnimatePresence>
            {stepStatuses.draft !== "pending" && (
              <StepCard
                step={FULL_STEPS[1]}
                status={stepStatuses.draft}
                isEditing={editingStep === "draft"}
                onApprove={() => handleApprove("draft")}
                onRegenerate={() => handleRegenerate("draft")}
                onEdit={() => startEdit("draft")}
                showActions={stepStatuses.draft === "done" && stepStatuses.expand === "pending"}
              >
                {stepStatuses.draft === "running" && <StepLoading />}
                {stepStatuses.draft === "done" && draftResult && (
                  editingStep === "draft" ? (
                    <EditView
                      value={editBuffer}
                      onChange={setEditBuffer}
                      onSave={saveEdit}
                      onCancel={() => setEditingStep(null)}
                    />
                  ) : (
                    <DraftOutput data={draftResult} />
                  )
                )}
              </StepCard>
            )}
          </AnimatePresence>
        )}

        {/* Step 3: Expand */}
        <AnimatePresence>
          {stepStatuses.expand !== "pending" && (
            <StepCard
              step={quickMode ? QUICK_STEPS[1] : FULL_STEPS[2]}
              status={stepStatuses.expand}
              isEditing={false}
              onApprove={() => handleApprove("expand")}
              onRegenerate={() => handleRegenerate("expand")}
              onEdit={() => {}}
              showActions={stepStatuses.expand === "done" && stepStatuses.finalize === "pending"}
            >
              {stepStatuses.expand === "running" && <StepLoading />}
              {stepStatuses.expand === "done" && expandResult && (
                <ExpandOutput pieces={expandResult} />
              )}
            </StepCard>
          )}
        </AnimatePresence>

        {/* Step 4: Finalize */}
        <AnimatePresence>
          {stepStatuses.finalize !== "pending" && (
            <StepCard
              step={quickMode ? QUICK_STEPS[2] : FULL_STEPS[3]}
              status={stepStatuses.finalize}
              isEditing={false}
              onApprove={() => {}}
              onRegenerate={() => {}}
              onEdit={() => {}}
              showActions={false}
            >
              {stepStatuses.finalize === "running" && <StepLoading />}
              {stepStatuses.finalize === "done" && finalizeResult && (
                <FinalizeOutput data={finalizeResult} />
              )}
            </StepCard>
          )}
        </AnimatePresence>
      </div>

      {/* Reset / New pipeline */}
      {finalizeResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            className="flex-1 liquid-gradient py-3 rounded-xl text-sm font-bold text-[#2d1600]"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">add</span>
              New Pipeline
            </span>
          </motion.button>
          <a
            href="/content"
            className="flex-1 py-3 rounded-xl border border-[#554334] text-sm font-medium text-[#E5E1E4]/70 hover:border-[#FF9500]/50 hover:text-[#E5E1E4] transition-colors text-center"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">library_books</span>
              View Content
            </span>
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StepCard({
  step,
  status,
  isEditing,
  onApprove,
  onRegenerate,
  onEdit,
  showActions,
  children,
}: {
  step: { id: string; label: string; icon: string; desc: string };
  status: StepStatus;
  isEditing: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  showActions: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-prism rounded-2xl border backdrop-blur-xl overflow-hidden transition-all ${
        status === "running"
          ? "border-[#FF9500]/40 shadow-[0_0_20px_rgba(255,149,0,0.06)]"
          : status === "error"
          ? "border-[#ffb4ab]/30"
          : "border-[#554334]/30"
      } bg-[#1b1b1d]/60`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#353437]/30">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            status === "done"
              ? "bg-[#4ade80]/10"
              : status === "running"
              ? "bg-[#FF9500]/10"
              : status === "error"
              ? "bg-[#ffb4ab]/10"
              : "bg-[#353437]/30"
          }`}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              status === "done"
                ? "text-[#4ade80]"
                : status === "running"
                ? "text-[#FF9500]"
                : status === "error"
                ? "text-[#ffb4ab]"
                : "text-[#E5E1E4]/30"
            }`}
          >
            {status === "done" ? "check_circle" : status === "error" ? "error" : step.icon}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#E5E1E4]">{step.label}</p>
          <p className="text-[10px] text-[#E5E1E4]/30">
            {status === "running"
              ? step.desc
              : status === "done"
              ? "Complete"
              : status === "error"
              ? "Failed"
              : "Waiting"}
          </p>
        </div>
        {status === "running" && (
          <span className="material-symbols-outlined text-[#FF9500] text-lg animate-spin">
            progress_activity
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">{children}</div>

      {/* Actions */}
      {showActions && !isEditing && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-[#353437]/30">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onApprove}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20 text-xs font-medium text-[#4ade80] hover:bg-[#4ade80]/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Approve &amp; Continue
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#554334] text-xs font-medium text-[#E5E1E4]/60 hover:border-[#FF9500]/40 hover:text-[#FF9500] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#554334] text-xs font-medium text-[#E5E1E4]/60 hover:border-[#ffbd7f]/40 hover:text-[#ffbd7f] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Regenerate
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

function StepLoading() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[#FF9500]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </div>
      <span className="text-xs text-[#E5E1E4]/40">Processing...</span>
    </div>
  );
}

function EditView({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full bg-[#131315]/60 border border-[#FF9500]/30 rounded-xl px-4 py-3 text-sm text-[#E5E1E4] focus:outline-none focus:ring-1 focus:ring-[#FF9500]/30 resize-y transition-all"
      />
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSave}
          className="px-4 py-2 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30 text-xs font-medium text-[#FF9500]"
        >
          Save Changes
        </motion.button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[#353437] text-xs text-[#E5E1E4]/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Output renderers ────────────────────────────────────────────────────── */

function SharpenOutput({ data }: { data: PipelineSharpenResult }) {
  return (
    <div className="space-y-3">
      {/* Seed */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#FF9500] font-semibold mb-1">
          Core Seed
        </p>
        <p className="text-sm text-[#E5E1E4] leading-relaxed">{data.seed}</p>
      </div>

      {/* Heat lines */}
      {data.heat.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 font-semibold mb-1">
            Heat (strongest lines)
          </p>
          {data.heat.map((h, i) => (
            <p key={i} className="text-xs text-[#ffbd7f] italic leading-relaxed">
              &ldquo;{h}&rdquo;
            </p>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="px-2 py-0.5 rounded-md bg-[#FF9500]/10 text-[10px] font-medium text-[#FF9500]">
          Template {data.template_fit}
        </span>
        {data.metaphor && (
          <span className="px-2 py-0.5 rounded-md bg-[#a4a7ff]/10 text-[10px] font-medium text-[#a4a7ff]">
            {data.metaphor}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-[#353437] text-[10px] text-[#E5E1E4]/50">
          {data.verdict}
        </span>
      </div>

      {/* Theme & hook */}
      {data.weekly_theme && (
        <p className="text-[11px] text-[#E5E1E4]/40">
          <span className="font-medium text-[#E5E1E4]/50">Theme:</span> {data.weekly_theme}
        </p>
      )}
      {data.audience_hook && (
        <p className="text-[11px] text-[#E5E1E4]/40">
          <span className="font-medium text-[#E5E1E4]/50">Audience:</span> {data.audience_hook}
        </p>
      )}
    </div>
  );
}

function DraftOutput({ data }: { data: PipelineDraftResult }) {
  const [expanded, setExpanded] = useState(false);
  const previewLength = 400;
  const isLong = data.body.length > previewLength;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-[#E5E1E4]">{data.title}</h4>
        <span className="px-2 py-0.5 rounded-md bg-[#FF9500]/10 text-[9px] font-medium text-[#FF9500]">
          Template {data.template_used}
        </span>
      </div>

      {data.subject_line && (
        <p className="text-[11px] text-[#E5E1E4]/50">
          <span className="font-medium">Subject:</span> {data.subject_line}
        </p>
      )}

      <div className="text-sm text-[#E5E1E4]/80 leading-relaxed whitespace-pre-wrap">
        {expanded || !isLong ? data.body : `${data.body.slice(0, previewLength)}...`}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#FF9500] hover:underline"
        >
          {expanded ? "Show less" : "Read full draft"}
        </button>
      )}
    </div>
  );
}

function ExpandOutput({ pieces }: { pieces: PipelineExpandedPiece[] }) {
  const platformIcons: Record<string, string> = {
    twitter: "tag",
    linkedin: "work",
    meta: "group",
    general: "public",
  };
  const typeIcons: Record<string, string> = {
    video_ad: "videocam",
    carousel: "view_carousel",
    video_script: "movie",
    social_post: "forum",
    x_thread: "tag",
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/40 font-semibold">
        {pieces.length} piece{pieces.length !== 1 ? "s" : ""} generated
      </p>
      {pieces.map((p, i) => {
        const isVideo = p.content_type === "video_ad" || p.content_type === "carousel";
        const videoStyle = (p.video_style || "default") as VideoStyle;
        const aspectRatio = p.video_config?.aspect_ratio || "1:1";

        return (
          <div
            key={i}
            className="p-3 rounded-xl border border-[#353437]/50 bg-[#131315]/40 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#FF9500]">
                {typeIcons[p.content_type] || platformIcons[p.platform] || "article"}
              </span>
              <span className="text-xs font-medium text-[#E5E1E4]/70">
                {p.content_type.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-[#E5E1E4]/30">{p.platform}</span>
              {isVideo && p.video_style && (
                <span className="px-1.5 py-0.5 rounded bg-[#a4a7ff]/10 text-[9px] font-medium text-[#a4a7ff]">
                  {p.video_style}
                </span>
              )}
              {p.title && (
                <span className="text-[10px] text-[#E5E1E4]/40 ml-auto truncate max-w-[120px]">
                  {p.title}
                </span>
              )}
            </div>

            {/* Video / Carousel preview */}
            {isVideo && (
              <div className="rounded-lg overflow-hidden border border-[#353437]/30">
                <DynamicVideoPreview
                  headline={p.hook || p.title || ""}
                  body={p.body}
                  cta={p.cta || "Learn More"}
                  videoStyle={videoStyle}
                  aspectRatio={aspectRatio as "1:1" | "4:5" | "9:16"}
                  accentColor={p.video_config?.accent_color}
                  previewWidth={320}
                  autoPlay
                  loop
                  slideHeadlines={p.content_type === "carousel" ? p.body : undefined}
                />
              </div>
            )}

            {/* Text content */}
            {!isVideo && (
              <>
                <p className="text-xs text-[#E5E1E4]/60 leading-relaxed line-clamp-3">{p.body}</p>
                {p.hook && (
                  <p className="text-[10px] text-[#ffbd7f] italic truncate">
                    Hook: &ldquo;{p.hook}&rdquo;
                  </p>
                )}
              </>
            )}

            {/* Show headline/cta for video below preview */}
            {isVideo && (
              <div className="flex items-center gap-2 text-[10px]">
                {p.hook && (
                  <span className="text-[#ffbd7f] italic truncate flex-1">
                    &ldquo;{p.hook}&rdquo;
                  </span>
                )}
                {p.cta && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500] font-medium">
                    {p.cta}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FinalizeOutput({ data }: { data: PipelineFinalizeResult }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-12 h-12 rounded-xl bg-[#4ade80]/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-[#4ade80] text-2xl">task_alt</span>
      </div>
      <div>
        <p className="text-sm font-medium text-[#E5E1E4]">
          {data.pieces_saved} piece{data.pieces_saved !== 1 ? "s" : ""} saved to your content
          library
        </p>
        <p className="text-xs text-[#E5E1E4]/40">
          {data.seed_id ? "Seed saved to Seed Bank" : ""}
        </p>
      </div>
    </div>
  );
}
