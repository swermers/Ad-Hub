"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api, type ContentPiece, type ScheduledPost, type Product } from "@/lib/api";
import { GettingStarted, GettingStartedBanner } from "@/components/GettingStarted";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

interface WeekData {
  inReview: number;
  scheduled: number;
  published: number;
  seedsActive: number;
  recentContent: ContentPiece[];
  products: Product[];
  totalContent: number;
}

function useWeekData() {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [contentRes, scheduleRes, seedsRes, productsRes] = await Promise.all([
          api.listContent().catch(() => []),
          api.listScheduledPosts().catch(() => ({ items: [] })),
          api.listSeeds().catch(() => []),
          api.listProducts().catch(() => []),
        ]);
        const content = Array.isArray(contentRes) ? contentRes : [];
        const scheduled = (scheduleRes as { items: ScheduledPost[] }).items || [];
        const seeds = Array.isArray(seedsRes) ? seedsRes : [];
        const products = Array.isArray(productsRes) ? productsRes : [];
        setData({
          inReview: content.filter((c) => c.status === "review").length,
          scheduled: scheduled.filter((s) => s.status === "scheduled").length,
          published: content.filter((c) => c.status === "published").length,
          seedsActive: seeds.filter((s: { status?: string }) => s.status === "developing").length,
          recentContent: content.slice(0, 4),
          products,
          totalContent: content.length,
        });
      } catch {
        // Graceful degradation — section just won't show
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading };
}

const STATUS_STYLES: Record<string, string> = {
  draft: "text-[#E5E1E4]/50 bg-[#353437]/50 border-[#554334]/20",
  review: "text-[#ffbd7f] bg-[#ffbd7f]/10 border-[#ffbd7f]/20",
  approved: "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20",
  published: "text-[#a4a7ff] bg-[#a4a7ff]/10 border-[#a4a7ff]/20",
  rejected: "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  newsletter: "#ffbd7f",
  social_post: "#a4a7ff",
  video: "#FF9500",
  blog: "#4ade80",
};

