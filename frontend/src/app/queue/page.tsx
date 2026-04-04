"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ContentPiece, type Product } from "@/lib/api";

/* ─── animation helpers ─── */
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const cardVariant = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

/* ─── column config ─── */
interface ColumnDef {
  status: string;
  label: string;
  color: string;
  bgAccent: string;
  icon: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: "draft",
    label: "Draft",
    color: "#9ca3af",
    bgAccent: "rgba(156,163,175,0.12)",
    icon: "edit_note",
  },
  {
    status: "review",
    label: "In Review",
    color: "#FF9500",
    bgAccent: "rgba(255,149,0,0.12)",
    icon: "rate_review",
  },
  {
    status: "approved",
    label: "Approved",
    color: "#4ade80",
    bgAccent: "rgba(74,222,128,0.12)",
    icon: "check_circle",
  },
  {
    status: "posted",
    label: "Posted",
    color: "#818cf8",
    bgAccent: "rgba(129,140,248,0.12)",
    icon: "send",
  },
];

/* ─── relative time helper ─── */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ─── platform icon map ─── */
function platformIcon(platform: string): string {
  const map: Record<string, string> = {
    twitter: "tag",
    linkedin: "work",
    meta: "public",
    facebook: "public",
    instagram: "photo_camera",
    tiktok: "music_note",
    youtube: "play_circle",
    email: "mail",
  };
  return map[platform.toLowerCase()] || "language";
}

