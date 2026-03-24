"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type ContentPiece, type ScheduledPost } from "@/lib/api";

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

const clusterData = [
  { name: "NEURAL_ALPHA", status: "RUNNING", active: true },
  { name: "FLUID_BETA", status: "STANDBY", active: false },
  { name: "KINETIC_GAMMA", status: "RUNNING", active: true },
];

const assets = [
  {
    name: "Solar_Drift_01.png",
    size: "4.2MB",
    type: "Simulation",
    typeColor: "#FF9500",
    image: "/placeholder.svg",
  },
  {
    name: "Obsidian_Flow.mov",
    size: "128MB",
    type: "Video",
    typeColor: "#a0a0a0",
    image: "/placeholder.svg",
  },
  {
    name: "Ember_Field.svg",
    size: "84KB",
    type: "Vector",
    typeColor: "#FF9500",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFQzAQ6n9fggm9omJqQFti-mmelHy3ohKuz3nisSrqrHQ4sJlWryUkEpgCPY18hgeH098FyCntFvW9Ing8C2RMLH4sCzz9QVJJnrC_wDxcORbE-MEf9ZWbkPk4ASwzMC5O2eLiDhZ_Sk9O9mw-2ofPO_zSBARnusYAEE0ezEd3xMnW2O_BHQSqH9C1zSoWplsSiY9vnvekPoohgaaQjHz6MJg1ave4zpZCv6h_dRqNHvOBRPubj5xSnWKkuIAJUsxgAIHlmZDvVc9G",
  },
];

interface WeekData {
  inReview: number;
  scheduled: number;
  published: number;
  seedsActive: number;
  recentContent: ContentPiece[];
}

