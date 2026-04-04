"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, API_BASE, type ContentPiece, type Product } from "@/lib/api";
import { TemplateRenderer } from "@/components/ad-templates/TemplateRenderer";
import type { AspectRatio } from "@/components/ad-templates/types";
import { buildColorSchemeFromSeed } from "@/components/ad-templates/colorUtils";

type ViewMode = "grid" | "list";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

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
        const ids = new Set(c.map((piece) => piece.product_id ?? "__ungrouped__"));
        setExpandedFolders(ids);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      })
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
    const key = piece.product_id ?? "__ungrouped__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(piece);
  }

  // Stats
  const totalCount = content.length;
  const draftTotal = content.filter((c) => c.status === "draft").length;
  const approvedTotal = content.filter((c) => c.status === "approved").length;
  const postedTotal = content.filter((c) => c.status === "posted").length;

  if (loading)
    return (
      <motion.div
        className="animate-pulse space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-between items-end">
          <div className="space-y-3">
            <div className="h-3 w-28 bg-[#FF9500]/20 rounded" />
            <div className="h-12 w-72 bg-[#E5E1E4]/10 rounded" />
            <div className="h-4 w-48 bg-[#E5E1E4]/5 rounded" />
          </div>
          <div className="h-10 w-32 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-24" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 space-y-3">
            <div className="h-5 w-40 bg-[#E5E1E4]/10 rounded" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="aspect-square bg-[#E5E1E4]/5 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    );

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
                Content Queue
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
              Content<span className="text-[#E5E1E4]/30">{" "}Pipeline.</span>
            </h1>
            <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
              SYS:CONTENT_QUEUE // {totalCount} items indexed // {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex rounded-xl border border-[#554334]/30 overflow-hidden backdrop-blur-xl">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-[#FF9500] text-[#2d1600]"
                    : "bg-[#1b1b1d]/60 text-[#E5E1E4]/50 hover:bg-[#1b1b1d]/80"
                }`}
              >
                Grid
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-[#FF9500] text-[#2d1600]"
                    : "bg-[#1b1b1d]/60 text-[#E5E1E4]/50 hover:bg-[#1b1b1d]/80"
                }`}
              >
                List
              </motion.button>
            </div>
            <Link href="/generate">
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold cursor-pointer"
              >
                Generate More
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Summary stat cards */}
      <motion.div {...fadeUp(0.08)} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Items" value={totalCount} color="#FF9500" delay={0} />
        <StatCard label="Drafts" value={draftTotal} color="#ffbd7f" delay={0.08} />
        <StatCard label="Approved" value={approvedTotal} color="#4ade80" delay={0.16} />
        <StatCard label="Posted" value={postedTotal} color="#a4a7ff" delay={0.24} />
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeUp(0.12)} className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterProduct}
          onChange={(e) => {
            setFilterProduct(e.target.value);
            setLoading(true);
          }}
          className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
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
          className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
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
          className="px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">All Types</option>
          <option value="social_post">Social Post</option>
          <option value="ad_copy">Ad Copy</option>
          <option value="video_ad">Video Ad</option>
          <option value="carousel">Carousel</option>
          <option value="story">Story / Reel</option>
          <option value="email">Email</option>
          <option value="blog_draft">Blog Draft</option>
        </select>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-prism rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 backdrop-blur-xl px-5 py-4 mb-6 flex items-center justify-between"
        >
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setError(null)}
            className="text-[#ffb4ab]/60 hover:text-[#ffb4ab] text-xs font-medium"
          >
            Dismiss
          </motion.button>
        </motion.div>
      )}

      {/* Content - grouped by product as folders */}
      {content.length === 0 ? (
        <motion.div
          {...fadeUp(0.16)}
          className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
        >
          <p className="text-sm font-semibold text-[#E5E1E4]/50">No content yet</p>
          <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-5">
            Generate your first batch of ad content to get started.
          </p>
          <Link href="/generate">
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold cursor-pointer"
            >
              Generate Content
            </motion.span>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([productId, pieces], idx) => {
            const product = productMap[productId];
            const isExpanded = expandedFolders.has(productId);
            const draftCount = pieces.filter((p) => p.status === "draft").length;
            const approvedCount = pieces.filter((p) => p.status === "approved").length;

            return (
              <motion.div
                key={productId}
                {...fadeUp(0.16 + idx * 0.06)}
                className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl overflow-hidden"
              >
                {/* Folder header */}
                <motion.button
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  onClick={() => toggleFolder(productId)}
                  className="w-full px-6 py-5 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="text-[#E5E1E4]/40 text-sm"
                    >
                      &#9654;
                    </motion.span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#E5E1E4]">
                        {product?.name || (productId === "__ungrouped__" ? "General Content" : "Unknown Product")}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/30 mt-0.5 font-mono">
                        {pieces.length} item{pieces.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {draftCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ffbd7f]/10 text-[#ffbd7f] border border-[#ffbd7f]/20">
                        {draftCount} draft
                      </span>
                    )}
                    {approvedCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                        {approvedCount} approved
                      </span>
                    )}
                  </div>
                </motion.button>

                {/* Folder contents */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border-t border-[#554334]/20 px-6 py-5"
                  >
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pieces.map((piece, pIdx) => (
                          <GridCard
                            key={piece.id}
                            piece={piece}
                            product={product}
                            onStatusChange={handleStatusChange}
                            delay={pIdx * 0.04}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pieces.map((piece, pIdx) => (
                          <ListCard
                            key={piece.id}
                            piece={piece}
                            product={product}
                            onStatusChange={handleStatusChange}
                            delay={pIdx * 0.04}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/** Animated stat card */
function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-[#E5E1E4] tracking-tight">{value}</p>
      <div className="mt-3 h-1 rounded-full bg-[#353437] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: value > 0 ? "100%" : "0%" }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/** Grid card - visual thumbnail with minimal text overlay */
function GridCard({
  piece,
  product,
  delay = 0,
}: {
  piece: ContentPiece;
  product?: Product;
  onStatusChange: (id: string, status: string) => void;
  delay?: number;
}) {
  const isVisual =
    piece.content_type === "ad_copy" ||
    piece.content_type === "social_post" ||
    piece.content_type === "video_ad" ||
    piece.content_type === "carousel" ||
    piece.content_type === "story";

  const { colorScheme, screenshotUrl } = useProductVisuals(product, piece.product_id);

  const rawHL = piece.hook || piece.title || piece.body.split("\n")[0] || "";
  const headline = rawHL.length > 30 ? rawHL.slice(0, 27) + "..." : rawHL;
  const rawBody = piece.hook
    ? piece.body.replace(piece.hook, "").trim()
    : piece.body.split("\n").slice(1).join(" ").trim();
  const bodyText = rawBody.length > 60 ? rawBody.slice(0, 57) + "..." : rawBody;
  const ctaText = piece.cta || "Learn More";

  const templateType = piece.template_type || "bold_hook";
  const aspectRatio: AspectRatio = (piece.aspect_ratio as AspectRatio) || "1:1";

  const thumbSize = 240;

  // Detect broken/empty content
  const hasContent = headline.trim().length > 0 || bodyText.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/content/${piece.id}`} className="group block">
        <motion.div
          whileHover={{ borderColor: "rgba(255,149,0,0.35)" }}
          className="glass-prism rounded-2xl overflow-hidden border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl transition-all"
        >
          {/* Visual thumbnail */}
          {isVisual && hasContent ? (
            <div
              style={{
                width: "100%",
                aspectRatio: "1/1",
                position: "relative",
                overflow: "hidden",
              }}
            >
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
              className="flex flex-col items-center justify-center text-[#E5E1E4]/20 bg-[#1b1b1d]/40 gap-2"
              style={{ width: "100%", aspectRatio: "1/1" }}
            >
              {isVisual && !hasContent ? (
                <>
                  <span className="text-2xl text-[#ffb4ab]/40">{"\u26A0"}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#ffb4ab]/40 font-medium">
                    Empty Content
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl">
                    {piece.content_type === "email" ? "\u2709" : piece.content_type === "blog_draft" ? "\u270E" : "\u25A1"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/30 font-medium">
                    {piece.content_type === "email" ? "Email" : piece.content_type === "blog_draft" ? "Blog Draft" : "Text Content"}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Info strip */}
          <div className="px-4 py-3 border-t border-[#554334]/20">
            <p className="text-xs font-semibold text-[#E5E1E4] truncate group-hover:text-[#FF9500] transition-colors">
              {piece.title || "Untitled"}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[#E5E1E4]/30 font-mono">
                {piece.platform} &middot; {piece.funnel_stage}
              </span>
              <StatusDot status={piece.status} />
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/** Compact list row */
function ListCard({
  piece,
  product,
  onStatusChange,
  delay = 0,
}: {
  piece: ContentPiece;
  product?: Product;
  onStatusChange: (id: string, status: string) => void;
  delay?: number;
}) {
  const isVisual =
    piece.content_type === "ad_copy" ||
    piece.content_type === "social_post" ||
    piece.content_type === "video_ad" ||
    piece.content_type === "carousel" ||
    piece.content_type === "story";

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
    video_ad: "Video Ad",
    carousel: "Carousel",
    story: "Story / Reel",
    email: "Email",
    blog_draft: "Blog Draft",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      className="flex gap-4 items-center p-4 rounded-xl transition-colors"
    >
      {/* Thumbnail */}
      {isVisual && (
        <Link href={`/content/${piece.id}`} className="flex-shrink-0">
          <div
            className="rounded-xl overflow-hidden border border-[#554334]/30"
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
          <p className="text-sm font-semibold text-[#E5E1E4] hover:text-[#FF9500] truncate transition-colors">
            {piece.title || "Untitled"}
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mt-0.5 font-mono">
            {typeLabel[piece.content_type] || piece.content_type} &middot;{" "}
            {piece.platform} &middot; {piece.funnel_stage}
          </p>
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={piece.status} />
        {piece.status === "draft" && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onStatusChange(piece.id, "approved")}
            className="px-3 py-1.5 bg-[#4ade80]/15 text-[#4ade80] rounded-lg text-xs font-semibold hover:bg-[#4ade80]/25 transition-colors border border-[#4ade80]/20"
          >
            Approve
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/** Extract product visuals (colors + screenshot) - shared logic */
function useProductVisuals(product: Product | undefined, productId: string | null) {
  let brandColors: string[] = [];
  if (product?.brand_colors) {
    try {
      brandColors = JSON.parse(product.brand_colors);
    } catch {
      /* */
    }
  }
  if (product?.brand_brief && brandColors.length === 0) {
    try {
      const brief = JSON.parse(product.brand_brief);
      brandColors = brief?.visual_identity?.primary_colors || [];
    } catch {
      /* */
    }
  }

  const colorScheme = buildColorSchemeFromSeed(brandColors, productId ?? "default");

  let screenshotUrl: string | undefined;
  if (product?.screenshots) {
    try {
      const shots = JSON.parse(product.screenshots);
      if (shots.length > 0) {
        screenshotUrl = `${API_BASE}${shots[0]}`;
      }
    } catch {
      /* */
    }
  }

  return { colorScheme, screenshotUrl, brandColors };
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: {
      bg: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20",
      dot: "bg-[#ffbd7f]",
    },
    approved: {
      bg: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20",
      dot: "bg-[#4ade80]",
    },
    posted: {
      bg: "bg-[#a4a7ff]/10 text-[#a4a7ff] border-[#a4a7ff]/20",
      dot: "bg-[#a4a7ff]",
    },
    rejected: {
      bg: "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20",
      dot: "bg-[#ffb4ab]",
    },
  };
  const c = config[status] || {
    bg: "bg-white/10 text-[#E5E1E4] border-white/10",
    dot: "bg-[#E5E1E4]/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-[#ffbd7f]",
    review: "bg-[#FF9500]",
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
