"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  Monday: "border-l-blue-500",
  Tuesday: "border-l-violet-500",
  Wednesday: "border-l-amber-500",
  Thursday: "border-l-emerald-500",
  Friday: "border-l-rose-500",
  Saturday: "border-l-cyan-500",
  Sunday: "border-l-gray-400",
};

const TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  social_post: { bg: "bg-blue-100", text: "text-blue-700" },
  blog_draft: { bg: "bg-amber-100", text: "text-amber-700" },
  newsletter: { bg: "bg-amber-100", text: "text-amber-700" },
  video_script: { bg: "bg-rose-100", text: "text-rose-700" },
  x_thread: { bg: "bg-violet-100", text: "text-violet-700" },
  email: { bg: "bg-emerald-100", text: "text-emerald-700" },
  carousel: { bg: "bg-cyan-100", text: "text-cyan-700" },
  ad_copy: { bg: "bg-orange-100", text: "text-orange-700" },
};

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
  const prevStepRef = useRef<Step>("Input");

  const animateToStep = (next: Step) => {
    if (next === step) return;
    setAnimating(true);
    setTimeout(() => {
      prevStepRef.current = step;
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
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TranscriptTaskStatus | null>(null);
  const [generating, setGenerating] = useState(false);

  // Review
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  // Review view mode
  const [reviewView, setReviewView] = useState<"grid" | "list">("grid");
  const [cardTab, setCardTab] = useState<Record<string, "content" | "preview" | "video">>({});

  // B-roll suggestions
  const [brollResults, setBrollResults] = useState<{ id: number; src: { medium: string }; alt: string; photographer: string }[]>([]);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollQuery, setBrollQuery] = useState("");

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
      setTaskId(result.task_id);
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
                    (res.results as { id: number; src: { medium: string }; alt: string; photographer: string }[]) || []
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
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-56 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
            <p className="text-gray-500 text-sm">
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
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-[1.02]"
                    : isPast
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-white/20"
                      : isPast
                      ? "bg-blue-200 text-blue-700"
                      : "bg-gray-200 text-gray-400"
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
                <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isPast ? "w-full bg-blue-500" : "w-0 bg-blue-500"
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
        className={`transition-all duration-300 ease-out ${
          animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
      >

      {/* ── Step 1: Input ─────────────────────────────────────────────── */}
      {step === "Input" && (
        <div className="space-y-6">
          {/* Product selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product / Brand
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Memo
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : transcribing
                  ? "border-blue-300 bg-blue-50"
                  : audioFilename
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              {transcribing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  <p className="text-sm font-medium text-blue-700">
                    Transcribing {audioFilename}...
                  </p>
                  <p className="text-xs text-blue-500">This may take a moment for longer recordings</p>
                </div>
              ) : audioFilename && transcript ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-medium text-green-700">{audioFilename} transcribed</p>
                  <button
                    onClick={() => { setAudioFilename(null); setTranscript(""); }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
                  >
                    Clear and start over
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drop a voice memo here, or{" "}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
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
                  <p className="text-xs text-gray-400">
                    mp3, m4a, wav, webm, ogg, flac (auto-transcribed via Whisper)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transcript text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Transcript
              </label>
              {transcript && (
                <span className="text-xs text-gray-400">
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </span>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Or paste your transcript here. The Idea Sharpener will find the seed..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Focus on the energy cost angle. Use the guard dog metaphor if it fits."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!productId || !transcript.trim()}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Find the Seed and Generate Week
          </button>
        </div>
      )}

      {/* ── Step 2: Brief ─────────────────────────────────────────────── */}
      {step === "Brief" && brief && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Idea Sharpener Result
            </h2>

            {!!brief.seed && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  The Seed
                </p>
                <p className="text-gray-900 font-medium">{String(brief.seed)}</p>
              </div>
            )}

            {Array.isArray(brief.heat) && brief.heat.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  The Heat
                </p>
                {(brief.heat as string[]).map((h, i) => (
                  <p key={i} className="text-gray-700 italic border-l-2 border-amber-400 pl-3 my-1">
                    &ldquo;{h}&rdquo;
                  </p>
                ))}
              </div>
            )}

            {!!brief.audience_hook && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Audience Hook
                </p>
                <p className="text-gray-700">{String(brief.audience_hook)}</p>
              </div>
            )}

            <div className="flex gap-4">
              {!!brief.template_fit && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Template
                  </p>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {String(brief.template_fit)}
                  </span>
                </div>
              )}
              {!!brief.verdict && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Verdict
                  </p>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      String(brief.verdict).includes("Strong")
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {String(brief.verdict)}
                  </span>
                </div>
              )}
            </div>

            {!!brief.subject_line && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Subject Line
                </p>
                <p className="text-gray-900">{String(brief.subject_line)}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => animateToStep("Input")}
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Edit
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Generate Full Week from This Seed
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Generating ────────────────────────────────────────── */}
      {step === "Generate" && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-sm font-medium text-gray-900">
            {taskStatus?.status === "running"
              ? "Generating your content week..."
              : "Starting pipeline..."}
          </p>
          <p className="text-xs text-gray-500">
            Finding the seed, drafting newsletter, sharpening posts, building thread
          </p>
          {taskStatus && taskStatus.pieces_generated > 0 && (
            <p className="text-xs text-blue-600">
              {taskStatus.pieces_generated} pieces generated so far
            </p>
          )}
          {taskStatus?.status === "failed" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 max-w-md">
              <p className="text-sm text-red-700">{taskStatus.error}</p>
              <button
                onClick={() => animateToStep("Input")}
                className="mt-2 px-3 py-1 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-50"
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Weekly Theme
              </p>
              <p className="text-blue-900 font-medium">
                {String(brief.weekly_theme)}
              </p>
            </div>
          )}

          {/* B-Roll Suggestions */}
          {(brollResults.length > 0 || brollLoading) && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Suggested B-Roll
                  </p>
                  {brollQuery && (
                    <p className="text-xs text-gray-400 mt-0.5">
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
                            (res.results as { id: number; src: { medium: string }; alt: string; photographer: string }[]) || []
                          ))
                          .catch(console.error)
                          .finally(() => setBrollLoading(false));
                      }
                    }}
                    placeholder="Search b-roll..."
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-48"
                  />
                </div>
              </div>
              {brollLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-video bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {brollResults.map((photo) => (
                    <div key={photo.id} className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer">
                      <img
                        src={photo.src.medium}
                        alt={photo.alt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                        <p className="text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
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
              <p className="text-sm text-gray-500">
                {pieces.length} pieces generated
              </p>
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setReviewView("grid")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    reviewView === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  onClick={() => setReviewView("list")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    reviewView === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
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
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                Publish All Approved
              </button>
              <button
                onClick={() => animateToStep("Input")}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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
                  Monday: "bg-blue-50 border-blue-200",
                  Tuesday: "bg-violet-50 border-violet-200",
                  Wednesday: "bg-amber-50 border-amber-200",
                  Thursday: "bg-emerald-50 border-emerald-200",
                  Friday: "bg-rose-50 border-rose-200",
                  Saturday: "bg-cyan-50 border-cyan-200",
                  Sunday: "bg-gray-50 border-gray-200",
                };
                const headerColors: Record<string, string> = {
                  Monday: "text-blue-700",
                  Tuesday: "text-violet-700",
                  Wednesday: "text-amber-700",
                  Thursday: "text-emerald-700",
                  Friday: "text-rose-700",
                  Saturday: "text-cyan-700",
                  Sunday: "text-gray-500",
                };
                return (
                  <div key={day} className={`rounded-xl border p-2 min-h-[140px] ${bgColors[day] || "bg-gray-50 border-gray-200"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${headerColors[day] || "text-gray-500"}`}>
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
                            className="w-full text-left bg-white rounded-lg p-2 shadow-sm hover:shadow transition-shadow border border-white/80"
                          >
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge.bg} ${typeBadge.text} mb-1`}>
                              {piece.content_type.replace("_", " ")}
                            </span>
                            <p className="text-xs text-gray-800 font-medium truncate">
                              {piece.title || piece.hook || piece.body.slice(0, 40)}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                piece.status === "approved" ? "bg-green-500" : piece.status === "rejected" ? "bg-red-500" : "bg-yellow-500"
                              }`} />
                              <span className="text-[10px] text-gray-400">{piece.status}</span>
                            </div>
                          </button>
                        );
                      })}
                      {dayPieces.length === 0 && (
                        <p className="text-[10px] text-gray-400 italic">No content</p>
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
                  <p className="text-xs text-gray-400 mb-2">Unassigned</p>
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
                          className="text-left bg-white rounded-lg p-2 shadow-sm hover:shadow transition-shadow border border-gray-200"
                        >
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${typeBadge.bg} ${typeBadge.text} mb-1`}>
                            {piece.content_type.replace("_", " ")}
                          </span>
                          <p className="text-xs text-gray-800 font-medium truncate">
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
              const dayColor = DAY_COLORS[day] || "border-l-gray-300";
              const typeBadge = TYPE_BADGES[piece.content_type] || TYPE_BADGES.social_post;

              return (
                <div
                  key={piece.id}
                  className={`bg-white border border-gray-200 rounded-xl overflow-hidden border-l-4 ${dayColor}`}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setExpandedPiece(isExpanded ? null : piece.id)
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {day && (
                        <span className="text-xs font-medium text-gray-500 w-20 shrink-0">
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
                      <span className="text-xs text-gray-400">
                        {PLATFORM_LABELS[piece.platform] || piece.platform}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {piece.title || piece.hook || piece.body.slice(0, 60)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          piece.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : piece.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {piece.status}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
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
                    <div className="px-5 pb-5 border-t border-gray-100">
                      {/* Tab bar */}
                      <div className="flex gap-1 mt-3 mb-4 bg-gray-100 rounded-lg p-0.5 w-fit">
                        {(["content", "preview", ...(meta.blocks || piece.content_type === "video_script" ? ["video"] : [])] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setCardTab((prev) => ({ ...prev, [piece.id]: tab as "content" | "preview" | "video" }))}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                              (cardTab[piece.id] || "content") === tab
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
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
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Hook
                          </p>
                          <p className="text-gray-900 font-medium">
                            {piece.hook}
                          </p>
                        </div>
                      )}

                      {/* Body */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Body
                        </p>
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          {piece.body}
                        </div>
                      </div>

                      {/* CTA */}
                      {piece.cta && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            CTA
                          </p>
                          <p className="text-sm text-gray-700">{piece.cta}</p>
                        </div>
                      )}

                      {/* Quality checks (social posts) */}
                      {(meta.specificity_check || meta.tension_check || meta.stealable_line) && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg space-y-1">
                          {meta.specificity_check && (
                            <p className="text-xs text-blue-700">
                              <span className="font-medium">Specificity:</span>{" "}
                              {meta.specificity_check}
                            </p>
                          )}
                          {meta.tension_check && (
                            <p className="text-xs text-blue-700">
                              <span className="font-medium">Tension:</span>{" "}
                              {meta.tension_check}
                            </p>
                          )}
                          {meta.stealable_line && (
                            <p className="text-xs text-blue-700">
                              <span className="font-medium">Stealable line:</span>{" "}
                              &ldquo;{meta.stealable_line}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Thread tweets */}
                      {Array.isArray(meta.tweets) && meta.tweets.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Thread ({meta.tweets.length} tweets)
                          </p>
                          <div className="space-y-2">
                            {(meta.tweets as string[]).map((tweet, i) => (
                              <div
                                key={i}
                                className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border-l-2 border-violet-300"
                              >
                                <span className="text-xs text-gray-400 mr-2">
                                  {i + 1}/{meta.tweets.length}
                                </span>
                                {tweet}
                                <span className="text-xs text-gray-400 ml-1">
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
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            Breath Blocks ({meta.blocks.length})
                          </p>
                          <div className="space-y-2">
                            {(meta.blocks as string[]).map((block, i) => (
                              <div
                                key={i}
                                className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border-l-2 border-rose-300"
                              >
                                <span className="text-xs text-rose-400 font-medium mr-2">
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
                        <p className="text-xs text-gray-400 mt-3 italic">
                          {meta.notes}
                        </p>
                      )}
                      </>}
                      {/* end content tab */}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleStatusChange(piece.id, "approved")}
                          disabled={piece.status === "approved"}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(piece.id, "rejected")}
                          disabled={piece.status === "rejected"}
                          className="px-3 py-1.5 text-xs font-medium bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-40"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/content/${piece.id}`)
                          }
                          className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              piece.body
                            );
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto"
                        >
                          Copy
                        </button>

                        {/* Publish dropdown */}
                        <div className="relative">
                          {publishStatus[piece.id] === "publishing" ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-blue-600">
                              Publishing...
                            </span>
                          ) : publishStatus[piece.id] === "published" ? (
                            <span className="px-3 py-1.5 text-xs font-medium text-green-600">
                              Published
                            </span>
                          ) : publishStatus[piece.id] === "failed" ? (
                            <button
                              onClick={() => setPublishingPieceId(piece.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
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
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                            >
                              Publish
                            </button>
                          )}

                          {publishingPieceId === piece.id && (
                            <div className="absolute bottom-full right-0 mb-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
                              {connections.length === 0 ? (
                                <p className="text-xs text-gray-500 px-2 py-1">
                                  No connections.{" "}
                                  <a href="/settings" className="text-blue-600 underline">
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
                                      className="w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <span className="font-medium capitalize">
                                        {conn.platform}
                                      </span>
                                      {conn.platform_account_name && (
                                        <span className="text-gray-400 truncate">
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
            <div className="text-center py-12">
              <p className="text-gray-500">
                No content generated yet. Go back and paste a transcript to get
                started.
              </p>
            </div>
          )}
        </div>
      )}

      </div>{/* end animation wrapper */}
    </div>
  );
}
