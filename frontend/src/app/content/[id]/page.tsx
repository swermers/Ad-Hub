"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { api, API_BASE, type ContentPiece, type Product, type GenerateImageStatus } from "@/lib/api";
import { TemplateRenderer, TEMPLATE_OPTIONS } from "@/components/ad-templates/TemplateRenderer";
import { VideoPreview, VIDEO_STYLE_OPTIONS, type VideoStyle } from "@/components/ad-templates/remotion/VideoPreview";
import type { AspectRatio } from "@/components/ad-templates/types";
import { ASPECT_DIMENSIONS } from "@/components/ad-templates/types";
import { buildColorSchemeFromSeed } from "@/components/ad-templates/colorUtils";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState("bold_hook");
  const [previewAspect, setPreviewAspect] = useState<AspectRatio>("1:1");
  const [defaultsSet, setDefaultsSet] = useState(false);
  const [showVisual, setShowVisual] = useState(true);
  const [previewMode, setPreviewMode] = useState<"video" | "static">("video");
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("swiss-bold");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenStatus, setImageGenStatus] = useState<GenerateImageStatus | null>(null);
  const imageGenPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api
      .getContent(id)
      .then(async (c) => {
        setPiece(c);
        setEditBody(c.body);
        setEditTitle(c.title || "");
        // Use stored template/aspect if available
        if (!defaultsSet) {
          if (c.template_type) setPreviewTemplate(c.template_type);
          if (c.aspect_ratio && (c.aspect_ratio === "1:1" || c.aspect_ratio === "4:5" || c.aspect_ratio === "9:16")) {
            setPreviewAspect(c.aspect_ratio as AspectRatio);
          }
          setDefaultsSet(true);
        }
        // Load product for brand colors + screenshots
        try {
          const p = await api.getProduct(c.product_id);
          setProduct(p);
        } catch { /* ok */ }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!piece) return;
    setSaving(true);
    try {
      const updated = await api.updateContent(piece.id, {
        title: editTitle,
        body: editBody,
      });
      setPiece(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!piece) return;
    try {
      const updated = await api.updateContentStatus(piece.id, status);
      setPiece(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleCopy = () => {
    if (!piece) return;
    navigator.clipboard.writeText(piece.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!piece) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await api.deleteContent(piece.id);
      router.push("/content");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setConfirmDelete(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-8 w-64 bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-6">
          <div className="aspect-square bg-white/10 rounded-xl" />
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
  if (!piece) return (
    <div className="max-w-5xl">
      <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg p-6 text-center">
        <p className="text-sm font-medium text-[#ffb4ab]">Content not found</p>
        <button onClick={() => router.push("/content")} className="mt-2 text-xs text-[#ffb4ab] hover:underline">
          Back to Content Queue
        </button>
      </div>
    </div>
  );

  // Extract brand colors and font from product/brief
  let brandColors: string[] = [];
  let brandFont: string | undefined;
  if (product?.brand_colors) {
    try { brandColors = JSON.parse(product.brand_colors); } catch { /* */ }
  }
  // Also try visual_identity from brief
  if (product?.brand_brief) {
    try {
      const brief = JSON.parse(product.brand_brief);
      const viColors = brief?.visual_identity?.primary_colors || [];
      if (viColors.length > 0 && brandColors.length === 0) brandColors = viColors;
      // Extract brand font if available
      const fonts = brief?.visual_identity?.fonts;
      if (fonts && typeof fonts === "string") brandFont = fonts;
      else if (Array.isArray(fonts) && fonts.length > 0) brandFont = fonts[0];
    } catch { /* */ }
  }
  // Also check crawl-extracted fonts
  if (!brandFont && product?.brand_fonts) {
    try {
      const crawlFonts = JSON.parse(product.brand_fonts);
      if (Array.isArray(crawlFonts) && crawlFonts.length > 0) brandFont = crawlFonts[0];
    } catch { /* */ }
  }

  // Get screenshot URL
  let screenshotUrl: string | undefined;
  if (product?.screenshots) {
    try {
      const shots = JSON.parse(product.screenshots);
      if (shots.length > 0) {
        screenshotUrl = `${API_BASE}${shots[0]}`;
      }
    } catch { /* */ }
  }

  // Pick colors for the visual preview using smart color scheme
  const colorScheme = buildColorSchemeFromSeed(brandColors, piece.product_id);
  const bgColor = colorScheme.backgroundColor;
  const accentColor = colorScheme.accentColor;
  const textColor = colorScheme.textColor;

  // Extract headline for the visual — Swiss design demands brevity
  const rawHeadline = piece.hook || piece.title || piece.body.split("\n")[0];
  const headline = rawHeadline.length > 30 ? rawHeadline.slice(0, 27) + "..." : rawHeadline;
  // Extract body text — concise supporting copy
  const rawBody = piece.hook
    ? piece.body.replace(piece.hook, "").trim()
    : piece.body.split("\n").slice(1).join(" ").trim();
  const bodyText = rawBody.length > 60 ? rawBody.slice(0, 57) + "..." : rawBody;
  const ctaText = piece.cta || "Learn More";

  const handleGenerateImage = async () => {
    if (!piece) return;
    setGeneratingImage(true);
    setImageGenStatus(null);
    try {
      const status = await api.generateImage(piece.product_id, {
        content_id: piece.id,
        headline,
        body: bodyText,
        cta: ctaText,
        aspect_ratio: previewAspect,
      });
      setImageGenStatus(status);

      if (imageGenPollRef.current) clearInterval(imageGenPollRef.current);
      imageGenPollRef.current = setInterval(async () => {
        try {
          const updated = await api.getImageGenStatus(piece.product_id, status.task_id);
          setImageGenStatus(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            if (imageGenPollRef.current) clearInterval(imageGenPollRef.current);
            setGeneratingImage(false);
            if (updated.status === "completed") {
              const refreshed = await api.getContent(piece.id);
              setPiece(refreshed);
            }
          }
        } catch {
          if (imageGenPollRef.current) clearInterval(imageGenPollRef.current);
          setGeneratingImage(false);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed");
      setGeneratingImage(false);
    }
  };

  const platformLabel: Record<string, string> = {
    twitter: "Twitter / X",
    linkedin: "LinkedIn",
    meta: "Meta / Facebook",
    google: "Google Ads",
    general: "General",
  };
  const typeLabel: Record<string, string> = {
    social_post: "Social Post",
    ad_copy: "Ad Copy",
    carousel: "Carousel",
    story: "Story / Reel",
    email: "Email",
    blog_draft: "Blog Draft",
  };
  const funnelColors: Record<string, string> = {
    awareness: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20",
    consideration: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20",
    conversion: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20",
  };

  const previewWidth = 400;
  const dims = ASPECT_DIMENSIONS[previewAspect];
  const previewScale = previewWidth / dims.width;
  const previewHeight = dims.height * previewScale;

  // Determine whether this content type benefits from a visual preview
  const isVisualContent = piece.content_type === "ad_copy" || piece.content_type === "social_post"
    || piece.content_type === "carousel" || piece.content_type === "story";

  let metadata: Record<string, unknown> | null = null;
  if (piece.generation_metadata) {
    try { metadata = JSON.parse(piece.generation_metadata); } catch { metadata = null; }
  }

  // Extract slide headlines from metadata for carousel format
  const slideHeadlines = metadata?.slide_headlines as string | undefined;

  return (
    <div className="max-w-5xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/content")}
        className="text-sm text-[#E5E1E4]/50 hover:text-[#dbc2ad] mb-4 flex items-center gap-1"
      >
        <span>&larr;</span> Back to Content Queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#E5E1E4]">
            {piece.title || "Untitled Content"}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/10 text-[#dbc2ad] border border-white/10">
              {typeLabel[piece.content_type] || piece.content_type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/10 text-[#dbc2ad] border border-white/10">
              {platformLabel[piece.platform] || piece.platform}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${funnelColors[piece.funnel_stage] || "bg-white/5 text-[#dbc2ad] border-white/10"}`}>
              {piece.funnel_stage.charAt(0).toUpperCase() + piece.funnel_stage.slice(1)}
            </span>
          </div>
        </div>
        <StatusBadge status={piece.status} />
      </div>

      {/* Main layout: visual preview + copy side by side */}
      <div className={`grid gap-6 mb-6 ${isVisualContent && showVisual ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
        {/* Visual Preview */}
        {isVisualContent && showVisual && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#dbc2ad]">Visual Preview</h3>
              <div className="flex items-center gap-2">
                {/* Video / Static toggle */}
                <div className="flex rounded-md border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setPreviewMode("video")}
                    className={`px-2.5 py-1 text-xs font-medium transition-all ${
                      previewMode === "video"
                        ? "bg-[#FF9500] text-[#2d1600]"
                        : "bg-[#201f21] text-[#E5E1E4]/50 hover:bg-white/5"
                    }`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => setPreviewMode("static")}
                    className={`px-2.5 py-1 text-xs font-medium transition-all ${
                      previewMode === "static"
                        ? "bg-[#FF9500] text-[#2d1600]"
                        : "bg-[#201f21] text-[#E5E1E4]/50 hover:bg-white/5"
                    }`}
                  >
                    Static
                  </button>
                </div>
                <button
                  onClick={() => setShowVisual(false)}
                  className="text-xs text-[#E5E1E4]/40 hover:text-[#dbc2ad]"
                >
                  Hide
                </button>
              </div>
            </div>

            {/* Style selectors — show video styles or static templates */}
            {previewMode === "video" ? (
              <div className="flex gap-2 mb-3 flex-wrap">
                {VIDEO_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVideoStyle(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      videoStyle === opt.value
                        ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                        : "bg-[#201f21] text-[#E5E1E4]/50 border-white/10 hover:border-white/10"
                    }`}
                    title={opt.description}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 mb-3 flex-wrap">
                {TEMPLATE_OPTIONS.slice(0, 6).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPreviewTemplate(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      previewTemplate === opt.value
                        ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                        : "bg-[#201f21] text-[#E5E1E4]/50 border-white/10 hover:border-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <select
                  value={previewTemplate}
                  onChange={(e) => setPreviewTemplate(e.target.value)}
                  className="px-2 py-1 rounded-md text-xs border border-white/10 bg-[#201f21] text-[#E5E1E4]/50"
                >
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Aspect ratio pills */}
            <div className="flex gap-2 mb-3">
              {(Object.keys(ASPECT_DIMENSIONS) as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setPreviewAspect(ratio)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    previewAspect === ratio
                      ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                      : "bg-[#201f21] text-[#E5E1E4]/50 border-white/10"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* The visual render — Video (primary) or Static (fallback) */}
            {previewMode === "video" ? (
              <VideoPreview
                headline={headline}
                body={bodyText}
                cta={ctaText}
                backgroundColor={bgColor}
                textColor={textColor}
                accentColor={accentColor}
                screenshotUrl={screenshotUrl}
                aspectRatio={previewAspect}
                videoStyle={videoStyle}
                previewWidth={previewWidth}
                brandFont={brandFont}
                slideHeadlines={slideHeadlines}
              />
            ) : (
              <div
                className="rounded-xl overflow-hidden shadow-lg border border-white/10"
                style={{ width: previewWidth, height: previewHeight }}
              >
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                  <TemplateRenderer
                    templateType={previewTemplate}
                    headline={headline}
                    body={bodyText}
                    cta={ctaText}
                    aspectRatio={previewAspect}
                    backgroundColor={bgColor}
                    textColor={textColor}
                    accentColor={accentColor}
                    screenshotUrl={screenshotUrl}
                  />
                </div>
              </div>
            )}

            {/* Brand color swatches if available */}
            {brandColors.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-[#E5E1E4]/40">Brand colors:</span>
                {brandColors.slice(0, 5).map((c, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // Quick way to cycle accent color
                    }}
                    className="w-5 h-5 rounded-full border border-white/10 shadow-sm"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copy column */}
        <div>
          {/* Show visual toggle if hidden */}
          {isVisualContent && !showVisual && (
            <button
              onClick={() => setShowVisual(true)}
              className="text-xs text-[#FF9500] hover:underline mb-3 block"
            >
              Show visual preview
            </button>
          )}

          {/* Hook callout */}
          {piece.hook && (
            <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-xs font-semibold text-[#FF9500] uppercase tracking-wide mb-1">Hook</p>
              <p className="text-sm font-medium text-[#FF9500]">{piece.hook}</p>
            </div>
          )}

          {/* Content body */}
          <div className="bg-[#201f21] rounded-xl border border-white/10 overflow-hidden mb-4">
            {editing ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#dbc2ad] mb-1">Body</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-white/10 text-[#dbc2ad] rounded-lg text-sm font-medium hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="prose prose-sm max-w-none text-[#E5E1E4] leading-relaxed whitespace-pre-wrap">
                  {piece.body}
                </div>
              </div>
            )}

            {/* CTA inside card */}
            {piece.cta && !editing && (
              <div className="border-t border-white/5 bg-white/5 px-6 py-3">
                <p className="text-xs font-semibold text-[#E5E1E4]/40 uppercase tracking-wide mb-1">Call to Action</p>
                <p className="text-sm font-medium text-[#E5E1E4]">{piece.cta}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          <button onClick={() => setError(null)} className="text-[#ffb4ab]/70 hover:text-[#ffb4ab] text-xs">Dismiss</button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6">
        {piece.status === "draft" && (
          <>
            <button
              onClick={() => handleStatusChange("approved")}
              className="px-4 py-2 bg-[#4ade80]/20 text-[#4ade80] rounded-lg text-sm font-medium hover:bg-[#4ade80]/30 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("rejected")}
              className="px-4 py-2 bg-[#201f21] text-[#ffb4ab] border border-[#ffb4ab]/20 rounded-lg text-sm font-medium hover:bg-[#ffb4ab]/10 transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {piece.status === "approved" && (
          <button
            onClick={() => handleStatusChange("draft")}
            className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Move to Draft
          </button>
        )}
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {isVisualContent && (
          <button
            onClick={handleGenerateImage}
            disabled={generatingImage}
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {generatingImage ? "Generating..." : "Generate Image"}
          </button>
        )}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Edit
          </button>
        )}
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#ffb4ab]">Delete this content?</span>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-[#ffb4ab]/20 text-white rounded text-xs font-medium hover:bg-[#ffb4ab]/30"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-[#E5E1E4]/50 text-xs font-medium hover:text-[#dbc2ad]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-[#ffb4ab] hover:text-[#ffb4ab] text-sm font-medium transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Generated Image */}
      {(piece.image_url || imageGenStatus) && (
        <div className="mb-6">
          {imageGenStatus?.status === "running" && (
            <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#FF9500]">Generating image... Claude is analyzing your brand and creating an ad visual.</p>
            </div>
          )}
          {imageGenStatus?.status === "failed" && (
            <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg px-4 py-3">
              <p className="text-sm text-[#ffb4ab]">Image generation failed: {imageGenStatus.error}</p>
            </div>
          )}
          {piece.image_url && (
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-sm">
              <img
                src={`${API_BASE}${piece.image_url}`}
                alt="Generated ad image"
                className="w-full max-w-lg"
              />
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-[#E5E1E4]/40">AI-generated ad image</span>
                <a
                  href={`${API_BASE}${piece.image_url}`}
                  download
                  className="text-xs text-[#FF9500] hover:underline"
                >
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generation info */}
      {metadata && (
        <div className="text-xs text-[#E5E1E4]/40 flex items-center gap-3">
          <span>
            Generated by {String(metadata.model || "AI").replace(/-\d+$/, "")}
          </span>
          <span>&middot;</span>
          <span>{piece.funnel_stage} stage</span>
          {metadata.output_tokens != null && (
            <>
              <span>&middot;</span>
              <span>{Number(metadata.output_tokens)} tokens</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: { bg: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20", dot: "bg-[#ffbd7f]" },
    approved: { bg: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20", dot: "bg-[#4ade80]" },
    posted: { bg: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20", dot: "bg-[#FF9500]" },
    rejected: { bg: "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20", dot: "bg-[#ffb4ab]" },
  };
  const c = config[status] || { bg: "bg-white/5 text-[#dbc2ad] border-white/10", dot: "bg-[#E5E1E4]/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
