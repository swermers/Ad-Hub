"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const barHeights = [65, 45, 80, 55, 90, 70, 95, 60];
const barDelays = ["0s", "0.1s", "0.2s", "0.3s", "0.4s", "0.5s", "0.6s", "0.7s"];

const aiInsights = [
  {
    color: "#FF9500",
    icon: "trending_up",
    title: "Revenue Anomaly Detected",
    desc: "APAC region showing 340% spike in conversion velocity. Recommend immediate budget reallocation.",
    time: "2 min ago",
  },
  {
    color: "#a78bfa",
    icon: "psychology",
    title: "Audience Fatigue Signal",
    desc: "Creative set Delta-7 approaching diminishing returns threshold. Refresh recommended within 48hrs.",
    time: "14 min ago",
  },
  {
    color: "#34d399",
    icon: "bolt",
    title: "Opportunity Window Open",
    desc: "Competitor pullback detected in EMEA social channels. CPC down 23% — ideal for scale.",
    time: "31 min ago",
  },
];

const teamAvatars = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCbNzpxzeZ2KjsuEnH45MancHSVjFNK9MKBjchD8Q4MVo3vh0F-OQ7Y116nor0FJKjhF2nzvLVefITmJuxUk3XNuLnReGE4hGKXKkklKX-XIKcGqNb5_TskYnXpJJ-Z9Odc3Dtvzzt3Vji7-zUEnt68ADK4koXS71yFChTBlJp5Dq0VyBWFtWmK40XAWFRKllzQp_NO9RsQ9v-RRgyk_hfsUoZvOuLVG1j9J4Grk4x_1haxkw0RGnXVlPLs5V88y53-cc-uWWD3Lw5J",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSpSijP6D9IRd__96UER5gEjwijypc8UKOWz2FrrS-4XmeD-8UCg5E0kB5OeBaoUmPUa_K5sng-p_1DQnp8bnJS5KtCfIEZ1blspkMqPyf54P7oEed_n6IBL5NQDu16KwXcCdUSpAfCiS548E6M41AvyEJ8I3yirJl0_k-7xbNDA_qOiSJVSN42HTfeA_xcXzS89QliCvuLSSibKiR5iyMpYVjxFV0jzqk0RGye5iSYm9Lbetmz0GlWB2cDS8AvUcHyq53cE1a33Xh",
];

const campaignMetrics = [
  {
    icon: "ads_click",
    label: "Direct Traffic",
    value: "142.8k",
    change: "+2.4%",
    positive: true,
    progress: 72,
  },
  {
    icon: "share",
    label: "Social Velocity",
    value: "89.4k",
    change: "+18.1%",
    positive: true,
    progress: 58,
  },
  {
    icon: "mail",
    label: "Email Engagement",
    value: "12.1k",
    change: "-0.4%",
    positive: false,
    progress: 34,
  },
  {
    icon: "travel_explore",
    label: "Organic Discovery",
    value: "64.2k",
    change: "+5.9%",
    positive: true,
    progress: 48,
  },
];

