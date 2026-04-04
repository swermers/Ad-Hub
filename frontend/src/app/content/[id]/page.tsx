"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Component } from "react";
import { useRef } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { api, API_BASE, type ContentPiece, type Product, type GenerateImageStatus, type VideoRenderStatus } from "@/lib/api";
import { TemplateRenderer, TEMPLATE_OPTIONS } from "@/components/ad-templates/TemplateRenderer";
import { StorytellingCarouselPreview } from "@/components/ad-templates/StorytellingCarouselPreview";
import dynamic from "next/dynamic";
import type { AspectRatio } from "@/components/ad-templates/types";
import { ASPECT_DIMENSIONS } from "@/components/ad-templates/types";

// Remotion components loaded dynamically - they crash with React 19 on static import
const VideoPreview = dynamic(
  () => import("@/components/ad-templates/remotion/VideoPreview").then((mod) => mod.VideoPreview),
  { ssr: false, loading: () => <div className="animate-pulse bg-white/5 rounded-xl" style={{ width: 400, height: 400 }} /> }
);

// These are type/config-only imports - safe to import at module level
let VIDEO_STYLE_OPTIONS: { value: string; label: string; description: string }[] = [];
let STYLE_CONFIG: Record<string, { component: React.ComponentType<unknown>; durationSeconds: number; forceAspect?: AspectRatio }> = {} as Record<string, never>;
let FPS = 30;
type VideoStyle = string;

// Load config values async (non-React, just data)
import("@/components/ad-templates/remotion/VideoPreview").then((mod) => {
  VIDEO_STYLE_OPTIONS = mod.VIDEO_STYLE_OPTIONS;
  STYLE_CONFIG = mod.STYLE_CONFIG as typeof STYLE_CONFIG;
  FPS = mod.FPS;
}).catch(() => { /* Remotion unavailable */ });
import { buildColorSchemeFromSeed } from "@/components/ad-templates/colorUtils";
import ContentEditor from "@/components/content-editors";

/** Tone presets that affect visual intensity */
const TONE_PRESETS = [
  { value: "bold", label: "Bold", desc: "High contrast, saturated accents" },
  { value: "neutral", label: "Neutral", desc: "Balanced, brand-true colors" },
  { value: "subtle", label: "Subtle", desc: "Muted, soft tones" },
  { value: "dark", label: "Dark", desc: "Deep backgrounds, glowing accents" },
  { value: "light", label: "Light", desc: "Light backgrounds, dark text" },
] as const;

type TonePreset = typeof TONE_PRESETS[number]["value"];