export default function DashboardPage() {
  const { data: weekData, loading: weekLoading } = useWeekData();
  const [guideOpen, setGuideOpen] = useState(false);
  const openGuide = useCallback(() => setGuideOpen(true), []);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="relative">
      {/* Getting Started Banner */}
      <div className="mb-8">
        <GettingStartedBanner onOpen={openGuide} />
      </div>
      <GettingStarted open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Hero Header */}
      <motion.section variants={fadeUp} custom={0} className="mb-12 md:mb-16">
        <div className="flex items-baseline space-x-4 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF9500]">Content Engine</span>
          <div className="h-px flex-grow bg-[#554334]/20" />
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-[-0.04em] text-[#E5E1E4] mb-4">
          Every version<span className="text-[#554334]/50"> better.</span>
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-[#E5E1E4]/50 leading-relaxed font-medium">
          <span className="text-[#ffbd7f]">{weekData?.totalContent ?? 0}</span> pieces created across <span className="text-[#ffbd7f]">{weekData?.products.length ?? 0}</span> products. Drop an idea in the Studio or text it to Telegram.
        </p>
      </motion.section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-12">
        {/* Content Velocity */}
        <motion.div variants={fadeUp} custom={1} className="md:col-span-8 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-[#FF9500]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9500]/5 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start relative z-10 gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/40 mb-1">Content Velocity</h3>
              <div className="flex items-baseline gap-2">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl md:text-5xl font-black text-[#E5E1E4]"
                >{weekData?.totalContent ?? 0}</motion.span>
                <span className="text-[#FF9500] text-sm font-bold uppercase">pieces</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#353437] text-[#E5E1E4]/40">24h</button>
              <button className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-[#FF9500] text-[#2d1600]">Real-time</button>
            </div>
          </div>
          {/* SVG Liquid Visualization */}
          <div className="mt-8 md:mt-12 h-36 md:h-48 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="liquid-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: "rgba(255,149,0,0)" }} />
                  <stop offset="50%" style={{ stopColor: "rgba(255,149,0,0.4)" }} />
                  <stop offset="100%" style={{ stopColor: "rgba(255,149,0,0)" }} />
                </linearGradient>
              </defs>
              <motion.path
                d="M0 150 Q 150 120 300 150 T 600 150 T 800 100"
                fill="transparent"
                stroke="url(#liquid-grad)"
                strokeWidth="4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <motion.path
                d="M0 130 Q 200 180 400 130 T 800 150"
                fill="transparent"
                stroke="#ff9500"
                strokeWidth="2"
                className="opacity-30"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, delay: 0.3, ease: "easeInOut" }}
              />
              <motion.circle cx="600" cy="150" r="4" fill="#ff9500" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, duration: 0.4 }} />
              <motion.circle cx="300" cy="150" r="3" fill="#ff9500" className="opacity-50" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.8, duration: 0.4 }} />
            </svg>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="absolute top-4 left-1/4 glass-prism px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-[#FF9500]">{weekData?.scheduled ?? 0} SCHEDULED</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Published Count */}
        <motion.div variants={fadeUp} custom={2} className="md:col-span-4 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col justify-between group hover:bg-[#2a2a2c]/60 transition-all duration-500">
          <div>
            <span className="material-symbols-outlined text-[#FF9500] mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/40 mb-4">Published</h3>
            <motion.div className="text-5xl md:text-6xl font-black text-[#E5E1E4]" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>{weekData?.published ?? 0}</motion.div>
          </div>
          <div className="space-y-2 mt-6">
            <div className="h-1 w-full bg-[#353437] rounded-full overflow-hidden">
              <motion.div className="h-full liquid-gradient" initial={{ width: 0 }} animate={{ width: weekData && weekData.totalContent > 0 ? `${Math.round((weekData.published / weekData.totalContent) * 100)}%` : "0%" }} transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <p className="text-[10px] font-bold text-[#E5E1E4]/40 uppercase tracking-widest">
              {weekData && weekData.totalContent > 0 ? `${Math.round((weekData.published / weekData.totalContent) * 100)}% of total content` : "No content yet"}
            </p>
          </div>
        </motion.div>

        {/* Active Products */}
        <motion.div variants={fadeUp} custom={3} className="md:col-span-4 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 group hover:bg-[#2a2a2c]/60 transition-all duration-500">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/40 mb-6">Active Products</h3>
          <div className="space-y-4">
            {weekData?.products && weekData.products.length > 0 ? (
              weekData.products.slice(0, 5).map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex justify-between items-center">
                  <Link href={`/products/${p.id}`} className="text-sm font-medium truncate max-w-[160px] hover:text-[#FF9500] transition-colors">{p.name}</Link>
                  <span className="text-xs font-bold text-[#FF9500]">ACTIVE</span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[#E5E1E4]/40">No products yet</p>
                <Link href="/products" className="text-xs font-bold text-[#FF9500] mt-2 inline-block hover:underline">Add a product</Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Create Content */}
        <motion.div variants={fadeUp} custom={4} className="md:col-span-8 glass-prism rounded-2xl md:rounded-3xl p-[1px] bg-gradient-to-br from-[#554334]/30 to-transparent group">
          <div className="bg-[#0e0e10] h-full w-full rounded-[calc(1.5rem-1px)] p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center h-full">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Start Creating</h2>
                <p className="text-[#E5E1E4]/40 text-sm mb-6 max-w-sm">Drop a raw idea, voice memo, or concept — get back a full content package: newsletters, X threads, social posts, and video scripts.</p>
                <div className="flex gap-3 md:gap-4">
                  <Link href="/studio">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 md:px-6 py-3 liquid-gradient text-[#2d1600] rounded-xl font-bold text-xs uppercase tracking-widest">Content Studio</motion.button>
                  </Link>
                  <Link href="/seeds">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 md:px-6 py-3 border border-[#554334]/40 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#353437] transition-colors">Seed Bank</motion.button>
                  </Link>
                </div>
              </div>
              <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden relative shadow-2xl bg-gradient-to-br from-[#FF9500]/20 via-[#554334]/30 to-[#131315] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-[#131315]/80 to-transparent" />
                <span className="material-symbols-outlined text-6xl text-[#FF9500]/30" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-3 left-3">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF9500]">Content Studio</span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── This Week — Content at a Glance ── */}
      <motion.section variants={fadeUp} custom={4.5} className="mb-12">
        <div className="flex items-baseline space-x-4 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF9500]">This Week</span>
          <div className="h-px flex-grow bg-[#554334]/20" />
        </div>

        {weekLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-prism rounded-2xl border border-[#554334]/30 p-5 space-y-3">
                <div className="h-3 w-16 bg-[#353437]/50 rounded" />
                <div className="h-8 w-12 bg-[#353437]/40 rounded-lg" />
                <div className="h-1 bg-[#353437]/30 rounded-full" />
              </div>
            ))}
          </div>
        ) : weekData ? (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "In Review", value: weekData.inReview, icon: "rate_review", color: "#ffbd7f" },
                { label: "Scheduled", value: weekData.scheduled, icon: "schedule_send", color: "#a4a7ff" },
                { label: "Seeds Active", value: weekData.seedsActive, icon: "eco", color: "#4ade80" },
                { label: "Published", value: weekData.published, icon: "check_circle", color: "#FF9500" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-prism rounded-2xl border border-[#554334]/30 p-5 hover:border-[#FF9500]/20 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-sm" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">{stat.label}</span>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-3xl font-black"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </motion.span>
                  <div className="h-1 w-full bg-[#353437] rounded-full overflow-hidden mt-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stat.value * 15, 100)}%` }}
                      transition={{ delay: 0.9 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Content List */}
            {weekData.recentContent.length > 0 && (
              <div className="glass-prism rounded-2xl border border-[#554334]/30 overflow-hidden">
                <div className="px-5 py-3 border-b border-[#554334]/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5E1E4]/40">Recent Content</span>
                </div>
                <div className="divide-y divide-[#554334]/10">
                  {weekData.recentContent.map((item, i) => (
                    <motion.a
                      key={item.id}
                      href={`/content/${item.id}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + i * 0.05 }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FF9500]/[0.02] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#353437]/50 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-base text-[#E5E1E4]/40" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {item.content_type === "video" ? "movie" : item.content_type === "newsletter" ? "mail" : "article"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#E5E1E4] truncate group-hover:text-[#FF9500] transition-colors">
                          {item.title || "Untitled"}
                        </p>
                        <p className="text-xs text-[#E5E1E4]/30 font-mono mt-0.5">
                          {item.content_type || "content"} &middot; {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border shrink-0 ${STATUS_STYLES[item.status] || STATUS_STYLES.draft}`}>
                        {item.status}
                      </span>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {weekData.inReview === 0 && weekData.scheduled === 0 && weekData.published === 0 && weekData.recentContent.length === 0 && (
              <div className="text-center py-10 glass-prism rounded-2xl border border-[#554334]/30">
                <div className="w-12 h-12 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-xl text-[#FF9500]">edit_calendar</span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50">No content this week — start creating!</p>
              </div>
            )}
          </div>
        ) : null}
      </motion.section>

      {/* Recent Content Pieces */}
      <motion.section variants={fadeUp} custom={5}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recent Content</h2>
            <p className="text-[#E5E1E4]/40 text-xs uppercase tracking-widest mt-1">Latest generated pieces</p>
          </div>
          <Link href="/content" className="text-sm font-bold text-[#FF9500] border-b border-[#FF9500]/30 pb-1 hover:border-[#FF9500] transition-all">View All Content</Link>
        </div>
        {weekData?.recentContent && weekData.recentContent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {weekData.recentContent.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="group cursor-pointer">
                <Link href={`/content/${item.id}`}>
                  <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden mb-4 relative bg-gradient-to-br from-[#353437] to-[#1a1a1c] flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[#E5E1E4]/20" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {item.content_type === "video" ? "movie" : item.content_type === "newsletter" ? "mail" : item.content_type === "social_post" ? "share" : "article"}
                    </span>
                    <div className="absolute inset-0 bg-[#FF9500]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-4 right-4 glass-prism p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <span className="material-symbols-outlined text-white text-sm">open_in_new</span>
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm truncate max-w-[180px]">{item.title || "Untitled"}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border shrink-0 ${STATUS_STYLES[item.status] || STATUS_STYLES.draft}`}>{item.status}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: CONTENT_TYPE_COLORS[item.content_type] || "#FF9500" }}>{item.content_type || "content"}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="group cursor-pointer">
              <Link href="/studio">
                <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden mb-4 relative bg-[#353437] flex items-center justify-center border-2 border-dashed border-[#554334]/30 hover:border-[#FF9500]/50 transition-all duration-500">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-[#E5E1E4]/40 mb-2">add_circle</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Create New</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-16 glass-prism rounded-2xl border border-[#554334]/30">
            <div className="w-16 h-16 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl text-[#FF9500]">edit_note</span>
            </div>
            <p className="text-sm text-[#E5E1E4]/50 mb-4">No content created yet</p>
            <Link href="/studio">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-3 liquid-gradient text-[#2d1600] rounded-xl font-bold text-xs uppercase tracking-widest">Create your first content</motion.button>
            </Link>
          </div>
        )}
      </motion.section>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 15 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-20 md:bottom-10 right-6 md:right-10 w-14 h-14 liquid-gradient rounded-full shadow-[0_20px_50px_rgba(255,149,0,0.3)] flex items-center justify-center text-[#2d1600] z-40"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </motion.button>
    </motion.div>
  );
}
