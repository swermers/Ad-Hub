"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ContentPiece, type Product } from "@/lib/api";
import { TemplateRenderer } from "@/components/ad-templates/TemplateRenderer";
import type { AspectRatio } from "@/components/ad-templates/types";
import { buildColorSchemeFromSeed } from "@/components/ad-templates/colorUtils";

type ViewMode = "grid" | "list";

export default function ContentPage() {
  const [content, setContent] = useState<ContentPiece[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.listContent({
        product_id: filterProduct || undefined,
        status: filterStatus || undefined,
        content_type: filterType || undefined,
      }),
      api.listProducts(),
    ])
      .then(([c, p]) => {
        setContent(c);
        setProducts(p);
        const map: Record<string, Product> = {};
        for (const prod of p) map[prod.id] = prod;
        setProductMap(map);
        // Auto-expand all product folders on load
        const ids = new Set(c.map((piece) => piece.product_id));
        setExpandedFolders(ids);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterProduct, filterStatus, filterType]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await api.updateContentStatus(id, status);
      setContent((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const toggleFolder = (productId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  // Group content by product
  const grouped: Record<string, ContentPiece[]> = {};
  for (const piece of content) {
    if (!grouped[piece.product_id]) grouped[piece.product_id] = [];
    grouped[piece.product_id].push(piece);
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/10 rounded" />
          <div className="h-4 w-64 bg-white/5 rounded" />
        </div>
        <div className="h-10 w-32 bg-white/10 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-36 bg-white/5 rounded-lg" />
        <div className="h-10 w-36 bg-white/5 rounded-lg" />
      </div>
      {[1, 2].map(i => (
        <div key={i} className="glass-card-subtle rounded-xl p-5 space-y-3">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => <div key={j} className="aspect-square bg-white/5 rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Content Queue</h1>
          <p className="text-[#E5E1E4]/50 mt-1">
            Review and manage generated content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-[#FF9500] text-[#2d1600]"
                  : "bg-white/5 text-[#E5E1E4]/50 hover:bg-white/10"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-[#FF9500] text-[#2d1600]"
                  : "bg-white/5 text-[#E5E1E4]/50 hover:bg-white/10"
              }`}
            >
              List
            </button>
          </div>
          <Link
            href="/generate"
            className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90"
          >
            Generate More
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterProduct}
          onChange={(e) => {
            setFilterProduct(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
        >
          <option value="">All Types</option>
          <option value="social_post">Social Post</option>
          <option value="ad_copy">Ad Copy</option>
          <option value="carousel">Carousel</option>
          <option value="story">Story / Reel</option>
          <option value="email">Email</option>
          <option value="blog_draft">Blog Draft</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          <button onClick={() => setError(null)} className="text-[#ffb4ab]/60 hover:text-[#ffb4ab] text-xs">Dismiss</button>
        </div>
      )}

      {/* Content — grouped by product as folders */}
      {content.length === 0 ? (
        <div className="glass-card-subtle rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-[#E5E1E4]/50">No content yet</p>
          <p className="text-xs text-[#E5E1E4]/40 mt-1 mb-4">Generate your first batch of ad content to get started.</p>
          <Link
            href="/generate"
            className="inline-flex px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium hover:opacity-90"
          >
            Generate Content
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([productId, pieces]) => {
            const product = productMap[productId];
            const isExpanded = expandedFolders.has(productId);
            const draftCount = pieces.filter((p) => p.status === "draft").length;
            const approvedCount = pieces.filter((p) => p.status === "approved").length;

            return (
              <div key={productId} className="glass-card-subtle rounded-xl overflow-hidden">
                {/* Folder header */}
                <button
                  onClick={() => toggleFolder(productId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[#E5E1E4]/40 transition-transform"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                      &#9654;
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#E5E1E4]">
                        {product?.name || "Unknown Product"}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/40 mt-0.5">
                        {pieces.length} item{pieces.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {draftCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#ffbd7f]/10 text-[#ffbd7f] border border-[#ffbd7f]/20">
                        {draftCount} draft
                      </span>
                    )}
                    {approvedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                        {approvedCount} approved
                      </span>
                    )}
                  </div>
                </button>

                {/* Folder contents */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-5 py-4">
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pieces.map((piece) => (
                          <GridCard
                            key={piece.id}
                            piece={piece}
                            product={product}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pieces.map((piece) => (
                          <ListCard
                            key={piece.id}
                            piece={piece}
                            product={product}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Grid card — visual thumbnail with minimal text overlay */
function GridCard({
  piece,
  product,
  onStatusChange,
}: {
  piece: ContentPiece;
  product?: Product;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isVisual =
    piece.content_type === "ad_copy" || piece.content_type === "social_post"
    || piece.content_type === "carousel" || piece.content_type === "story";

  const { colorScheme, screenshotUrl } = useProductVisuals(product, piece.product_id);

  const rawHL = piece.hook || piece.title || piece.body.split("\n")[0];
  const headline = rawHL.length > 30 ? rawHL.slice(0, 27) + "..." : rawHL;
  const rawBody = piece.hook
    ? piece.body.replace(piece.hook, "").trim()
    : piece.body.split("\n").slice(1).join(" ").trim();
  const bodyText = rawBody.length > 60 ? rawBody.slice(0, 57) + "..." : rawBody;
  const ctaText = piece.cta || "Learn More";

  const templateType = piece.template_type || "bold_hook";
  const aspectRatio: AspectRatio =
    (piece.aspect_ratio as AspectRatio) || "1:1";

  const thumbSize = 240;

  return (
    <Link href={`/content/${piece.id}`} className="group block">
      <div className="rounded-lg overflow-hidden border border-white/5 hover:border-[#FF9500]/20 transition-all bg-[#201f21]">
        {/* Visual thumbnail */}
        {isVisual ? (
          <div style={{ width: "100%", aspectRatio: "1/1", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                transform: `scale(${thumbSize / 1080})`,
                transformOrigin: "top left",
                width: 1080,
                height: 1080,
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <TemplateRenderer
                templateType={templateType}
                headline={headline}
                body={bodyText}
                cta={ctaText}
                aspectRatio={aspectRatio}
                backgroundColor={colorScheme.backgroundColor}
                textColor={colorScheme.textColor}
                accentColor={colorScheme.accentColor}
                screenshotUrl={screenshotUrl}
              />
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center text-[#E5E1E4]/30"
            style={{ width: "100%", aspectRatio: "1/1" }}
          >
            <span className="text-4xl">T</span>
          </div>
        )}

        {/* Info strip */}
        <div className="px-3 py-2.5 bg-[#201f21]">
          <p className="text-xs font-medium text-[#E5E1E4] truncate group-hover:text-[#FF9500]">
            {piece.title || "Untitled"}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-[#E5E1E4]/40">
              {piece.platform} &middot; {piece.funnel_stage}
            </span>
            <StatusDot status={piece.status} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Compact list row */
function ListCard({
  piece,
  product,
  onStatusChange,
}: {
  piece: ContentPiece;
  product?: Product;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isVisual =
    piece.content_type === "ad_copy" || piece.content_type === "social_post"
    || piece.content_type === "carousel" || piece.content_type === "story";

  const { colorScheme, screenshotUrl } = useProductVisuals(product, piece.product_id);

  const rawHL = piece.hook || piece.title || piece.body.split("\n")[0];
  const headline = rawHL.length > 30 ? rawHL.slice(0, 27) + "..." : rawHL;
  const rawBody = piece.hook
    ? piece.body.replace(piece.hook, "").trim()
    : piece.body.split("\n").slice(1).join(" ").trim();
  const bodyText = rawBody.length > 60 ? rawBody.slice(0, 57) + "..." : rawBody;
  const ctaText = piece.cta || "Learn More";
  const templateType = piece.template_type || "bold_hook";
  const aspectRatio: AspectRatio = (piece.aspect_ratio as AspectRatio) || "1:1";
  const thumbSize = 80;

  const typeLabel: Record<string, string> = {
    social_post: "Social Post",
    ad_copy: "Ad Copy",
    carousel: "Carousel",
    story: "Story / Reel",
    email: "Email",
    blog_draft: "Blog Draft",
  };

  return (
    <div className="flex gap-3 items-center p-3 rounded-lg hover:bg-white/5 transition-colors">
      {/* Thumbnail */}
      {isVisual && (
        <Link href={`/content/${piece.id}`} className="flex-shrink-0">
          <div
            className="rounded-md overflow-hidden border border-white/5"
            style={{ width: thumbSize, height: thumbSize }}
          >
            <div
              style={{
                transform: `scale(${thumbSize / 1080})`,
                transformOrigin: "top left",
                width: 1080,
                height: 1080,
              }}
            >
              <TemplateRenderer
                templateType={templateType}
                headline={headline}
                body={bodyText}
                cta={ctaText}
                aspectRatio={aspectRatio}
                backgroundColor={colorScheme.backgroundColor}
                textColor={colorScheme.textColor}
                accentColor={colorScheme.accentColor}
                screenshotUrl={screenshotUrl}
              />
            </div>
          </div>
        </Link>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/content/${piece.id}`}>
          <p className="text-sm font-medium text-[#E5E1E4] hover:text-[#FF9500] truncate">
            {piece.title || "Untitled"}
          </p>
          <p className="text-xs text-[#E5E1E4]/50 mt-0.5">
            {typeLabel[piece.content_type] || piece.content_type} &middot;{" "}
            {piece.platform} &middot; {piece.funnel_stage}
          </p>
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={piece.status} />
        {piece.status === "draft" && (
          <button
            onClick={() => onStatusChange(piece.id, "approved")}
            className="px-2.5 py-1 bg-[#4ade80]/20 text-[#4ade80] rounded text-xs font-medium hover:bg-[#4ade80]/30"
          >
            Approve
          </button>
        )}
      </div>
    </div>
  );
}

/** Extract product visuals (colors + screenshot) — shared logic */
function useProductVisuals(product: Product | undefined, productId: string) {
  let brandColors: string[] = [];
  if (product?.brand_colors) {
    try { brandColors = JSON.parse(product.brand_colors); } catch { /* */ }
  }
  if (product?.brand_brief && brandColors.length === 0) {
    try {
      const brief = JSON.parse(product.brand_brief);
      brandColors = brief?.visual_identity?.primary_colors || [];
    } catch { /* */ }
  }

  const colorScheme = buildColorSchemeFromSeed(brandColors, productId);

  let screenshotUrl: string | undefined;
  if (product?.screenshots) {
    try {
      const shots = JSON.parse(product.screenshots);
      if (shots.length > 0) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        screenshotUrl = `${apiUrl}${shots[0]}`;
      }
    } catch { /* */ }
  }

  return { colorScheme, screenshotUrl, brandColors };
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: { bg: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20", dot: "bg-[#ffbd7f]" },
    approved: { bg: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20", dot: "bg-[#4ade80]" },
    posted: { bg: "bg-[#a4a7ff]/10 text-[#a4a7ff] border-[#a4a7ff]/20", dot: "bg-[#a4a7ff]" },
    rejected: { bg: "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20", dot: "bg-[#ffb4ab]" },
  };
  const c = config[status] || { bg: "bg-white/10 text-[#E5E1E4] border-white/10", dot: "bg-[#E5E1E4]/40" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-[#ffbd7f]",
    approved: "bg-[#4ade80]",
    posted: "bg-[#a4a7ff]",
    rejected: "bg-[#ffb4ab]",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[status] || "bg-[#E5E1E4]/40"}`}
      title={status}
    />
  );
}
