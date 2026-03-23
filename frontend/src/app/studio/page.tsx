"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  type Product,
  type TranscriptTaskStatus,
  type ContentPiece,
  type PlatformConnection,
} from "@/lib/api";
import { PlatformPreview } from "@/components/PlatformPreview";
import { VideoPreview } from "@/components/ad-templates/remotion/VideoPreview";
import type { VideoStyle } from "@/components/ad-templates/remotion/VideoPreview";

const STEPS = ["Input", "Brief", "Generate", "Review"] as const;
type Step = (typeof STEPS)[number];

const DAY_COLORS: Record<string, string> = {
  Monday: "border-l-[#FF9500]",
  Tuesday: "border-l-[#c5c5ff]",
  Wednesday: "border-l-[#ffbd7f]",
  Thursday: "border-l-[#4ade80]",
  Friday: "border-l-[#ffb4ab]",
  Saturday: "border-l-[#a4a7ff]",
  Sunday: "border-l-[#E5E1E4]/40",
};

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  social_post: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]" },
  blog_draft: { bg: "bg-[#ffbd7f]/10", text: "text-[#ffbd7f]" },
  newsletter: { bg: "bg-[#ffbd7f]/10", text: "text-[#ffbd7f]" },
  video_script: { bg: "bg-[#ffb4ab]/10", text: "text-[#ffb4ab]" },
  x_thread: { bg: "bg-[#c5c5ff]/10", text: "text-[#c5c5ff]" },
  email: { bg: "bg-[#4ade80]/10", text: "text-[#4ade80]" },
  carousel: { bg: "bg-[#a4a7ff]/10", text: "text-[#a4a7ff]" },
  ad_copy: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]" },
};

interface BrollItem {
  id: number;
  src: { medium: string };
  alt: string;
  photographer: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  meta: "Meta / Instagram",
  general: "General",
};