export default function CommandCenterPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-10">
      {/* ============ HEADER ============ */}
      <motion.div variants={fadeUp} custom={0} className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div>
          <p className="text-[#FF9500] uppercase tracking-[0.2em] text-[11px] font-black mb-3">
            Command Center
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-[#E5E1E4] leading-[1.05]">
            Global Performance{" "}
            <span className="text-[#E5E1E4]/30">Intelligence.</span>
          </h1>
        </div>
        <div className="text-right flex flex-col items-end gap-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#34d399]" />
            </span>
            <span className="text-[#34d399] text-sm font-medium">
              Live Precision Tracking
            </span>
          </div>
          <p className="text-[#E5E1E4]/30 text-xs font-mono">
            SRV-NODE-0x7F &middot; 120fps &middot; &lt;1ms latency
          </p>
        </div>
      </motion.div>

      {/* ============ BENTO GRID ============ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* --- Hero ROI Card --- */}
        <motion.div variants={fadeUp} custom={1} className="md:col-span-8 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9500]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[#E5E1E4]/50 text-sm font-medium uppercase tracking-wider">
                  Annual Net ROI
                </p>
                <p className="text-xs text-[#E5E1E4]/30 mt-1">
                  Fiscal Year 2026 &middot; All Channels
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#34d399]/10 border border-[#34d399]/20 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
                <span className="text-[#34d399] text-xs font-medium">Verified</span>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-6xl md:text-9xl font-black text-[#FF9500] leading-none tracking-tighter">
                  +842%
                </motion.p>
                <p className="text-[#34d399] text-sm font-medium mt-3">
                  ▲ 12.4% vs prev. period
                </p>
              </div>

              {/* Animated Bar Chart */}
              <div className="flex items-end gap-2 h-32">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div
                      className="w-5 rounded-t-md transition-all duration-700 ease-out"
                      style={{
                        height: `${hoveredBar === i ? Math.min(h + 15, 100) : h}%`,
                        background:
                          hoveredBar === i
                            ? "linear-gradient(to top, #FF9500, #ffbd7f)"
                            : "linear-gradient(to top, rgba(255,149,0,0.4), rgba(255,189,127,0.2))",
                        transitionDelay: barDelays[i],
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Conversion Donut --- */}
        <motion.div variants={fadeUp} custom={2} className="md:col-span-4 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF9500]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[#E5E1E4]/50 text-sm font-medium uppercase tracking-wider mb-1">
              Conversion Rate
            </p>
            <p className="text-xs text-[#E5E1E4]/30 mb-4">
              Blended &middot; All Funnels
            </p>

            <div className="relative flex items-center justify-center">
              <svg className="w-full h-48 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke="url(#solarGradient)"
                  strokeWidth="8"
                  strokeDasharray="210 282"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="solarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: "#ff9500", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#ffbd7f", stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className="text-4xl font-black text-[#E5E1E4]">24.8%</span>
                <span className="text-xs text-[#E5E1E4]/40 mt-1">of total traffic</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-[#E5E1E4]/40">
                Benchmark <span className="text-[#E5E1E4]/60 font-medium">18%</span>
              </div>
              <button className="haptic-btn text-xs font-medium text-[#FF9500] hover:text-[#ffbd7f] transition-colors flex items-center gap-1">
                Analyze Segment
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* --- Global Map --- */}
        <motion.div variants={fadeUp} custom={3} className="md:col-span-12 lg:col-span-7 glass-prism rounded-2xl md:rounded-3xl overflow-hidden relative min-h-[300px] md:min-h-[360px]">
          {/* Map background */}
          <div className="absolute inset-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6tkJN8qK3-bgCH40o1oCGwR50P9JZrFwnVkGpxJ9pvBmlY4RacYrPeOC-qOkAjY738aJVOc6B8GBMUBLAjzos5qN-erzmu9ZP2hznvi1XaPT99Gl-P2mWv6N_kI-czAyivyfSL-3bIj7rEaM51MNxsQIxEZqzgdYIUUJrC1c75t7uxCsVlljY8N8li2q-JJ49dXKQHIECSSOScIR9bGvzD0YrMv9J4g0tnKnxM2rQ40oDcAVEZvO7uSpYjNlCs-6u7TyK92ZEGw0f"
              alt="World map"
              className="w-full h-full object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#131315]/80 to-transparent" />
          </div>

          <div className="relative z-10 p-8 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-[#FF9500] text-xl">
                  public
                </span>
                <h3 className="text-[#E5E1E4] font-bold text-lg">Expansion Pulse</h3>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-mono text-[#E5E1E4]/40 bg-white/5 border border-white/10 rounded px-2 py-0.5">
                  LATENCY: 12ms
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#34d399] bg-[#34d399]/10 border border-[#34d399]/20 rounded px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            <div className="flex items-end gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1">EMEA</p>
                <p className="text-2xl font-black text-[#E5E1E4]">14.2M</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1">APAC</p>
                <p className="text-2xl font-black text-[#FF9500]">32.8M</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#E5E1E4]/30 mb-1">AMER</p>
                <p className="text-2xl font-black text-[#E5E1E4]">28.1M</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- AI Insights --- */}
        <motion.div variants={fadeUp} custom={4} className="md:col-span-12 lg:col-span-5 glass-prism rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#a78bfa]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[#a78bfa] text-xl">
                neurology
              </span>
              <h3 className="text-[#E5E1E4] font-bold text-lg">AI Insights</h3>
              <span className="ml-auto text-[10px] font-mono text-[#E5E1E4]/30 bg-white/5 border border-white/10 rounded px-2 py-0.5">
                3 NEW
              </span>
            </div>

            <div className="space-y-4">
              {aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-all duration-300"
                  style={{ borderLeftWidth: "4px", borderLeftColor: insight.color }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="material-symbols-outlined text-lg mt-0.5"
                      style={{ color: insight.color }}
                    >
                      {insight.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#E5E1E4] mb-1">
                        {insight.title}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/50 leading-relaxed">
                        {insight.desc}
                      </p>
                      <p className="text-[10px] text-[#E5E1E4]/25 mt-2">{insight.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="flex -space-x-2">
                {teamAvatars.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="Team member"
                    className="w-7 h-7 rounded-full border-2 border-[#131315] object-cover"
                  />
                ))}
                <div className="w-7 h-7 rounded-full border-2 border-[#131315] bg-[#353437] flex items-center justify-center text-[10px] text-[#E5E1E4]/50 font-medium">
                  +8
                </div>
              </div>
              <button className="haptic-btn text-xs font-medium text-[#a78bfa] hover:text-[#c4b5fd] transition-colors flex items-center gap-1">
                View All Intelligence
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============ SECONDARY PERFORMANCE GRID ============ */}
      <motion.div variants={fadeUp} custom={5}>
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[#FF9500] text-xl">
            hub
          </span>
          <h2 className="text-xl font-bold text-[#E5E1E4]">Active Campaign Cluster</h2>
          <span className="text-xs text-[#E5E1E4]/30 font-mono ml-auto">
            Last 24h &middot; Auto-refresh
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {campaignMetrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="glass-card-subtle rounded-2xl p-5 md:p-6 group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FF9500] text-xl">
                    {metric.icon}
                  </span>
                </div>
                <p className="text-sm text-[#E5E1E4]/50 font-medium">{metric.label}</p>
              </div>

              <p className="text-3xl font-black text-[#E5E1E4] mb-1">{metric.value}</p>
              <p
                className={`text-sm font-medium ${
                  metric.positive ? "text-[#34d399]" : "text-[#ffb4ab]"
                }`}
              >
                {metric.change}
              </p>

              <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${metric.progress}%`,
                    background: metric.positive
                      ? "linear-gradient(to right, #FF9500, #ffbd7f)"
                      : "linear-gradient(to right, #ffb4ab, #ff8a80)",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