function useWeekData() {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [contentRes, scheduleRes, seedsRes] = await Promise.all([
          api.listContent().catch(() => ({ items: [] })),
          api.listScheduledPosts().catch(() => ({ items: [] })),
          api.listSeeds().catch(() => []),
        ]);
        const content = (contentRes as { items: ContentPiece[] }).items || [];
        const scheduled = (scheduleRes as { items: ScheduledPost[] }).items || [];
        const seeds = Array.isArray(seedsRes) ? seedsRes : [];
        setData({
          inReview: content.filter((c) => c.status === "review").length,
          scheduled: scheduled.filter((s) => s.status === "scheduled").length,
          published: content.filter((c) => c.status === "published").length,
          seedsActive: seeds.filter((s: { status?: string }) => s.status === "developing").length,
          recentContent: content.slice(0, 4),
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

export default function DashboardPage() {
  const { data: weekData, loading: weekLoading } = useWeekData();

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="relative">
      {/* Hero Header */}
      <motion.section variants={fadeUp} custom={0} className="mb-12 md:mb-16">
        <div className="flex items-baseline space-x-4 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF9500]">System Overview</span>
          <div className="h-px flex-grow bg-[#554334]/20" />
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-[-0.04em] text-[#E5E1E4] mb-4">
          Kinetic <span className="text-[#554334]/50">Precision.</span>
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-[#E5E1E4]/50 leading-relaxed font-medium">
          The atelier is pressurized. Your digital assets are currently evolving through 14 active fluid states. Optimization is <span className="text-[#ffbd7f]">98.4%</span> complete.
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
                >12.4</motion.span>
                <span className="text-[#FF9500] text-sm font-bold uppercase">m/sec</span>
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
              <span className="text-[10px] font-bold text-[#FF9500]">PEAK +14%</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Precision Score */}
        <motion.div variants={fadeUp} custom={2} className="md:col-span-4 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col justify-between group hover:bg-[#2a2a2c]/60 transition-all duration-500">
          <div>
            <span className="material-symbols-outlined text-[#FF9500] mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/40 mb-4">Precision Score</h3>
            <motion.div className="text-5xl md:text-6xl font-black text-[#E5E1E4]" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>98</motion.div>
          </div>
          <div className="space-y-2 mt-6">
            <div className="h-1 w-full bg-[#353437] rounded-full overflow-hidden">
              <motion.div className="h-full liquid-gradient" initial={{ width: 0 }} animate={{ width: "98%" }} transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <p className="text-[10px] font-bold text-[#E5E1E4]/40 uppercase tracking-widest">Global standard optimal</p>
          </div>
        </motion.div>

        {/* Active Clusters */}
        <motion.div variants={fadeUp} custom={3} className="md:col-span-4 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 group hover:bg-[#2a2a2c]/60 transition-all duration-500">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5E1E4]/40 mb-6">Active Clusters</h3>
          <div className="space-y-4">
            {clusterData.map((c, i) => (
              <motion.div key={c.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex justify-between items-center">
                <span className="text-sm font-medium">{c.name}</span>
                <span className={`text-xs font-bold ${c.active ? "text-[#FF9500]" : "text-[#E5E1E4]/40"}`}>{c.status}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Generate Fluid Assets */}
        <motion.div variants={fadeUp} custom={4} className="md:col-span-8 glass-prism rounded-2xl md:rounded-3xl p-[1px] bg-gradient-to-br from-[#554334]/30 to-transparent group">
          <div className="bg-[#0e0e10] h-full w-full rounded-[calc(1.5rem-1px)] p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center h-full">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Generate Fluid Assets</h2>
                <p className="text-[#E5E1E4]/40 text-sm mb-6 max-w-sm">Use the Atelier&apos;s engine to create 3D liquid simulations for your next high-fashion campaign.</p>
                <div className="flex gap-3 md:gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 md:px-6 py-3 liquid-gradient text-[#2d1600] rounded-xl font-bold text-xs uppercase tracking-widest">Launch Engine</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 md:px-6 py-3 border border-[#554334]/40 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#353437] transition-colors">Presets</motion.button>
                </div>
              </div>
              <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden relative shadow-2xl">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIug6g2LPwzKADjEqXG6HsIy45hKm1XA5X9x3Ag5jufUSOx_MJ6QJkKTpJPGLBbANeJo2o1DrA7IMrGJPt28zthE9nZtTQdrAMu98GSvfVhg8v5hVIPnBY7nynAa-oFb6Ax_Bc-mpMXxoHjvTO1sYMjbhRhH0UFMRd77m1MH122oEpYOAOgp0yPQSn1nUNulqROKitdLur-FWDQKU17DCRaynhwXDxajDcn0aP0Pa4rdUwwgEGYRgNQRQX4QB8bvyYs3zz5hLUpf61" alt="Fluid asset preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131315]/80 to-transparent" />
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-3 left-3">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#FF9500]">Live Preview</span>
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

      {/* Recent Studio Assets */}
      <motion.section variants={fadeUp} custom={5}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recent Studio Assets</h2>
            <p className="text-[#E5E1E4]/40 text-xs uppercase tracking-widest mt-1">Rendered in the last 12 hours</p>
          </div>
          <button className="text-sm font-bold text-[#FF9500] border-b border-[#FF9500]/30 pb-1 hover:border-[#FF9500] transition-all">View All Assets</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {assets.map((a, i) => (
            <motion.div key={a.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="group cursor-pointer">
              <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden mb-4 relative">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={a.image} alt={a.name} />
                <div className="absolute inset-0 bg-[#FF9500]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-4 right-4 glass-prism p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="material-symbols-outlined text-white text-sm">download</span>
                </div>
              </div>
              <div className="px-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm">{a.name}</h4>
                  <span className="text-[10px] font-bold text-[#E5E1E4]/40">{a.size}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: a.typeColor }}>{a.type}</span>
              </div>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="group cursor-pointer">
            <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden mb-4 relative bg-[#353437] flex items-center justify-center border-2 border-dashed border-[#554334]/30 hover:border-[#FF9500]/50 transition-all duration-500">
              <div className="text-center">
                <span className="material-symbols-outlined text-3xl text-[#E5E1E4]/40 mb-2">add_circle</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Upload New</p>
              </div>
            </div>
          </motion.div>
        </div>
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