export default function StudioPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("Input");
  const [animating, setAnimating] = useState(false);

  const animateToStep = (next: Step) => {
    if (next === step) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setTimeout(() => setAnimating(false), 30);
    }, 200);
  };

  // Input
  const [transcript, setTranscript] = useState("");
  const [instructions, setInstructions] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [audioFilename, setAudioFilename] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Brief (from Idea Sharpener)
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);

  // Generation
  const [taskStatus, setTaskStatus] = useState<TranscriptTaskStatus | null>(null);
  const [generating, setGenerating] = useState(false);

  // Review
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  // Review view mode
  const [reviewView, setReviewView] = useState<"grid" | "list">("grid");
  const [cardTab, setCardTab] = useState<Record<string, "content" | "preview" | "video">>({});

  // B-roll suggestions
  const [brollResults, setBrollResults] = useState<BrollItem[]>([]);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollQuery, setBrollQuery] = useState("");

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Publish
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [publishingPieceId, setPublishingPieceId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<Record<string, "publishing" | "published" | "failed">>({});

  // Load connections when entering Review step
  useEffect(() => {
    if (step === "Review" && productId) {
      api
        .listConnections(productId)
        .then(setConnections)
        .catch(console.error);
    }
  }, [step, productId]);

  useEffect(() => {
    api
      .listProducts()
      .then((p) => {
        setProducts(p);
        if (p.length > 0) setProductId(p[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Audio Upload ─────────────────────────────────────────────────────────

  const handleAudioFile = async (file: File) => {
    const allowedExtensions = ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "flac"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      alert(`Unsupported format: .${ext}. Use mp3, m4a, wav, webm, ogg, or flac.`);
      return;
    }

    setTranscribing(true);
    setAudioFilename(file.name);
    try {
      const result = await api.transcribeAudio(file);
      setTranscript(result.transcript);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAudioFile(file);
  };

  // ── Generate ────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!productId || !transcript.trim()) return;
    setGenerating(true);
    animateToStep("Generate");

    try {
      const result = await api.contentFromTranscript({
        transcript,
        product_id: productId,
        instructions: instructions || undefined,
      });
      setTaskStatus(result);

      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const s = await api.getTranscriptStatus(result.task_id);
          setTaskStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            clearInterval(interval);
            setGenerating(false);
            if (s.status === "completed") {
              if (s.content_brief) {
                setBrief(s.content_brief as Record<string, unknown>);
              }
              // Load generated pieces
              const content = await api.listContent({ product_id: productId });
              // Get most recent pieces (from this generation)
              const recent = content
                .filter((c) => {
                  try {
                    const meta = JSON.parse(c.generation_metadata || "{}");
                    return meta.source === "voice_memo_pipeline";
                  } catch {
                    return false;
                  }
                })
                .slice(0, 7);
              setPieces(recent);
              animateToStep("Review");

              // Auto-fetch b-roll suggestions
              const briefData = s.content_brief as Record<string, unknown> | null;
              const query = String(briefData?.weekly_theme || briefData?.seed || "business marketing");
              setBrollQuery(query);
              setBrollLoading(true);
              api.searchBroll(query, "photos", 8, "landscape")
                .then((res) => {
                  setBrollResults(
                    (res.results as BrollItem[]) || []
                  );
                })
                .catch(console.error)
                .finally(() => setBrollLoading(false));
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
      animateToStep("Input");
    }
  };

  // ── Approve / Reject pieces ─────────────────────────────────────────────

  const handleStatusChange = async (pieceId: string, status: string) => {
    try {
      await api.updateContentStatus(pieceId, status);
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, status } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ── Publish ────────────────────────────────────────────────────────────

  const handlePublish = async (pieceId: string, connectionId: string) => {
    setPublishStatus((prev) => ({ ...prev, [pieceId]: "publishing" }));
    setPublishingPieceId(null);
    try {
      // Create a scheduled post for "now" and immediately publish
      const scheduled = await api.createScheduledPost({
        content_id: pieceId,
        connection_id: connectionId,
        scheduled_at: new Date().toISOString(),
      });
      await api.postNow(scheduled.id);
      setPublishStatus((prev) => ({ ...prev, [pieceId]: "published" }));
      // Update piece status to posted
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, status: "posted" } : p))
      );
    } catch (err) {
      console.error(err);
      setPublishStatus((prev) => ({ ...prev, [pieceId]: "failed" }));
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getPieceMeta = (piece: ContentPiece) => {
    try {
      return JSON.parse(piece.generation_metadata || "{}");
    } catch {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-white/10 rounded" />
            <div className="h-3 w-56 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-white/10 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-white/10 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#ffbd7f] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#E5E1E4]">Content Studio</h1>
            <p className="text-[#E5E1E4]/50 text-sm">
              Voice memo &rarr; full week of content
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-10">
        {STEPS.map((s, i) => {
          const isCurrent = s === step;
          const isPast = STEPS.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (isPast) animateToStep(s); }}
                disabled={!isPast && !isCurrent}
                className={`relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isCurrent
                    ? "bg-[#FF9500] text-[#2d1600] shadow-lg shadow-[#FF9500]/20 scale-[1.02]"
                    : isPast
                    ? "bg-[#FF9500]/10 text-[#FF9500] hover:bg-white/10 cursor-pointer"
                    : "bg-white/5 text-[#E5E1E4]/40"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-white/20"
                      : isPast
                      ? "bg-[#FF9500]/20 text-[#FF9500]"
                      : "bg-white/10 text-[#E5E1E4]/40"
                  }`}
                >
                  {isPast ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isPast ? "w-full bg-[#FF9500]" : "w-0 bg-[#FF9500]"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content with animation ────────────────────────────────── */}
      <div
        className={`transition-all duration-300 ease-out motion-reduce:transition-none ${
          animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >

      {/* ── Step 1: Input ─────────────────────────────────────────────── */}
      {step === "Input" && (
        <div className="space-y-6">
          {/* Product selector */}
          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">
              Product / Brand
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Upload Zone */}
          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">
              Voice Memo
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragOver
                  ? "border-[#FF9500]/40 bg-[#FF9500]/10"
                  : transcribing
                  ? "border-[#FF9500]/30 bg-[#FF9500]/10"
                  : audioFilename
                  ? "border-[#4ade80]/30 bg-[#4ade80]/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {transcribing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF9500]" />
                  <p className="text-sm font-medium text-[#FF9500]">
                    Transcribing {audioFilename}...
                  </p>
                  <p className="text-xs text-[#FF9500]/70">This may take a moment for longer recordings</p>
                </div>
              ) : audioFilename && transcript ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-[#4ade80]">{audioFilename} transcribed</p>
                  <button
                    onClick={() => { setAudioFilename(null); setTranscript(""); }}
                    className="text-xs text-[#E5E1E4]/50 hover:text-[#E5E1E4] underline mt-1"
                  >
                    Clear and start over
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-[#E5E1E4]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-sm text-[#dbc2ad]">
                    Drop a voice memo here, or{" "}
                    <label className="text-[#FF9500] hover:text-[#FF9500] cursor-pointer font-medium">
                      browse
                      <input
                        type="file"
                        accept=".mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioFile(file);
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-[#E5E1E4]/40">
                    mp3, m4a, wav, webm, ogg, flac (auto-transcribed via Whisper)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transcript text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#dbc2ad]">
                Transcript
              </label>
              {transcript && (
                <span className="text-xs text-[#E5E1E4]/40">
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Or paste your transcript here. The Idea Sharpener will find the seed..."
              className="w-full px-4 py-3 bg-[#201f21] border border-white/10 rounded-lg text-sm text-[#E5E1E4] placeholder-[#E5E1E4]/30 leading-relaxed focus:ring-1 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Focus on the energy cost angle. Use the guard dog metaphor if it fits."
              className="w-full px-3 py-2 bg-[#201f21] border border-white/10 rounded-lg text-sm text-[#E5E1E4] placeholder-[#E5E1E4]/30"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!productId || !transcript.trim() || generating}
            className="w-full px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-medium hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "Generate Content Week"
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: Brief ─────────────────────────────────────────────── */}
      {step === "Brief" && brief && (
        <div className="space-y-6">
          <div className="bg-[#201f21] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#E5E1E4]">
              Idea Sharpener Result
            </h2>

            {!!brief.seed && (
              <div>
                <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                  The Seed
                </p>
                <p className="text-[#E5E1E4] font-medium">{String(brief.seed)}</p>
              </div>
            )}

            {Array.isArray(brief.heat) && brief.heat.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                  The Heat
                </p>
                {(brief.heat as string[]).map((h, i) => (
                  <p key={i} className="text-[#dbc2ad] italic border-l-2 border-[#ffbd7f]/50 pl-3 my-1">
                    &ldquo;{h}&rdquo;
                  </p>
                ))}
              </div>
            )}

            {!!brief.audience_hook && (
              <div>
                <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                  Audience Hook
                </p>
                <p className="text-[#dbc2ad]">{String(brief.audience_hook)}</p>
              </div>
            )}

            <div className="flex gap-4">
              {!!brief.template_fit && (
                <div>
                  <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                    Template
                  </p>
                  <span className="px-2 py-1 bg-[#FF9500]/10 text-[#FF9500] text-xs font-medium rounded">
                    {String(brief.template_fit)}
                  </span>
                </div>
              )}
              {!!brief.verdict && (
                <div>
                  <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                    Verdict
                  </p>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      String(brief.verdict).includes("Strong")
                        ? "bg-[#4ade80]/10 text-[#4ade80]"
                        : "bg-[#ffbd7f]/10 text-[#ffbd7f]"
                    }`}
                  >
                    {String(brief.verdict)}
                  </span>
                </div>
              )}
            </div>

            {!!brief.subject_line && (
              <div>
                <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                  Subject Line
                </p>
                <p className="text-[#E5E1E4]">{String(brief.subject_line)}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => animateToStep("Input")}
              className="px-4 py-2 text-sm font-medium bg-[#201f21] border border-white/10 rounded-lg hover:bg-white/5"
            >
              Back to Edit
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 px-6 py-3 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90"
            >
              Generate Full Week from This Seed
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Generating ────────────────────────────────────────── */}
      {step === "Generate" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9500] to-[#ffbd7f] flex items-center justify-center animate-pulse">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-[#FF9500]/30 animate-ping opacity-30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#E5E1E4]">
              {taskStatus?.status === "running"
                ? "Generating your content week..."
                : "Starting pipeline..."}
            </p>
            <p className="text-xs text-[#E5E1E4]/50 mt-1.5 max-w-xs mx-auto">
              Finding the seed, drafting newsletter, sharpening posts, building thread
            </p>
          </div>
          {taskStatus && taskStatus.pieces_generated > 0 && (
            <p className="text-xs text-[#FF9500]">
              {taskStatus.pieces_generated} pieces generated so far
            </p>
          )}
          {taskStatus?.status === "failed" && (
            <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg p-4 mt-4 max-w-md">
              <p className="text-sm text-[#ffb4ab]">{taskStatus.error}</p>
              <button
                onClick={() => animateToStep("Input")}
                className="mt-2 px-3 py-1 text-sm bg-white/10 border border-[#ffb4ab]/20 rounded-lg hover:bg-white/5"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Review ────────────────────────────────────────────── */}
      {step === "Review" && (
        <div className="space-y-6">
          {/* Weekly theme */}
          {!!brief?.weekly_theme && (
            <div className="bg-gradient-to-r from-[#FF9500]/10 to-[#ffbd7f]/10 border border-[#FF9500]/20 rounded-xl p-4">
              <p className="text-xs font-medium text-[#FF9500] uppercase tracking-wide mb-1">
                Weekly Theme
              </p>
              <p className="text-[#E5E1E4] font-medium">
                {String(brief.weekly_theme)}
              </p>
            </div>
          )}

          {/* B-Roll Suggestions */}
          {(brollResults.length > 0 || brollLoading) && (
            <div className="bg-[#201f21] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-[#dbc2ad] uppercase tracking-wide">
                    Suggested B-Roll
                  </p>
                  {brollQuery && (
                    <p className="text-xs text-[#E5E1E4]/40 mt-0.5">
                      Auto-searched: &ldquo;{brollQuery}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={brollQuery}
                    onChange={(e) => setBrollQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && brollQuery.trim()) {
                        setBrollLoading(true);
                        api.searchBroll(brollQuery, "photos", 8, "landscape")
                          .then((res) => setBrollResults(
                            (res.results as BrollItem[]) || []
                          ))
                          .catch(console.error)
                          .finally(() => setBrollLoading(false));
                      }
                    }}
                    placeholder="Search b-roll..."
                    aria-label="Search b-roll images"
                    className="text-xs bg-[#201f21] text-[#E5E1E4] placeholder-[#E5E1E4]/30 border border-white/10 rounded-lg px-2.5 py-1.5 w-48 focus:ring-1 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50 outline-none transition-shadow duration-150"
                  />
                </div>
              </div>
              {brollLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-video bg-white/10 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {brollResults.map((photo) => (
                    <div key={photo.id} className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer">
                      <img
                        src={photo.src.medium}
                        alt={photo.alt || `B-roll by ${photo.photographer}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                        <p className="text-white text-[11px] px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate w-full bg-gradient-to-t from-black/60 to-transparent">
                          {photo.photographer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#E5E1E4]/50">
                {pieces.length} pieces generated
              </p>
              {/* View toggle */}
              <div className="flex bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setReviewView("grid")}
                  aria-label="Week grid view"
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    reviewView === "grid" ? "bg-[#201f21] text-[#E5E1E4] shadow-sm" : "text-[#E5E1E4]/50 hover:text-[#E5E1E4]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  onClick={() => setReviewView("list")}
                  aria-label="List view"
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    reviewView === "list" ? "bg-[#201f21] text-[#E5E1E4] shadow-sm" : "text-[#E5E1E4]/50 hover:text-[#E5E1E4]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  pieces.forEach((p) => {
                    if (p.status === "draft") handleStatusChange(p.id, "approved");
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium bg-[#4ade80]/20 text-[#4ade80] rounded-lg hover:bg-[#4ade80]/30 active:scale-95 transition-all duration-150"
              >
                Approve All
              </button>
              <button
                onClick={() => {
                  const approved = pieces.filter((p) => p.status === "approved");
                  if (approved.length === 0 || connections.length === 0) return;
                  const activeConn = connections.find((c) => c.status === "active");
                  if (!activeConn) return;
                  approved.forEach((p) => handlePublish(p.id, activeConn.id));
                }}
                disabled={!pieces.some((p) => p.status === "approved") || connections.length === 0}
                className="px-3 py-1.5 text-xs font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all duration-150"
              >
                Publish All Approved
              </button>
              <button
                onClick={() => animateToStep("Input")}
                className="px-3 py-1.5 text-xs font-medium bg-[#201f21] border border-white/10 rounded-lg hover:bg-white/5"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* ── Week Grid View ──────────────────────────────────────────── */}
          {reviewView === "grid" && (
            <div className="grid grid-cols-7 gap-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                const dayPieces = pieces.filter((p) => {
                  const m = getPieceMeta(p);
                  return (m.day || "") === day;
                });
                const bgColors: Record<string, string> = {
                  Monday: "bg-[#FF9500]/5 border-[#FF9500]/20",
                  Tuesday: "bg-[#c5c5ff]/5 border-[#c5c5ff]/20",
                  Wednesday: "bg-[#ffbd7f]/5 border-[#ffbd7f]/20",
                  Thursday: "bg-[#4ade80]/5 border-[#4ade80]/20",
                  Friday: "bg-[#ffb4ab]/5 border-[#ffb4ab]/20",
                  Saturday: "bg-[#a4a7ff]/5 border-[#a4a7ff]/20",
                  Sunday: "bg-white/5 border-white/10",
                };
                const headerColors: Record<string, string> = {
                  Monday: "text-[#FF9500]",
                  Tuesday: "text-[#c5c5ff]",
                  Wednesday: "text-[#ffbd7f]",
                  Thursday: "text-[#4ade80]",
                  Friday: "text-[#ffb4ab]",
                  Saturday: "text-[#a4a7ff]",
                  Sunday: "text-[#E5E1E4]/50",
                };
                return (
                  <div key={day} className={`rounded-xl border p-2 min-h-[140px] ${bgColors[day] || "bg-white/5 border-white/10"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${headerColors[day] || "text-[#E5E1E4]/50"}`}>
                      {day.slice(0, 3)}
                    </p>
                    <div className="space-y-1.5">
                      {dayPieces.map((piece) => {
                        const typeBadge = TYPE_BADGES[piece.content_type] || TYPE_BADGES.social_post;
                        return (
                          <button
                            key={piece.id}
                            onClick={() => {
                              setExpandedPiece(piece.id);
                              setReviewView("list");
                            }}
                            className="w-full text-left bg-[#201f21] rounded-lg p-2 shadow-sm hover:shadow transition-shadow border border-white/10"
                          >
                            <span className={`inline-block px-1.5 py-0.5 text-[11px] font-medium rounded ${typeBadge.bg} ${typeBadge.text} mb-1`}>
                              {piece.content_type.replace("_", " ")}
                            </span>
                            <p className="text-xs text-[#E5E1E4] font-medium truncate">
                              {piece.title || piece.hook || piece.body.slice(0, 40)}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                piece.status === "approved" ? "bg-[#4ade80]" : piece.status === "rejected" ? "bg-[#ffb4ab]" : "bg-[#ffbd7f]"
                              }`} />
                              <span className="text-[11px] text-[#E5E1E4]/40">{piece.status}</span>
                            </div>
                          </button>
                        );
                      })}
                      {dayPieces.length === 0 && (
                        <p className="text-[11px] text-[#E5E1E4]/40 italic">
                          {day === "Saturday" || day === "Sunday" ? "Rest day" : "Open slot"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Unassigned pieces */}
              {pieces.filter((p) => {
                const m = getPieceMeta(p);
                return !["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(m.day || "");
              }).length > 0 && (
                <div className="col-span-7 mt-2">
                  <p className="text-xs text-[#E5E1E4]/40 mb-2">Unassigned</p>
                  <div className="grid grid-cols-4 gap-2">
                    {pieces.filter((p) => {
                      const m = getPieceMeta(p);
                      return !["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(m.day || "");
                    }).map((piece) => {
                      const typeBadge = TYPE_BADGES[piece.content_type] || TYPE_BADGES.social_post;
                      return (
                        <button
                          key={piece.id}
                          onClick={() => { setExpandedPiece(piece.id); setReviewView("list"); }}
                          className="text-left bg-[#201f21] rounded-lg p-2 shadow-sm hover:shadow transition-shadow border border-white/10"
                        >
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge.bg} ${typeBadge.text} mb-1`}>
                            {piece.content_type.replace("_", " ")}
                          </span>
                          <p className="text-xs text-[#E5E1E4] font-medium truncate">
                            {piece.title || piece.hook || piece.body.slice(0, 40)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── List View (existing cards) ─────────────────────────────── */}
          {reviewView === "list" && <div className="space-y-3">
            {pieces.map((piece) => {
              const meta = getPieceMeta(piece);
              const isExpanded = expandedPiece === piece.id;
              const day = meta.day || "";
              const dayColor = DAY_COLORS[day] || "border-l-[#E5E1E4]/30";
              const typeBadge = TYPE_BADGES[piece.content_type] || TYPE_BADGES.social_post;

              return (
                <div
                  key={piece.id}
                  className={`bg-[#201f21] border border-white/10 rounded-xl overflow-hidden border-l-4 ${dayColor}`}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() =>
                      setExpandedPiece(isExpanded ? null : piece.id)
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {day && (
                        <span className="text-xs font-medium text-[#E5E1E4]/50 w-20 shrink-0">
                          {day}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${typeBadge.bg} ${typeBadge.text}`}
                      >
                        {piece.content_type === "blog_draft" && meta.source === "voice_memo_pipeline" && meta.blocks
                          ? "video"
                          : piece.content_type === "blog_draft"
                          ? "newsletter"
                          : piece.content_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#E5E1E4]/40">
                        {PLATFORM_LABELS[piece.platform] || piece.platform}
                      </span>
                      <p className="text-sm font-medium text-[#E5E1E4] truncate">
                        {piece.title || piece.hook || piece.body.slice(0, 60)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          piece.status === "approved"
                            ? "bg-[#4ade80]/10 text-[#4ade80]"
                            : piece.status === "rejected"
                            ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                            : "bg-[#ffbd7f]/10 text-[#ffbd7f]"
                        }`}
                      >
                        {piece.status}
                      </span>
                      <svg
                        className={`w-4 h-4 text-[#E5E1E4]/40 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/5">
                      {/* Tab bar */}
                      <div className="flex gap-1 mt-3 mb-4 bg-white/10 rounded-lg p-0.5 w-fit">
                        {(["content", "preview", ...(meta.blocks || piece.content_type === "video_script" ? ["video"] : [])] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setCardTab((prev) => ({ ...prev, [piece.id]: tab as "content" | "preview" | "video" }))}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                              (cardTab[piece.id] || "content") === tab
                                ? "bg-[#201f21] text-[#E5E1E4] shadow-sm"
                                : "text-[#E5E1E4]/50 hover:text-[#E5E1E4]"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Platform Preview tab */}
                      {(cardTab[piece.id] || "content") === "preview" && (
                        <div className="flex justify-center py-4">
                          <PlatformPreview
                            platform={piece.content_type === "blog_draft" || piece.content_type === "newsletter" ? "substack" : piece.platform}
                            title={piece.title}
                            hook={piece.hook}
                            body={piece.body}
                            cta={piece.cta}
                          />
                        </div>
                      )}

                      {/* Video Preview tab */}
                      {(cardTab[piece.id] || "content") === "video" && (
                        <div className="flex justify-center py-4">
                          <VideoPreview
                            headline={piece.hook || piece.title || ""}
                            body={piece.body.slice(0, 120)}
                            cta={piece.cta || "Learn More"}
                            videoStyle={(piece.template_type as VideoStyle) || "hand-drawn"}
                            previewWidth={400}
                          />
                        </div>
                      )}

                      {/* Content tab (original content) */}
                      {(cardTab[piece.id] || "content") === "content" && <>
                      {/* Hook */}
                      {piece.hook && (
                        <div className="mt-4 mb-3">
                          <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                            Hook
                          </p>
                          <p className="text-[#E5E1E4] font-medium">
                            {piece.hook}
                          </p>
                        </div>
                      )}

                      {/* Body */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                          Body
                        </p>
                        <div className="text-sm text-[#dbc2ad] leading-relaxed whitespace-pre-wrap bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                          {piece.body}
                        </div>
                      </div>

                      {/* CTA */}
                      {piece.cta && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-1">
                            CTA
                          </p>
                          <p className="text-sm text-[#dbc2ad]">{piece.cta}</p>
                        </div>
                      )}

                      {/* Quality checks (social posts) */}
                      {(meta.specificity_check || meta.tension_check || meta.stealable_line) && (
                        <div className="mt-3 p-3 bg-[#FF9500]/10 rounded-lg space-y-1">
                          {meta.specificity_check && (
                            <p className="text-xs text-[#FF9500]">
                              <span className="font-medium">Specificity:</span>{" "}
                              {meta.specificity_check}
                            </p>
                          )}
                          {meta.tension_check && (
                            <p className="text-xs text-[#FF9500]">
                              <span className="font-medium">Tension:</span>{" "}
                              {meta.tension_check}
                            </p>
                          )}
                          {meta.stealable_line && (
                            <p className="text-xs text-[#FF9500]">
                              <span className="font-medium">Stealable line:</span>{" "}
                              &ldquo;{meta.stealable_line}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Thread tweets */}
                      {Array.isArray(meta.tweets) && meta.tweets.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-2">
                            Thread ({meta.tweets.length} tweets)
                          </p>
                          <div className="space-y-2">
                            {(meta.tweets as string[]).map((tweet, i) => (
                              <div
                                key={i}
                                className="bg-white/5 rounded-lg p-3 text-sm text-[#dbc2ad] border-l-2 border-[#c5c5ff]/50"
                              >
                                <span className="text-xs text-[#E5E1E4]/40 mr-2">
                                  {i + 1}/{meta.tweets.length}
                                </span>
                                {tweet}
                                <span className="text-xs text-[#E5E1E4]/40 ml-1">
                                  ({tweet.length}/280)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Video blocks */}
                      {Array.isArray(meta.blocks) && meta.blocks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-[#E5E1E4]/50 uppercase tracking-wide mb-2">
                            Breath Blocks ({meta.blocks.length})
                          </p>
                          <div className="space-y-2">
                            {(meta.blocks as string[]).map((block, i) => (
                              <div
                                key={i}
                                className="bg-white/5 rounded-lg p-3 text-sm text-[#dbc2ad] border-l-2 border-[#ffb4ab]/50"
                              >
                                <span className="text-xs text-[#ffb4ab] font-medium mr-2">
                                  Block {i + 1}
                                </span>
                                {block}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {meta.notes && (
                        <p className="text-xs text-[#E5E1E4]/40 mt-3 italic">
                          {meta.notes}
                        </p>
                      )}
                      </>}
                      {/* end content tab */}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                        <button
                          onClick={() => handleStatusChange(piece.id, "approved")}
                          disabled={piece.status === "approved"}
                          className="px-3 py-1.5 text-xs font-medium bg-[#4ade80]/20 text-[#4ade80] rounded-lg hover:bg-[#4ade80]/30 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(piece.id, "rejected")}
                          disabled={piece.status === "rejected"}
                          className="px-3 py-1.5 text-xs font-medium bg-white/10 text-[#ffb4ab] border border-[#ffb4ab]/20 rounded-lg hover:bg-white/5 disabled:opacity-40"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/content/${piece.id}`)
                          }
                          className="px-3 py-1.5 text-xs font-medium bg-white/10 text-[#dbc2ad] border border-white/10 rounded-lg hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(piece.body);
                            setCopiedId(piece.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-white/10 text-[#dbc2ad] border border-white/10 rounded-lg hover:bg-white/5 active:scale-95 transition-all duration-150 ml-auto"
                        >
                          {copiedId === piece.id ? "Copied" : "Copy"}
                        </button>

                        {/* Publish dropdown */}
                        <div className="relative">
                          {publishStatus[piece.id] === "publishing" ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-[#FF9500]">
                              Publishing...
                            </span>
                          ) : publishStatus[piece.id] === "published" ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-[#4ade80]">
                              Published
                            </span>
                          ) : publishStatus[piece.id] === "failed" ? (
                            <button
                              onClick={() => setPublishingPieceId(piece.id)}
                              className="px-3 py-1.5 text-xs font-medium text-[#ffb4ab] border border-[#ffb4ab]/20 rounded-lg hover:bg-white/5"
                            >
                              Retry
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setPublishingPieceId(
                                  publishingPieceId === piece.id ? null : piece.id
                                )
                              }
                              disabled={piece.status !== "approved" && piece.status !== "posted"}
                              className="px-3 py-1.5 text-xs font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90 disabled:opacity-40"
                            >
                              Publish
                            </button>
                          )}

                          {publishingPieceId === piece.id && (
                            <div className="absolute bottom-full right-0 mb-1 w-56 bg-[#201f21] border border-white/10 rounded-lg shadow-lg z-10 p-2">
                              {connections.length === 0 ? (
                                <p className="text-xs text-[#E5E1E4]/50 px-2 py-1">
                                  No connections.{" "}
                                  <a href="/settings" className="text-[#FF9500] underline">
                                    Add one
                                  </a>
                                </p>
                              ) : (
                                connections
                                  .filter((c) => c.status === "active")
                                  .map((conn) => (
                                    <button
                                      key={conn.id}
                                      onClick={() => handlePublish(piece.id, conn.id)}
                                      className="w-full text-left px-3 py-2 text-xs rounded hover:bg-white/10 flex items-center gap-2"
                                    >
                                      <span className="font-medium capitalize">
                                        {conn.platform}
                                      </span>
                                      {conn.platform_account_name && (
                                        <span className="text-[#E5E1E4]/40 truncate">
                                          {conn.platform_account_name}
                                        </span>
                                      )}
                                    </button>
                                  ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

          {pieces.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#E5E1E4]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#E5E1E4] mb-1">No content yet</p>
              <p className="text-xs text-[#E5E1E4]/50">
                Paste a transcript and generate to see your content week here
              </p>
              <button
                onClick={() => animateToStep("Input")}
                className="mt-4 px-4 py-2 text-xs font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90 transition-colors"
              >
                Get started
              </button>
            </div>
          )}
        </div>
      )}

      </div>{/* end animation wrapper */}
    </div>
  );
}
