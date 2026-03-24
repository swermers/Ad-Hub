"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  api,
  ScheduledPost,
  Product,
  ContentPiece,
  PlatformConnection,
} from "@/lib/api";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const selectClass =
  "px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors";

const inputClass =
  "w-full px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-colors";

export default function SchedulePage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");

  // Form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [contentId, setContentId] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus, filterPlatform]);

  async function loadData() {
    setLoading(true);
    try {
      const [scheduleRes, prods] = await Promise.all([
        api.listScheduledPosts({
          status: filterStatus || undefined,
          platform: filterPlatform || undefined,
        }),
        api.listProducts(),
      ]);
      setPosts(scheduleRes.items);
      setProducts(prods);
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProductSelect(prodId: string) {
    setSelectedProduct(prodId);
    if (!prodId) {
      setContentPieces([]);
      setConnections([]);
      return;
    }
    try {
      const [pieces, conns] = await Promise.all([
        api.listContent({ product_id: prodId, status: "approved" }),
        api.listConnections(prodId),
      ]);
      setContentPieces(pieces);
      setConnections(conns);
    } catch (err) {
      console.error("Failed to load product data:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createScheduledPost({
        content_id: contentId,
        connection_id: connectionId,
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      setShowForm(false);
      setContentId("");
      setConnectionId("");
      setScheduledAt("");
      await loadData();
    } catch (err) {
      console.error("Failed to schedule:", err);
      alert("Failed to schedule post");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this scheduled post?")) return;
    try {
      await api.cancelScheduledPost(id);
      await loadData();
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  }

  async function handlePostNow(id: string) {
    if (!confirm("Post this immediately?")) return;
    try {
      await api.postNow(id);
      await loadData();
    } catch (err) {
      console.error("Failed to post:", err);
    }
  }

  // Stats
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const postingCount = posts.filter((p) => p.status === "posting").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

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
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-24"
            />
          ))}
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
          <div className="h-10 w-36 bg-[#1b1b1d]/60 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 h-20"
            />
          ))}
        </div>
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
                Publishing Queue
              </p>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
              </span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4]">
              Schedule<span className="text-[#E5E1E4]/30">{" "}Pipeline.</span>
            </h1>
            <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
              SYS:SCHEDULE_QUEUE // {posts.length} posts indexed //{" "}
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/10 hover:shadow-[#FF9500]/25 transition-shadow"
          >
            {showForm ? "Cancel" : "Schedule Post"}
          </motion.button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        {...fadeUp(0.08)}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <StatCard label="Scheduled" value={scheduledCount} color="#FF9500" delay={0} />
        <StatCard label="Posting" value={postingCount} color="#ffbd7f" delay={0.08} />
        <StatCard label="Posted" value={postedCount} color="#4ade80" delay={0.16} />
        <StatCard label="Failed" value={failedCount} color="#ffb4ab" delay={0.24} />
      </motion.div>

      {/* Schedule Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -16, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 mb-8 space-y-5 overflow-hidden"
          >
            <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em]">
              New Scheduled Post
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
                Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => handleProductSelect(e.target.value)}
                required
                className={selectClass + " w-full"}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {selectedProduct && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
                        Content (approved only)
                      </label>
                      <select
                        value={contentId}
                        onChange={(e) => setContentId(e.target.value)}
                        required
                        className={selectClass + " w-full"}
                      >
                        <option value="">Select content...</option>
                        {contentPieces.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title || c.body.slice(0, 60)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
                        Platform Connection
                      </label>
                      <select
                        value={connectionId}
                        onChange={(e) => setConnectionId(e.target.value)}
                        required
                        className={selectClass + " w-full"}
                      >
                        <option value="">Select connection...</option>
                        {connections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.platform} —{" "}
                            {c.platform_account_name || c.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40 mb-2">
                      Schedule For
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <motion.button
                      type="submit"
                      disabled={saving}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-6 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/10 hover:shadow-[#FF9500]/25 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Scheduling..." : "Schedule"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div {...fadeUp(0.12)} className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="posting">Posting</option>
          <option value="posted">Posted</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className={selectClass}
        >
          <option value="">All Platforms</option>
          <option value="twitter">Twitter</option>
          <option value="meta">Meta</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </motion.div>

      {/* Empty State */}
      {posts.length === 0 ? (
        <motion.div
          {...fadeUp(0.16)}
          className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-16 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF9500]/10 border border-[#FF9500]/20 mb-5"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF9500"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="10" y1="14" x2="14" y2="14" />
              <line x1="12" y1="12" x2="12" y2="16" />
            </svg>
          </motion.div>
          <p className="text-sm font-semibold text-[#E5E1E4]/50">
            No scheduled posts yet
          </p>
          <p className="text-xs text-[#E5E1E4]/30 mt-1.5 mb-6 max-w-sm mx-auto">
            Schedule content to be published on your connected platforms. Create
            approved content first, then queue it here.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="inline-flex px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold shadow-lg shadow-[#FF9500]/10 hover:shadow-[#FF9500]/25 transition-shadow"
          >
            Schedule Your First Post
          </motion.button>
        </motion.div>
      ) : (
        <motion.div {...fadeUp(0.16)} className="space-y-3">
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.18 + idx * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ borderColor: "rgba(255,149,0,0.25)" }}
              className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 transition-all group"
            >
              <div className="flex items-center gap-5">
                {/* Platform icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#353437]/50 flex items-center justify-center">
                  <PlatformIcon platform={post.platform ?? undefined} />
                </div>

                {/* Content info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#E5E1E4] truncate group-hover:text-[#FF9500] transition-colors">
                    {post.content_title || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {post.content_body_preview && (
                      <p className="text-xs text-[#E5E1E4]/30 truncate max-w-xs font-mono">
                        {post.content_body_preview}
                      </p>
                    )}
                  </div>
                </div>

                {/* Platform + account */}
                <div className="hidden md:block flex-shrink-0 text-right">
                  <p className="text-xs font-semibold text-[#E5E1E4]/60 capitalize">
                    {post.platform || "—"}
                  </p>
                  {post.platform_account_name && (
                    <p className="text-[10px] text-[#E5E1E4]/30 font-mono mt-0.5">
                      {post.platform_account_name}
                    </p>
                  )}
                </div>

                {/* Schedule time */}
                <div className="hidden md:block flex-shrink-0 text-right min-w-[140px]">
                  <p className="text-xs font-medium text-[#dbc2ad]">
                    {new Date(post.scheduled_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[10px] text-[#E5E1E4]/30 font-mono mt-0.5">
                    {new Date(post.scheduled_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <StatusBadge status={post.status} />
                  {post.error && (
                    <p className="text-[10px] text-[#ffb4ab] mt-1 max-w-[160px] truncate">
                      {post.error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.status !== "posted" && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePostNow(post.id)}
                        className="px-3 py-1.5 bg-[#FF9500]/10 text-[#FF9500] rounded-lg text-xs font-semibold hover:bg-[#FF9500]/20 transition-colors border border-[#FF9500]/20"
                      >
                        Post Now
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCancel(post.id)}
                        className="px-3 py-1.5 bg-[#ffb4ab]/10 text-[#ffb4ab] rounded-lg text-xs font-semibold hover:bg-[#ffb4ab]/20 transition-colors border border-[#ffb4ab]/20"
                      >
                        Cancel
                      </motion.button>
                    </>
                  )}
                  {post.posted_at && (
                    <span className="text-[10px] text-[#E5E1E4]/30 font-mono">
                      Posted {new Date(post.posted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Stat Card ── */
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
          transition={{
            duration: 0.8,
            delay: delay + 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </motion.div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    scheduled: {
      bg: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20",
      dot: "bg-[#FF9500]",
    },
    posting: {
      bg: "bg-[#ffbd7f]/10 text-[#ffbd7f] border-[#ffbd7f]/20",
      dot: "bg-[#ffbd7f]",
    },
    posted: {
      bg: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20",
      dot: "bg-[#4ade80]",
    },
    failed: {
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

/* ── Platform Icon ── */
function PlatformIcon({ platform }: { platform?: string }) {
  const stroke = "#FF9500";
  switch (platform?.toLowerCase()) {
    case "twitter":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
        </svg>
      );
    case "meta":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}
