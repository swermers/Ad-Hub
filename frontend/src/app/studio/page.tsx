"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  type Product,
  type TranscriptTaskStatus,
  type ContentPiece,
} from "@/lib/api";

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

  // Input
  const [transcript, setTranscript] = useState("");
  const [instructions, setInstructions] = useState("");

  // Brief (from Idea Sharpener)
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);

  // Generation
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TranscriptTaskStatus | null>(null);
  const [generating, setGenerating] = useState(false);

  // Review
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

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

  // ── Generate ────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!productId || !transcript.trim()) return;
    setGenerating(true);
    setStep("Generate");

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
              setStep("Review");
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
      setStep("Input");
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Voice memo to a full week of content. Paste your transcript, review the seed, generate everything.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const isCurrent = s === step;
          const isPast = STEPS.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${
                    isPast ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
              <button
                onClick={() => {
                  if (isPast) setStep(s);
                }}
                disabled={!isPast && !isCurrent}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isPast
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    isCurrent
                      ? "bg-white/20"
                      : isPast
                      ? "bg-blue-200 text-blue-700"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isPast ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {s}
              </button>
            </div>
          );
        })}
      </div>

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

          {/* Transcript input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Memo Transcript
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Paste the transcription of your voice memo. The Idea Sharpener will find the seed.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              placeholder="I've been noticing lately that when people talk about self-care, they always focus on the soft stuff — baths, candles, journaling. But the hardest form of self-care is actually saying no. Not the dramatic no, but the small ones..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">
                {transcript.length > 0
                  ? `${transcript.split(/\s+/).filter(Boolean).length} words`
                  : ""}
              </span>
            </div>
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

            {brief.seed && (
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

            {brief.audience_hook && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Audience Hook
                </p>
                <p className="text-gray-700">{String(brief.audience_hook)}</p>
              </div>
            )}

            <div className="flex gap-4">
              {brief.template_fit && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Template
                  </p>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {String(brief.template_fit)}
                  </span>
                </div>
              )}
              {brief.verdict && (
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

            {brief.subject_line && (
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
              onClick={() => setStep("Input")}
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
                onClick={() => setStep("Input")}
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
          {brief?.weekly_theme && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                Weekly Theme
              </p>
              <p className="text-blue-900 font-medium">
                {String(brief.weekly_theme)}
              </p>
            </div>
          )}

          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {pieces.length} pieces generated
            </p>
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
                onClick={() => setStep("Input")}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Content cards */}
          <div className="space-y-3">
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
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
    </div>
  );
}