/* ─── main page ─── */
export default function QueuePage() {
  const router = useRouter();

  const [content, setContent] = useState<ContentPiece[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Snapshot for reverting failed status updates
  const contentSnap = useRef<ContentPiece[]>([]);

  /* ─── data fetching ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, prods] = await Promise.all([
        api.listContent({
          product_id: filterProduct || undefined,
          content_type: filterType || undefined,
        }),
        api.listProducts(),
      ]);
      setContent(items);
      setProducts(prods);
    } catch (err) {
      console.error("Failed to load queue data", err);
    } finally {
      setLoading(false);
    }
  }, [filterProduct, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── derived ─── */
  const contentTypes = Array.from(new Set(content.map((c) => c.content_type))).sort();
  const productMap: Record<string, Product> = {};
  for (const p of products) productMap[p.id] = p;

  const columnItems = (status: string) =>
    content.filter((c) => c.status === status);

  /* ─── drag & drop ─── */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
    contentSnap.current = [...content];
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingId(null);

    const id = e.dataTransfer.getData("text/plain");
    const piece = content.find((c) => c.id === id);
    if (!piece || piece.status === newStatus) return;

    // Optimistic update
    setContent((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    try {
      const updated = await api.updateContentStatus(id, newStatus);
      setContent((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
    } catch {
      // Revert on error (e.g. "review" status not supported)
      setContent(contentSnap.current);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  /* ─── selection ─── */
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  /* ─── batch actions ─── */
  const batchUpdateStatus = async (status: string) => {
    setBatchLoading(true);
    const ids = Array.from(selected);
    const snap = [...content];

    // Optimistic
    setContent((prev) =>
      prev.map((c) => (ids.includes(c.id) ? { ...c, status } : c))
    );
    setSelected(new Set());

    try {
      await Promise.allSettled(
        ids.map((id) => api.updateContentStatus(id, status))
      );
      // Refresh to get accurate server state
      const items = await api.listContent({
        product_id: filterProduct || undefined,
        content_type: filterType || undefined,
      });
      setContent(items);
    } catch {
      setContent(snap);
    } finally {
      setBatchLoading(false);
    }
  };

  /* ─── loading skeleton ─── */
  if (loading) {
    return (
      <motion.div
        className="animate-pulse space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="space-y-3">
          <div className="h-3 w-28 bg-[#FF9500]/20 rounded" />
          <div className="h-12 w-72 bg-[#E5E1E4]/10 rounded" />
          <div className="h-4 w-56 bg-[#E5E1E4]/5 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-44 bg-[#1b1b1d]/60 rounded-xl" />
          <div className="h-10 w-44 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              <div className="h-10 bg-[#1b1b1d]/60 rounded-xl" />
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-4 h-28"
                />
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" variants={stagger}>
      {/* ─── header ─── */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">
          Workflow
        </p>
        <h1 className="text-[#E5E1E4] text-4xl font-extrabold tracking-tight mb-1">
          Content Queue
        </h1>
        <p className="text-[#E5E1E4]/40 text-sm">
          Drag content through your workflow
        </p>
      </motion.div>

      {/* ─── filters ─── */}
      <motion.div {...fadeUp(0.1)} className="flex flex-wrap gap-3 mb-6">
        {/* Product filter */}
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="h-10 px-4 rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-[#E5E1E4] text-sm outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Content type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 px-4 rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-[#E5E1E4] text-sm outline-none focus:border-[#FF9500]/50 transition-colors"
        >
          <option value="">All Types</option>
          {contentTypes.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {selected.size > 0 && (
          <button
            onClick={clearSelection}
            className="ml-auto h-10 px-4 rounded-xl text-sm text-[#E5E1E4]/60 hover:text-[#E5E1E4] transition-colors"
          >
            Clear selection ({selected.size})
          </button>
        )}
      </motion.div>

      {/* ─── board ─── */}
      <motion.div {...fadeUp(0.2)} className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {COLUMNS.map((col) => {
          const items = columnItems(col.status);
          const isOver = dragOverCol === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex flex-col rounded-2xl transition-colors duration-200 ${
                isOver
                  ? "bg-[#E5E1E4]/[0.04] ring-2 ring-inset"
                  : "bg-transparent"
              }`}
              style={{
                ...(isOver
                  ? ({ "--tw-ring-color": col.color } as React.CSSProperties)
                  : {}),
              }}
            >
              {/* column header */}
              <div
                className="flex items-center gap-2 px-3 py-3 mb-2 rounded-xl"
                style={{ background: col.bgAccent }}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ color: col.color }}
                >
                  {col.icon}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
                <span
                  className="ml-auto text-xs font-bold rounded-full px-2 py-0.5"
                  style={{
                    background: col.bgAccent,
                    color: col.color,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* cards */}
              <div className="flex-1 space-y-2 px-1 pb-2 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {items.length === 0 && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-[#E5E1E4]/20"
                    >
                      <span className="material-symbols-outlined text-3xl mb-2">
                        inbox
                      </span>
                      <span className="text-xs">No items</span>
                    </motion.div>
                  )}

                  {items.map((piece, idx) => {
                    const isSelected = selected.has(piece.id);
                    const isDragging = draggingId === piece.id;

                    return (
                      <motion.div
                        key={piece.id}
                        variants={cardVariant}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{
                          duration: 0.35,
                          delay: idx * 0.04,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        layout
                        layoutId={piece.id}
                        draggable
                        onDragStart={(e) =>
                          handleDragStart(
                            e as unknown as React.DragEvent,
                            piece.id
                          )
                        }
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/content/${piece.id}`)}
                        className={`group glass-prism rounded-2xl border bg-[#1b1b1d]/60 backdrop-blur-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                          isSelected
                            ? "border-[#FF9500]/60 ring-1 ring-[#FF9500]/30"
                            : "border-[#554334]/30 hover:border-[#554334]/50"
                        } ${isDragging ? "opacity-40 scale-95" : "opacity-100"}`}
                      >
                        {/* top row: checkbox + title */}
                        <div className="flex items-start gap-2 mb-2.5">
                          <button
                            onClick={(e) => toggleSelect(piece.id, e)}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-all ${
                              isSelected
                                ? "bg-[#FF9500] border-[#FF9500]"
                                : "border-[#E5E1E4]/20 hover:border-[#E5E1E4]/40"
                            } flex items-center justify-center`}
                          >
                            {isSelected && (
                              <span className="material-symbols-outlined text-[10px] text-[#131315] font-bold">
                                check
                              </span>
                            )}
                          </button>
                          <h3 className="text-[#E5E1E4] text-sm font-medium leading-snug line-clamp-2 flex-1">
                            {piece.title ||
                              (piece.body
                                ? piece.body.slice(0, 40) +
                                  (piece.body.length > 40 ? "..." : "")
                                : "Untitled")}
                          </h3>
                        </div>

                        {/* badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#E5E1E4]/[0.06] text-[#E5E1E4]/60">
                            {piece.content_type.replace(/_/g, " ")}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#E5E1E4]/[0.06] text-[#E5E1E4]/60">
                            <span className="material-symbols-outlined text-[11px]">
                              {platformIcon(piece.platform)}
                            </span>
                            {piece.platform}
                          </span>
                        </div>

                        {/* footer: date */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#E5E1E4]/30">
                            {relativeTime(piece.created_at)}
                          </span>
                          {piece.product_id && productMap[piece.product_id] && (
                            <span className="text-[10px] text-[#E5E1E4]/20 truncate max-w-[80px]">
                              {productMap[piece.product_id].name}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* ─── floating batch action bar ─── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/90 backdrop-blur-xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-black/40">
              <span className="text-[#E5E1E4]/60 text-sm font-medium">
                {selected.size} selected
              </span>

              <div className="w-px h-6 bg-[#E5E1E4]/10" />

              <button
                disabled={batchLoading}
                onClick={() => batchUpdateStatus("review")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold bg-[#FF9500]/15 text-[#FF9500] hover:bg-[#FF9500]/25 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">
                  rate_review
                </span>
                Move to Review
              </button>

              <button
                disabled={batchLoading}
                onClick={() => batchUpdateStatus("approved")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold bg-[#4ade80]/15 text-[#4ade80] hover:bg-[#4ade80]/25 transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">
                  check_circle
                </span>
                Approve All
              </button>

              <div className="w-px h-6 bg-[#E5E1E4]/10" />

              <button
                onClick={clearSelection}
                className="text-[#E5E1E4]/40 hover:text-[#E5E1E4]/70 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