/** Apply tone modifier to a color scheme */
function applyTone(
  bg: string, text: string, accent: string, tone: TonePreset
): { bg: string; text: string; accent: string } {
  if (tone === "neutral") return { bg, text, accent };
  if (tone === "bold") {
    // Boost saturation of accent, darken bg
    return { bg: darkenHex(bg, 0.15), text, accent: saturateHex(accent, 0.2) };
  }
  if (tone === "subtle") {
    return { bg, text, accent: desaturateHex(accent, 0.3) };
  }
  if (tone === "dark") {
    return { bg: "#0a0a0c", text: "#ffffff", accent };
  }
  if (tone === "light") {
    return { bg: "#f5f3f0", text: "#1a1a1d", accent: darkenHex(accent, 0.1) };
  }
  return { bg, text, accent };
}

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${cl(r).toString(16).padStart(2,"0")}${cl(g).toString(16).padStart(2,"0")}${cl(b).toString(16).padStart(2,"0")}`;
}

function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function saturateHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, Math.min(1, s + amount), l);
  return rgbToHex(nr, ng, nb);
}

function desaturateHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, Math.max(0, s - amount), l);
  return rgbToHex(nr, ng, nb);
}

class ContentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMessage: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, errorMessage: error?.message || "Unknown error" }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ContentDetail error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-5xl p-8">
          <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-xl p-6 text-center">
            <p className="text-[#ffb4ab] font-medium mb-2">Something went wrong rendering this content.</p>
            <p className="text-[#ffb4ab]/60 text-xs font-mono mb-3">{this.state.errorMessage}</p>
            <button onClick={() => this.setState({ hasError: false, errorMessage: "" })} className="text-sm text-[#dbc2ad] underline">Try again</button>
            {" | "}
            <button onClick={() => window.history.back()} className="text-sm text-[#dbc2ad] underline">Go back</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class VideoErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.warn("Video preview unavailable:", error.message); }
  render() {
    if (this.state.hasError) return <>{this.props.fallback}</>;
    return this.props.children;
  }
}

/** Ensure ALL fields are plain serializable types (AI can return objects/arrays) */
function sanitizePiece(c: ContentPiece): ContentPiece {
  const str = (v: unknown): string =>
    typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
  const strOrNull = (v: unknown): string | null =>
    v == null ? null : str(v);
  return {
    ...c,
    body: str(c.body),
    title: strOrNull(c.title),
    hook: strOrNull(c.hook),
    cta: strOrNull(c.cta),
    content_type: str(c.content_type),
    platform: str(c.platform),
    funnel_stage: str(c.funnel_stage),
    status: str(c.status),
    template_type: strOrNull(c.template_type),
    aspect_ratio: strOrNull(c.aspect_ratio),
    generation_metadata: strOrNull(c.generation_metadata),
    image_url: strOrNull(c.image_url),
    media_type: strOrNull(c.media_type),
    video_style: strOrNull(c.video_style),
    video_config: strOrNull(c.video_config),
  };
}

/** Safely render any value as a React-safe string */
function safeText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return JSON.stringify(v);
}

export default function ContentDetailPage() {
  return <ContentErrorBoundary><ContentDetailInner /></ContentErrorBoundary>;
}

function ContentDetailInner() {
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
  const [exportingFrame, setExportingFrame] = useState(false);
  const frameExportRef = useRef<HTMLDivElement>(null);
  // Video render (MP4 export) state
  const [renderTaskId, setRenderTaskId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<"idle" | "pending" | "rendering" | "completed" | "failed">("idle");
  const [renderVideoUrl, setRenderVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderPollRef = useRef<NodeJS.Timeout | null>(null);
  // Inline refinement state
  const [refining, setRefining] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [refineSuccess, setRefineSuccess] = useState(false);
  // Color override state
  const [colorOverride, setColorOverride] = useState<{ bg?: string; text?: string; accent?: string }>({});
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [customColorInput, setCustomColorInput] = useState("");
  const [tone, setTone] = useState<TonePreset>("neutral");
  const [savingColors, setSavingColors] = useState(false);

  useEffect(() => {
    api
      .getContent(id)
      .then(async (raw) => {
        // Debug: log field types to diagnose React #310
        console.log("[ContentDetail] raw piece field types:", Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, `${typeof v}${v && typeof v === "object" ? ` (keys: ${Object.keys(v as object).join(",")})` : ""}`])
        ));
        const c = sanitizePiece(raw);
        setPiece(c);
        setEditBody(c.body);
        setEditTitle(c.title || "");
        // Use stored template/aspect if available
        if (!defaultsSet) {
          if (c.template_type) setPreviewTemplate(c.template_type);
          if (c.aspect_ratio && (c.aspect_ratio === "1:1" || c.aspect_ratio === "4:5" || c.aspect_ratio === "9:16")) {
            setPreviewAspect(c.aspect_ratio as AspectRatio);
          }
          // Auto-load video style from saved metadata
          if (c.video_style) {
            setVideoStyle(c.video_style as VideoStyle);
            setPreviewMode("video");
          }
          // Auto-load accent color from video config
          if (c.video_config) {
            try {
              const vc = typeof c.video_config === "string" ? JSON.parse(c.video_config) : c.video_config;
              if (vc.accent_color) setColorOverride((prev: { bg?: string; text?: string; accent?: string }) => ({ ...prev, accent: vc.accent_color }));
              if (vc.aspect_ratio) setPreviewAspect(vc.aspect_ratio as AspectRatio);
            } catch { /* ok */ }
          }
          // Auto-set video mode for video/carousel content
          if (c.media_type === "video" || c.media_type === "carousel") {
            setPreviewMode("video");
          }
          setDefaultsSet(true);
        }
        // Load product for brand colors + screenshots
        if (c.product_id) {
          try {
            const p = await api.getProduct(c.product_id);
            setProduct(p);
          } catch { /* ok */ }
        }
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
      setPiece(sanitizePiece(updated));
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
      setPiece(sanitizePiece(updated));
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

  // Pick colors for the visual preview using smart color scheme + overrides + tone
  const colorScheme = buildColorSchemeFromSeed(brandColors, piece.product_id ?? "default");
  const toned = applyTone(
    colorOverride.bg || colorScheme.backgroundColor,
    colorOverride.text || colorScheme.textColor,
    colorOverride.accent || colorScheme.accentColor,
    tone,
  );
  const bgColor = toned.bg;
  const accentColor = toned.accent;
  const textColor = toned.text;

  // Save brand colors back to product
  const handleSaveColors = useCallback(async (colors: string[]) => {
    if (!product) return;
    setSavingColors(true);
    try {
      await api.updateProduct(product.id, { brand_colors: JSON.stringify(colors) });
      setProduct({ ...product, brand_colors: JSON.stringify(colors) });
    } catch {
      setError("Failed to save brand colors");
    } finally {
      setSavingColors(false);
    }
  }, [product]);

  const handleAddCustomColor = () => {
    const c = customColorInput.trim();
    if (!c.match(/^#[0-9a-fA-F]{6}$/)) return;
    const updated = [...brandColors, c];
    handleSaveColors(updated);
    setCustomColorInput("");
  };

  const handleRemoveColor = (index: number) => {
    const updated = brandColors.filter((_, i) => i !== index);
    handleSaveColors(updated);
  };

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
    if (!piece || !piece.product_id) return;
    const productId = piece.product_id;
    setGeneratingImage(true);
    setImageGenStatus(null);
    try {
      const status = await api.generateImage(productId, {
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
          const updated = await api.getImageGenStatus(productId, status.task_id);
          setImageGenStatus(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            if (imageGenPollRef.current) clearInterval(imageGenPollRef.current);
            setGeneratingImage(false);
            if (updated.status === "completed") {
              const refreshed = await api.getContent(piece.id);
              setPiece(sanitizePiece(refreshed));
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

  const handleExportFrame = async () => {
    setExportingFrame(true);
    try {
      // Wait for the hidden thumbnail to render
      await new Promise((r) => setTimeout(r, 200));
      const el = frameExportRef.current;
      if (!el) throw new Error("Frame render element not found");
      const config = STYLE_CONFIG[videoStyle] || {};
      const effectiveAspect = config.forceAspect || previewAspect;
      const dims = ASPECT_DIMENSIONS[effectiveAspect];
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        width: dims.width,
        height: dims.height,
        pixelRatio: 1,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(piece.title || "ad-frame").replace(/\s+/g, "-").toLowerCase()}-${videoStyle}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Frame export failed");
    } finally {
      setExportingFrame(false);
    }
  };

  // ─── Video Render (MP4 Export) ─────────────────────────────────────────
  const handleRenderVideo = async () => {
    if (!piece) return;
    setRenderStatus("pending");
    setRenderError(null);
    setRenderVideoUrl(null);

    try {
      const result = await api.renderFromContent(piece.id, {
        video_style: videoStyle,
        aspect_ratio: previewAspect,
      });
      setRenderTaskId(result.task_id);

      // Start polling for render completion
      const poll = setInterval(async () => {
        try {
          const status = await api.getRenderStatus(result.task_id);
          setRenderStatus(status.status);

          if (status.status === "completed" && status.video_url) {
            clearInterval(poll);
            renderPollRef.current = null;
            setRenderVideoUrl(status.video_url);
          } else if (status.status === "failed") {
            clearInterval(poll);
            renderPollRef.current = null;
            setRenderError(status.error || "Render failed");
          }
        } catch {
          clearInterval(poll);
          renderPollRef.current = null;
          setRenderStatus("failed");
          setRenderError("Lost connection to render server");
        }
      }, 2000);
      renderPollRef.current = poll;
    } catch (err) {
      setRenderStatus("failed");
      setRenderError(err instanceof Error ? err.message : "Failed to start render");
    }
  };

  // Cleanup render poll on unmount
  useEffect(() => {
    return () => {
      if (renderPollRef.current) clearInterval(renderPollRef.current);
    };
  }, []);

  const handleRefine = async () => {
    if (!piece) return;
    setRefining(true);
    setError(null);
    try {
      const result = await api.pipelineRefine({
        content_id: piece.id,
        instructions: refineInstructions || undefined,
      });
      // Update the piece with refined content
      const updated = await api.updateContent(piece.id, {
        title: result.title,
        body: result.body,
        hook: result.hook ?? undefined,
        cta: result.cta ?? undefined,
      });
      setPiece(sanitizePiece(updated));
      setEditBody(result.body);
      setEditTitle(result.title);
      setRefineOpen(false);
      setRefineInstructions("");
      setRefineSuccess(true);
      setTimeout(() => setRefineSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
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
    video_ad: "Video Ad",
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
    || piece.content_type === "carousel" || piece.content_type === "story" || piece.content_type === "video_ad";

  let metadata: Record<string, unknown> | null = null;
  if (piece.generation_metadata) {
    try {
      const parsed = JSON.parse(piece.generation_metadata);
      // Flatten any nested objects to strings so they're safe to render
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, val] of Object.entries(parsed)) {
          if (val != null && typeof val === "object") {
            (parsed as Record<string, unknown>)[key] = JSON.stringify(val);
          }
        }
        metadata = parsed;
      }
    } catch { metadata = null; }
  }

  // Extract slide headlines from metadata for carousel format
  const slideHeadlines = typeof metadata?.slide_headlines === "string" ? metadata.slide_headlines : undefined;

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
              <VideoErrorBoundary fallback={
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
                      imageUrl={piece.image_url ? `${API_BASE}${piece.image_url}` : undefined}
                    />
                  </div>
                </div>
              }>
                <VideoPreview
                  headline={headline}
                  body={bodyText}
                  cta={ctaText}
                  backgroundColor={bgColor}
                  textColor={textColor}
                  accentColor={accentColor}
                  screenshotUrl={screenshotUrl}
                  aspectRatio={previewAspect}
                  videoStyle={videoStyle as never}
                  previewWidth={previewWidth}
                  brandFont={brandFont}
                  slideHeadlines={slideHeadlines}
                />
              </VideoErrorBoundary>
            ) : previewTemplate === "storytelling_carousel" ? (
              /* Interactive storytelling carousel preview */
              <div style={{ width: previewWidth }}>
                <StorytellingCarouselPreview
                  headline={piece.hook || piece.title || headline}
                  body={piece.body}
                  cta={ctaText}
                  backgroundColor={bgColor}
                  textColor={textColor}
                  accentColor={accentColor}
                  imageUrl={piece.image_url ? `${API_BASE}${piece.image_url}` : undefined}
                  aspectRatio={previewAspect}
                  previewScale={previewScale}
                />
              </div>
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
                    imageUrl={piece.image_url ? `${API_BASE}${piece.image_url}` : undefined}
                  />
                </div>
              </div>
            )}

            {/* Color controls */}
            <div className="mt-3 space-y-2">
              {/* Brand color swatches — click to set as accent */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#E5E1E4]/40">Brand colors:</span>
                {brandColors.map((c, i) => (
                  <div key={i} className="relative group">
                    <button
                      onClick={() => setColorOverride((prev) => ({ ...prev, accent: c }))}
                      className={`w-6 h-6 rounded-full border-2 shadow-sm transition-all ${
                        colorOverride.accent === c
                          ? "border-[#FF9500] scale-110"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Use ${c} as accent`}
                    />
                    <button
                      onClick={() => handleRemoveColor(i)}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ffb4ab] text-[#2d1600] text-[8px] font-bold hidden group-hover:flex items-center justify-center leading-none"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {brandColors.length === 0 && (
                  <span className="text-xs text-[#E5E1E4]/30 italic">No colors extracted</span>
                )}
                <button
                  onClick={() => setShowColorPanel(!showColorPanel)}
                  className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center text-xs transition-all ${
                    showColorPanel
                      ? "border-[#FF9500] text-[#FF9500]"
                      : "border-white/20 text-[#E5E1E4]/40 hover:border-white/40"
                  }`}
                  title="Edit colors"
                >
                  +
                </button>
              </div>

              {/* Expanded color editor panel */}
              {showColorPanel && (
                <div className="bg-[#1b1b1d] border border-white/10 rounded-lg p-3 space-y-3">
                  {/* Add custom color */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColorInput || "#FF9500"}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      placeholder="#FF9500"
                      className="flex-1 px-2 py-1 bg-[#201f21] border border-white/10 rounded text-xs text-[#E5E1E4] font-mono placeholder:text-[#E5E1E4]/20"
                    />
                    <button
                      onClick={handleAddCustomColor}
                      disabled={savingColors || !customColorInput.match(/^#[0-9a-fA-F]{6}$/)}
                      className="px-2.5 py-1 bg-[#FF9500] text-[#2d1600] rounded text-xs font-medium disabled:opacity-40"
                    >
                      {savingColors ? "..." : "Add"}
                    </button>
                  </div>

                  {/* Override individual channels */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Background</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={colorOverride.bg || bgColor}
                          onChange={(e) => setColorOverride((prev) => ({ ...prev, bg: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-[#E5E1E4]/40">{colorOverride.bg || bgColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Accent</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={colorOverride.accent || accentColor}
                          onChange={(e) => setColorOverride((prev) => ({ ...prev, accent: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-[#E5E1E4]/40">{colorOverride.accent || accentColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1 block">Text</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={colorOverride.text || textColor}
                          onChange={(e) => setColorOverride((prev) => ({ ...prev, text: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[10px] font-mono text-[#E5E1E4]/40">{colorOverride.text || textColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reset button */}
                  {(colorOverride.bg || colorOverride.text || colorOverride.accent) && (
                    <button
                      onClick={() => setColorOverride({})}
                      className="text-xs text-[#ffb4ab] hover:underline"
                    >
                      Reset to auto
                    </button>
                  )}
                </div>
              )}

              {/* Tone selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#E5E1E4]/40 mr-1">Tone:</span>
                {TONE_PRESETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                      tone === t.value
                        ? "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30"
                        : "bg-transparent text-[#E5E1E4]/40 border-white/5 hover:border-white/15"
                    }`}
                    title={t.desc}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
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

          {/* Format-aware editor for content types with structured metadata */}
          {metadata && (metadata.tweets || metadata.blocks || metadata.source || metadata.template_used) ? (
            <div className="bg-[#201f21] rounded-xl border border-white/10 overflow-hidden mb-4 p-5">
              <ContentEditor
                contentType={piece.content_type}
                platform={piece.platform}
                body={piece.body}
                title={piece.title || ""}
                hook={piece.hook}
                cta={piece.cta}
                metadata={metadata as Record<string, unknown>}
                onChange={async (updates) => {
                  const newBody = (updates.body as string) ?? piece.body;
                  const newTitle = (updates.title as string) ?? piece.title;
                  const newHook = (updates.hook as string) ?? piece.hook;
                  const newCta = (updates.cta as string) ?? piece.cta;
                  const newMeta = (updates.metadata as Record<string, unknown>) ?? metadata;
                  try {
                    const updated = await api.updateContent(piece.id, {
                      title: newTitle,
                      body: newBody,
                      hook: newHook,
                      cta: newCta,
                      generation_metadata: JSON.stringify(newMeta),
                    });
                    setPiece(sanitizePiece(updated));
                    setEditBody(newBody);
                    setEditTitle(newTitle || "");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to save");
                  }
                }}
                disabled={false}
              />
            </div>
          ) : (
            <>
              {/* Hook callout (legacy editor) */}
              {piece.hook && !editing && (
                <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs font-semibold text-[#FF9500] uppercase tracking-wide mb-1">Hook</p>
                  <p className="text-sm font-medium text-[#FF9500]">{piece.hook}</p>
                </div>
              )}

              {/* Content body (legacy textarea editor for ad copy etc.) */}
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
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          <button onClick={() => setError(null)} className="text-[#ffb4ab]/70 hover:text-[#ffb4ab] text-xs">Dismiss</button>
        </div>
      )}

      {/* Refine success toast */}
      {refineSuccess && (
        <div className="bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#4ade80] text-lg">check_circle</span>
          <p className="text-sm text-[#4ade80]">Content refined successfully. Changes saved.</p>
          <button onClick={() => setRefineSuccess(false)} className="ml-auto text-[#4ade80]/70 hover:text-[#4ade80] text-xs">Dismiss</button>
        </div>
      )}

      {/* Actions — primary row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {piece.status === "draft" && (
          <>
            <button
              onClick={() => handleStatusChange("review")}
              className="px-4 py-2 bg-[#FF9500]/20 text-[#FF9500] rounded-lg text-sm font-medium hover:bg-[#FF9500]/30 transition-colors"
            >
              Submit for Review
            </button>
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
        {piece.status === "review" && (
          <>
            <button
              onClick={() => handleStatusChange("approved")}
              className="px-4 py-2 bg-[#4ade80]/20 text-[#4ade80] rounded-lg text-sm font-medium hover:bg-[#4ade80]/30 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("draft")}
              className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Back to Draft
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
        {isVisualContent && (
          <button
            onClick={handleExportFrame}
            disabled={exportingFrame}
            className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            {exportingFrame ? "Exporting..." : "Export PNG"}
          </button>
        )}
        {isVisualContent && previewMode === "video" && (
          renderStatus === "completed" && renderVideoUrl ? (
            <a
              href={`${API_BASE}${renderVideoUrl}`}
              download
              className="px-4 py-2 bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 rounded-lg text-sm font-medium hover:bg-[#4ade80]/20 transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-rounded text-sm">download</span>
              Download MP4
            </a>
          ) : (
            <button
              onClick={handleRenderVideo}
              disabled={renderStatus === "pending" || renderStatus === "rendering"}
              className="px-4 py-2 bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 rounded-lg text-sm font-medium hover:bg-[#FF9500]/20 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-rounded text-sm">movie</span>
              {renderStatus === "pending" ? "Starting..." : renderStatus === "rendering" ? "Rendering..." : "Export MP4"}
            </button>
          )
        )}
        {renderStatus === "failed" && renderError && (
          <span className="text-xs text-[#ffb4ab]">{renderError}</span>
        )}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Edit
          </button>
        )}
        {/* Refine with AI */}
        <button
          onClick={() => setRefineOpen(!refineOpen)}
          disabled={refining}
          className="px-4 py-2 bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 rounded-lg text-sm font-medium hover:bg-[#FF9500]/20 disabled:opacity-50 transition-colors"
        >
          {refining ? "Refining..." : "Refine with AI"}
        </button>
        {/* Re-generate variation */}
        <button
          onClick={() => router.push(piece.product_id ? `/generate?product_id=${piece.product_id}` : "/generate")}
          className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
        >
          Re-generate
        </button>
        {/* Download copy as text */}
        <button
          onClick={() => {
            const text = [
              piece.title && `Title: ${piece.title}`,
              piece.hook && `Hook: ${piece.hook}`,
              "",
              piece.body,
              "",
              piece.cta && `CTA: ${piece.cta}`,
            ].filter(Boolean).join("\n");
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(piece.title || "ad-copy").replace(/\s+/g, "-").toLowerCase()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
        >
          Download
        </button>
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

      {/* Refine with AI Panel */}
      {refineOpen && (
        <div className="bg-[#1b1b1d] border border-[#FF9500]/20 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#FF9500] text-lg">auto_fix_high</span>
            <h4 className="text-sm font-semibold text-[#E5E1E4]">Refine with AI</h4>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Make it shorter", value: "Make it shorter and more concise" },
              { label: "More professional", value: "Use a more professional, authoritative tone" },
              { label: "More casual", value: "Make it more conversational and casual" },
              { label: "Stronger hook", value: "Improve the opening hook to be more attention-grabbing" },
              { label: "Better CTA", value: "Make the call to action more compelling" },
              { label: "Add urgency", value: "Add a sense of urgency without being pushy" },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setRefineInstructions(preset.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  refineInstructions === preset.value
                    ? "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30"
                    : "bg-[#201f21] text-[#E5E1E4]/50 border-white/10 hover:border-white/20"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            value={refineInstructions}
            onChange={(e) => setRefineInstructions(e.target.value)}
            placeholder="Describe how you'd like to refine this content..."
            rows={2}
            className="w-full bg-[#131315]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 resize-none transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRefine}
              disabled={refining}
              className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {refining ? "Refining..." : "Refine"}
            </button>
            <button
              onClick={() => { setRefineOpen(false); setRefineInstructions(""); }}
              className="px-4 py-2 bg-[#201f21] text-[#E5E1E4]/50 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Production info strip */}
      <div className="flex items-center gap-3 mb-6 text-[10px] text-[#E5E1E4]/30 font-mono flex-wrap">
        <span>BG:{bgColor}</span>
        <span>ACCENT:{accentColor}</span>
        <span>TEXT:{textColor}</span>
        {tone !== "neutral" && <span>TONE:{tone.toUpperCase()}</span>}
        <span>RATIO:{previewAspect}</span>
        <span>STYLE:{previewMode === "video" ? videoStyle : previewTemplate}</span>
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
      {/* Hidden full-resolution frame for PNG export — always use static template */}
      {isVisualContent && exportingFrame && (
        <div
          ref={frameExportRef}
          style={{ position: "absolute", left: "-9999px", top: 0 }}
        >
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
              imageUrl={piece.image_url ? `${API_BASE}${piece.image_url}` : undefined}
            />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: { bg: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20", dot: "bg-[#ffbd7f]" },
    review: { bg: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20", dot: "bg-[#FF9500]" },
    approved: { bg: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20", dot: "bg-[#4ade80]" },
    posted: { bg: "bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20", dot: "bg-[#818cf8]" },
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
