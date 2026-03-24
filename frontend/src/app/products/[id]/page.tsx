"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  API_BASE,
  type Product,
  type CrawledPage,
  type CrawlStatus,
} from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */
function BrandBriefDisplay({ data }: { data: Record<string, any> }) {
  const brief = data as any;

  return (
    <div className="space-y-6">
      {/* Value Proposition */}
      {brief.value_proposition && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#FF9500] mb-1">Value Proposition</h3>
          <p className="text-[#FF9500]">{brief.value_proposition}</p>
        </div>
      )}

      {/* Product Type Analysis */}
      {brief.product_type_analysis && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Product Analysis</h3>
          <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm">
            <div><span className="text-[#E5E1E4]/50">Category:</span> <span className="capitalize text-[#E5E1E4]">{brief.product_type_analysis.category}</span></div>
            <div><span className="text-[#E5E1E4]/50">Business Model:</span> <span className="text-[#E5E1E4]">{brief.product_type_analysis.business_model}</span></div>
            {brief.product_type_analysis.key_features_or_offerings && (
              <div>
                <span className="text-[#E5E1E4]/50">Key Features:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {brief.product_type_analysis.key_features_or_offerings.map((f: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-[#201f21] border border-white/10 rounded text-xs text-[#dbc2ad]">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand Voice */}
      {brief.brand_voice && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Brand Voice</h3>
          <div className="bg-white/5 rounded-lg p-4 space-y-3 text-sm">
            <div><span className="text-[#E5E1E4]/50">Tone:</span> <span className="text-[#E5E1E4]">{brief.brand_voice.tone}</span></div>
            <div><span className="text-[#E5E1E4]/50">Personality:</span> <span className="text-[#E5E1E4]">{brief.brand_voice.personality}</span></div>
            {brief.brand_voice.vocabulary && (
              <div>
                <span className="text-[#E5E1E4]/50">Key Vocabulary:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {brief.brand_voice.vocabulary.map((w: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 rounded-full text-xs">{w}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {brief.brand_voice.do && (
                <div>
                  <span className="text-[#4ade80] font-medium text-xs">DO</span>
                  <ul className="mt-1 space-y-1">
                    {brief.brand_voice.do.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#dbc2ad] flex gap-1.5"><span className="text-[#4ade80] shrink-0">+</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.brand_voice.dont && (
                <div>
                  <span className="text-[#ffb4ab] font-medium text-xs">DON&apos;T</span>
                  <ul className="mt-1 space-y-1">
                    {brief.brand_voice.dont.map((item: string, i: number) => (
                      <li key={i} className="text-xs text-[#dbc2ad] flex gap-1.5"><span className="text-[#ffb4ab] shrink-0">-</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visual Identity */}
      {brief.visual_identity && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Visual Identity</h3>
          <div className="bg-white/5 rounded-lg p-4 space-y-3 text-sm">
            {brief.visual_identity.primary_colors && (
              <div className="flex items-center gap-3">
                <span className="text-[#E5E1E4]/50">Colors:</span>
                {brief.visual_identity.primary_colors.map((c: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: c }} />
                    <span className="text-xs font-mono text-[#dbc2ad]">{c}</span>
                  </div>
                ))}
              </div>
            )}
            <div><span className="text-[#E5E1E4]/50">Style:</span> <span className="text-[#E5E1E4]">{brief.visual_identity.style}</span></div>
            {brief.visual_identity.imagery_recommendations && (
              <div>
                <span className="text-[#E5E1E4]/50">Imagery:</span>
                <ul className="mt-1 space-y-1">
                  {brief.visual_identity.imagery_recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-[#dbc2ad] ml-3">&#8226; {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audience Personas */}
      {brief.audience_personas && brief.audience_personas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Audience Personas</h3>
          <div className="grid gap-3">
            {brief.audience_personas.map((p: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 text-sm">
                <p className="font-medium text-[#E5E1E4] mb-1">{p.name}</p>
                <p className="text-[#dbc2ad] text-xs mb-2">{p.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  {p.pain_points && (
                    <div>
                      <span className="text-xs font-medium text-[#E5E1E4]/50">Pain Points</span>
                      <ul className="mt-1 space-y-0.5">
                        {p.pain_points.map((pp: string, j: number) => (
                          <li key={j} className="text-xs text-[#dbc2ad]">&#8226; {pp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.motivations && (
                    <div>
                      <span className="text-xs font-medium text-[#E5E1E4]/50">Motivations</span>
                      <ul className="mt-1 space-y-0.5">
                        {p.motivations.map((m: string, j: number) => (
                          <li key={j} className="text-xs text-[#dbc2ad]">&#8226; {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messaging Pillars */}
      {brief.messaging_pillars && brief.messaging_pillars.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Messaging Pillars</h3>
          <div className="space-y-3">
            {brief.messaging_pillars.map((p: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 text-sm">
                <p className="font-medium text-[#E5E1E4]">{p.pillar}</p>
                <p className="text-[#dbc2ad] text-xs mt-0.5 mb-2">{p.description}</p>
                {p.key_messages && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.key_messages.map((m: string, j: number) => (
                      <span key={j} className="px-2 py-1 bg-[#201f21] border border-white/10 rounded text-xs text-[#dbc2ad]">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Positioning */}
      {brief.competitive_positioning && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Competitive Positioning</h3>
          <p className="text-sm text-[#dbc2ad] bg-white/5 rounded-lg p-4">{brief.competitive_positioning}</p>
        </div>
      )}

      {/* Content Themes */}
      {brief.content_themes && brief.content_themes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Content Themes</h3>
          <div className="flex flex-wrap gap-2">
            {brief.content_themes.map((t: string, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-white/10 text-[#dbc2ad] rounded-full text-sm font-medium">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Ad Recommendations */}
      {brief.ad_recommendations && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E1E4] mb-2">Ad Recommendations</h3>
          <div className="grid grid-cols-3 gap-3">
            {brief.ad_recommendations.best_formats && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs font-medium text-[#E5E1E4]/50 mb-2">Best Formats</p>
                <ul className="space-y-1">
                  {brief.ad_recommendations.best_formats.map((f: string, i: number) => (
                    <li key={i} className="text-xs text-[#dbc2ad]">&#8226; {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {brief.ad_recommendations.key_angles && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs font-medium text-[#E5E1E4]/50 mb-2">Key Angles</p>
                <ul className="space-y-1">
                  {brief.ad_recommendations.key_angles.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-[#dbc2ad]">&#8226; {a}</li>
                  ))}
                </ul>
              </div>
            )}
            {brief.ad_recommendations.cta_suggestions && (
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs font-medium text-[#E5E1E4]/50 mb-2">CTA Suggestions</p>
                <ul className="space-y-1">
                  {brief.ad_recommendations.cta_suggestions.map((c: string, i: number) => (
                    <li key={i} className="text-xs text-[#dbc2ad]">&#8226; {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const PRODUCT_TYPES = [
  { value: "saas", label: "SaaS / Software" },
  { value: "physical", label: "Physical Product" },
  { value: "service", label: "Service Business" },
  { value: "other", label: "Other" },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    target_audience: "",
    pain_points: "",
    differentiators: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, pg] = await Promise.all([
        api.getProduct(id),
        api.listCrawledPages(id),
      ]);
      setProduct(p);
      setPages(pg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const crawlIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const crawlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
      if (crawlTimeoutRef.current) clearTimeout(crawlTimeoutRef.current);
    };
  }, []);

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlError(null);
    try {
      const status = await api.startCrawl(id);
      setCrawlStatus(status);

      let retries = 0;
      crawlIntervalRef.current = setInterval(async () => {
        try {
          const s = await api.getCrawlStatus(id, status.task_id);
          setCrawlStatus(s);
          retries = 0; // reset on success
          if (s.status === "completed" || s.status === "failed") {
            if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
            if (crawlTimeoutRef.current) clearTimeout(crawlTimeoutRef.current);
            setCrawling(false);
            if (s.status === "failed") {
              setCrawlError(s.error || "Crawl failed");
            }
            loadData();
          }
        } catch (err) {
          retries++;
          // Allow up to 3 retries before giving up
          if (retries >= 3) {
            if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
            if (crawlTimeoutRef.current) clearTimeout(crawlTimeoutRef.current);
            setCrawling(false);
            setCrawlError(err instanceof Error ? err.message : "Lost connection to crawl task. Please try again.");
          }
        }
      }, 2000);

      // 5-minute timeout as a safety net
      crawlTimeoutRef.current = setTimeout(() => {
        if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
        setCrawling(false);
        setCrawlError("Crawl timed out after 5 minutes. Check if your site is accessible.");
      }, 5 * 60 * 1000);
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : "Crawl failed to start");
      setCrawling(false);
    }
  };

  const briefIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const briefTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (briefIntervalRef.current) clearInterval(briefIntervalRef.current);
      if (briefTimeoutRef.current) clearTimeout(briefTimeoutRef.current);
    };
  }, []);

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    setBriefError(null);
    try {
      await api.generateBrief(id);
      let retries = 0;
      briefIntervalRef.current = setInterval(async () => {
        try {
          const p = await api.getProduct(id);
          setProduct(p);
          retries = 0;
          if (p.brand_brief) {
            if (briefIntervalRef.current) clearInterval(briefIntervalRef.current);
            if (briefTimeoutRef.current) clearTimeout(briefTimeoutRef.current);
            setGeneratingBrief(false);
          }
        } catch {
          retries++;
          if (retries >= 5) {
            if (briefIntervalRef.current) clearInterval(briefIntervalRef.current);
            if (briefTimeoutRef.current) clearTimeout(briefTimeoutRef.current);
            setGeneratingBrief(false);
            setBriefError("Lost connection while generating brief. The brief may still be processing — try refreshing the page in a minute.");
          }
        }
      }, 3000);
      // 3 minute timeout (brief generation can take a while with large sites)
      briefTimeoutRef.current = setTimeout(() => {
        if (briefIntervalRef.current) clearInterval(briefIntervalRef.current);
        setGeneratingBrief(false);
        setBriefError("Brief generation timed out. Try refreshing — it may still be processing in the background.");
      }, 3 * 60 * 1000);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Brief generation failed to start");
      setGeneratingBrief(false);
    }
  };

  const handleProductTypeChange = async (type: string) => {
    if (!product) return;
    const updated = await api.updateProduct(id, { product_type: type });
    setProduct(updated);
  };

  const startEditing = () => {
    if (!product) return;
    setEditForm({
      target_audience: product.target_audience || "",
      pain_points: product.pain_points || "",
      differentiators: product.differentiators || "",
    });
    setEditing(true);
  };

  const handleSaveDetails = async () => {
    const updated = await api.updateProduct(id, editForm);
    setProduct(updated);
    setEditing(false);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadScreenshot(id, file);
      }
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteScreenshot = async (path: string) => {
    try {
      await api.deleteScreenshot(id, path);
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingRef(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadReferenceImage(id, file);
      }
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingRef(false);
      if (refImageInputRef.current) refImageInputRef.current.value = "";
    }
  };

  const handleDeleteRefImage = async (path: string) => {
    try {
      await api.deleteReferenceImage(id, path);
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-[#E5E1E4]/50">Loading...</div>;
  if (!product) return <div className="text-[#ffb4ab]">Product not found</div>;

  let briefData: Record<string, unknown> | null = null;
  if (product.brand_brief) {
    try {
      briefData = JSON.parse(product.brand_brief);
    } catch {
      briefData = null;
    }
  }

  const screenshots: string[] = product.screenshots ? JSON.parse(product.screenshots) : [];
  const referenceImages: string[] = product.reference_images ? JSON.parse(product.reference_images) : [];
  const brandColors: string[] = product.brand_colors ? JSON.parse(product.brand_colors) : [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">{product.name}</h1>
          <p className="text-[#E5E1E4]/50 mt-1">{product.description}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/bulk-generate?product_id=${product.id}`}
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90"
          >
            Bulk Ads
          </Link>
          <Link
            href={`/generate?product_id=${product.id}`}
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90"
          >
            Generate Content
          </Link>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">
            Product Details
          </h2>
          {!editing ? (
            <button
              onClick={startEditing}
              className="px-3 py-1.5 text-sm font-medium text-[#FF9500] hover:bg-[#FF9500]/10 rounded-lg transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-sm font-medium text-[#E5E1E4]/50 hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                className="px-3 py-1.5 text-sm font-medium text-[#2d1600] bg-[#FF9500] hover:opacity-90 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#E5E1E4]/50">Website:</span>{" "}
            <span className="text-[#E5E1E4]">
              {product.website_url || "Not set"}
            </span>
          </div>
          <div>
            <span className="text-[#E5E1E4]/50">Status:</span>{" "}
            <span className="text-[#E5E1E4]">{product.status}</span>
          </div>
          <div className="col-span-2">
            <span className="text-[#E5E1E4]/50 block mb-2">Product Type:</span>
            <div className="flex gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleProductTypeChange(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    product.product_type === t.value
                      ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                      : "bg-[#201f21] text-[#dbc2ad] border-white/10 hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-[#E5E1E4]/50 block mb-1">Target Audience:</span>
            {editing ? (
              <textarea
                value={editForm.target_audience}
                onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm text-[#E5E1E4] focus:ring-1 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50"
                rows={2}
                placeholder="Who is this product for?"
              />
            ) : (
              <span className="text-[#E5E1E4]">{product.target_audience || "Not set"}</span>
            )}
          </div>
          <div className="col-span-2">
            <span className="text-[#E5E1E4]/50 block mb-1">Pain Points:</span>
            {editing ? (
              <textarea
                value={editForm.pain_points}
                onChange={(e) => setEditForm({ ...editForm, pain_points: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm text-[#E5E1E4] focus:ring-1 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50"
                rows={2}
                placeholder="What problems does this solve?"
              />
            ) : (
              <span className="text-[#E5E1E4]">{product.pain_points || "Not set"}</span>
            )}
          </div>
          <div className="col-span-2">
            <span className="text-[#E5E1E4]/50 block mb-1">Differentiators:</span>
            {editing ? (
              <textarea
                value={editForm.differentiators}
                onChange={(e) => setEditForm({ ...editForm, differentiators: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm text-[#E5E1E4] focus:ring-1 focus:ring-[#FF9500]/50 focus:border-[#FF9500]/50"
                rows={2}
                placeholder="What makes this different from alternatives?"
              />
            ) : (
              <span className="text-[#E5E1E4]">{product.differentiators || "Not set"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Screenshots Section */}
      <div className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">
            Screenshots & Visual Context
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleScreenshotUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Screenshots"}
            </button>
          </div>
        </div>
        <p className="text-sm text-[#E5E1E4]/50 mb-4">
          Upload screenshots of your product, website, or competitor ads. These help generate more accurate, brand-loyal ad copy.
        </p>

        {screenshots.length === 0 ? (
          <div className="text-center py-8 bg-white/5 rounded-lg">
            <p className="text-[#E5E1E4]/40 text-sm">No screenshots yet. Upload some or crawl your website to auto-capture.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {screenshots.map((path, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                <img
                  src={`${API_BASE}${path}`}
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={() => handleDeleteScreenshot(path)}
                  className="absolute top-2 right-2 w-6 h-6 bg-[#ffb4ab] text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference Images Section */}
      <div className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">
            Reference Images
          </h2>
          <div>
            <input
              ref={refImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleRefImageUpload}
              className="hidden"
            />
            <button
              onClick={() => refImageInputRef.current?.click()}
              disabled={uploadingRef}
              className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploadingRef ? "Uploading..." : "Upload References"}
            </button>
          </div>
        </div>
        <p className="text-sm text-[#E5E1E4]/50 mb-4">
          Upload inspiration images, competitor ads, or design references. AI will analyze these to match the visual style when generating images.
        </p>

        {referenceImages.length === 0 ? (
          <div className="text-center py-8 bg-white/5 rounded-lg">
            <p className="text-[#E5E1E4]/40 text-sm">No reference images yet. Upload designs you want your ads to look like.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {referenceImages.map((path, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                <img
                  src={`${API_BASE}${path}`}
                  alt={`Reference ${i + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={() => handleDeleteRefImage(path)}
                  className="absolute top-2 right-2 w-6 h-6 bg-[#ffb4ab] text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  x
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                  <span className="text-xs text-white/80">Style reference</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Colors */}
      {brandColors.length > 0 && (
        <div className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#E5E1E4] mb-4">
            Extracted Brand Colors
          </h2>
          <p className="text-sm text-[#E5E1E4]/50 mb-3">
            Colors detected from your website. These are used to style ad templates.
          </p>
          <div className="flex flex-wrap gap-3">
            {brandColors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-white/10 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono text-[#dbc2ad]">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crawl Section */}
      <div className="bg-[#201f21] rounded-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">
            Website Crawl
          </h2>
          <button
            onClick={handleCrawl}
            disabled={crawling || !product.website_url}
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {crawling ? "Crawling..." : "Crawl Website"}
          </button>
        </div>

        {crawlError && (
          <div className="mb-4 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg text-sm text-[#ffb4ab]">
            <p className="font-medium">Crawl failed</p>
            <p className="mt-1">{crawlError}</p>
            <button
              onClick={() => setCrawlError(null)}
              className="mt-2 text-xs text-[#ffb4ab] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {crawlStatus && crawling && (
          <div className="mb-4 p-3 bg-[#FF9500]/10 rounded-lg text-sm text-[#FF9500]">
            Status: {crawlStatus.status} | Pages crawled:{" "}
            {crawlStatus.pages_crawled}
          </div>
        )}

        {pages.length === 0 ? (
          <p className="text-[#E5E1E4]/50 text-sm">No pages crawled yet</p>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-3 border border-white/5 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#E5E1E4] truncate">
                    {page.title || page.url}
                  </p>
                  <p className="text-xs text-[#E5E1E4]/50 truncate">{page.url}</p>
                </div>
                <span className="px-2 py-1 bg-white/10 text-[#dbc2ad] rounded text-xs">
                  {page.page_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Brief Section */}
      <div className="bg-[#201f21] rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">Brand Brief</h2>
          <button
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {generatingBrief ? "Generating..." : "Generate Brief"}
          </button>
        </div>

        {briefError && (
          <div className="mb-4 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg text-sm text-[#ffb4ab]">
            <p className="font-medium">Brief generation issue</p>
            <p className="mt-1">{briefError}</p>
            <button
              onClick={() => setBriefError(null)}
              className="mt-2 text-xs text-[#ffb4ab] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!briefData ? (
          <p className="text-[#E5E1E4]/50 text-sm">
            No brand brief yet. Crawl your website first, then generate a brief.
          </p>
        ) : (
          <BrandBriefDisplay data={briefData} />
        )}
      </div>
    </div>
  );
}
