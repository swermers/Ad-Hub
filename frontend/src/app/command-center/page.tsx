"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, CommandCenter } from "@/lib/api";
import { fadeUp, stagger } from "@/lib/motion";

function useCommandCenter() {
  const [data, setData] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .getCommandCenter(true)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "k";
  return "$" + n.toFixed(2);
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#353437]/40 ${className ?? ""}`}
    />
  );
}

export default function CommandCenterPage() {
  const { data, loading } = useCommandCenter();

  // Derive bar chart data from products
  const barHeights: number[] = (() => {
    if (!data?.products?.length) return [20, 20, 20, 20, 20, 20, 20, 20];
    const values = data.products.map(
      (p) => p.total_spend || p.active_ads || 1
    );
    const max = Math.max(...values, 1);
    const normalized = values.map((v) => Math.max(10, (v / max) * 100));
    // Pad to at least 4 bars
    while (normalized.length < 4) normalized.push(10);
    return normalized.slice(0, 8);
  })();

  // Key metric for ROI card
  const keyMetric = (() => {
    if (!data) return { value: "---", label: "Loading..." };
    const perf = data.summary.content_performance;
    if (perf.avg_ctr > 0)
      return { value: perf.avg_ctr.toFixed(1) + "%", label: "Average CTR" };
    if (perf.total_impressions > 0)
      return {
        value: formatNumber(perf.total_impressions),
        label: "Total Impressions",
      };
    return {
      value: formatCurrency(data.summary.total_spend),
      label: "Total Spend",
    };
  })();

  // Conversion / CTR donut
  const ctrPct = data?.summary.content_performance.avg_ctr ?? 0;
  const donutDash = (ctrPct / 100) * 282;

  // Insights
  const insightItems: { color: string; title: string; desc: string }[] =
    (() => {
      if (data?.ai_recommendations) {
        const ai = data.ai_recommendations;
        const items: { color: string; title: string; desc: string }[] = [];
        if (ai.executive_summary) {
          items.push({
            color: "#FF9500",
            title: "Executive Summary",
            desc: ai.executive_summary,
          });
        }
        ai.immediate_actions.forEach((action) => {
          items.push({ color: "#c6c4df", title: action, desc: "" });
        });
        ai.budget_recommendations.forEach((rec) => {
          items.push({ color: "#ffbd7f", title: rec, desc: "" });
        });
        return items.slice(0, 5);
      }
      if (data?.products?.length) {
        return data.products.slice(0, 4).map((p) => ({
          color: p.winners > 0 ? "#FF9500" : "#c6c4df",
          title: p.name,
          desc: `${p.active_ads} active ads, ${p.winners} winners, ${formatCurrency(p.total_spend)} spend`,
        }));
      }
      return [];
    })();

  // Products for campaign cluster
  const products = data?.products ?? [];

  return (
    <motion.div
      className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 md:px-8 py-8 pb-28"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* Header */}
      <motion.header
        className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10"
        variants={stagger}
      >
        <div>
          <motion.p
            className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3"
            {...fadeUp(0)}
          >
            Command Center
          </motion.p>
          <motion.h1
            className="text-4xl md:text-7xl font-bold tracking-tighter leading-[0.95]"
            {...fadeUp(0.05)}
          >
            Global Performance{" "}
            <span className="text-[#E5E1E4]/30">Intelligence.</span>
          </motion.h1>
        </div>

        <motion.div
          className="flex flex-col items-start md:items-end gap-2 shrink-0"
          {...fadeUp(0.1)}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]" />
            </span>
            <span className="text-xs text-[#E5E1E4]/60 font-medium">
              Live Precision Tracking
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#E5E1E4]/30 tracking-wider">
            {loading
              ? "LOADING DATA..."
              : data
                ? `${data.summary.total_products} PRODUCTS TRACKED`
                : "NO DATA"}
          </span>
        </motion.div>
      </motion.header>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 p-8">
            <SkeletonBlock className="h-4 w-32 mb-4" />
            <SkeletonBlock className="h-24 w-64 mb-4" />
            <div className="flex gap-2 h-36">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBlock key={i} className="w-7 flex-shrink-0" />
              ))}
            </div>
          </div>
          <div className="md:col-span-4 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 p-6 flex flex-col items-center gap-4">
            <SkeletonBlock className="h-36 w-36 rounded-full" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
          <div className="md:col-span-7 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 p-8 min-h-[320px]">
            <SkeletonBlock className="h-6 w-48 mb-4" />
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16 w-28" />
              ))}
            </div>
          </div>
          <div className="md:col-span-5 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 p-6">
            <SkeletonBlock className="h-6 w-32 mb-5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20 w-full mb-3" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF9500"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-lg text-[#E5E1E4]/60">
            No data available. Create products and ads to get started.
          </p>
        </div>
      )}

      {/* Main Content */}
      {!loading && data && (
        <>
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Key Metric Card */}
            <motion.div
              className="glass-prism md:col-span-8 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 md:p-8 overflow-hidden"
              {...fadeUp(0.12)}
            >
              <p className="text-xs text-[#E5E1E4]/50 uppercase tracking-widest mb-1">
                {keyMetric.label}
              </p>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <span className="text-6xl md:text-9xl font-black text-[#FF9500] leading-none tracking-tighter">
                    {keyMetric.value}
                  </span>
                  <p className="text-sm text-[#E5E1E4]/50 mt-2">
                    <span className="text-[#FF9500]">
                      {formatCurrency(data.summary.total_spend)}
                    </span>{" "}
                    total spend across{" "}
                    {data.summary.total_active_ads} active ads
                  </p>
                </div>

                {/* Bar Chart from Products */}
                <div className="flex items-end gap-[6px] h-28 md:h-36">
                  {barHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-5 md:w-7 rounded-t-md bg-gradient-to-t from-[#FF9500]/80 to-[#ffbd7f]/60 cursor-pointer relative group"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{
                        duration: 0.7,
                        delay: 0.3 + i * 0.07,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{
                        height: "100%",
                        backgroundColor: "#FF9500",
                        transition: { duration: 0.25 },
                      }}
                    >
                      {data.products[i] && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#2d2d30] text-[10px] px-2 py-1 rounded text-[#E5E1E4]/80 z-20">
                          {data.products[i].name}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* CTR Donut Card */}
            <motion.div
              className="glass-prism md:col-span-4 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-4"
              {...fadeUp(0.18)}
            >
              <p className="text-xs text-[#E5E1E4]/50 uppercase tracking-widest self-start">
                Click-Through Rate
              </p>
              <div className="relative">
                <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                  <defs>
                    <linearGradient
                      id="donutGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#ff9500" />
                      <stop offset="100%" stopColor="#ffbd7f" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#353437"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#donutGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${donutDash} 282`}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                    style={{ strokeDashoffset: 0 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-[#FF9500]">
                    {ctrPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#E5E1E4]/40">
                {data.summary.content_performance.total_clicks} clicks from{" "}
                <span className="text-[#E5E1E4]/60">
                  {formatNumber(
                    data.summary.content_performance.total_impressions
                  )}
                </span>{" "}
                impressions
              </p>
              <motion.button
                className="mt-1 px-5 py-2 rounded-full text-xs font-semibold bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 hover:bg-[#FF9500]/20 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Analyze Segment
              </motion.button>
            </motion.div>

            {/* Products Overview */}
            <motion.div
              className="md:col-span-12 lg:col-span-7 rounded-2xl bg-[#1b1b1d] border border-[#554334]/20 overflow-hidden relative min-h-[320px]"
              {...fadeUp(0.22)}
            >
              {/* Gradient background instead of external image */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF9500]/5 via-[#1b1b1d] to-[#c6c4df]/5 pointer-events-none" />
              <div className="relative z-10 p-6 md:p-8 flex flex-col justify-between h-full gap-6">
                <div>
                  <h3 className="text-lg font-bold tracking-tight mb-3">
                    Products Overview
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF9500]" />
                      </span>
                      LIVE
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  {[
                    {
                      label: "PRODUCTS",
                      value: data.summary.total_products.toString(),
                    },
                    {
                      label: "ACTIVE ADS",
                      value: formatNumber(data.summary.total_active_ads),
                    },
                    {
                      label: "WINNERS",
                      value: formatNumber(data.summary.total_winners),
                    },
                  ].map((r) => (
                    <div key={r.label}>
                      <p className="text-[10px] text-[#E5E1E4]/40 font-mono uppercase tracking-wider">
                        {r.label}
                      </p>
                      <p className="text-xl font-bold text-[#E5E1E4]">
                        {r.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Top winners mini-list */}
                {data.top_winners.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#E5E1E4]/40 font-mono uppercase tracking-wider mb-2">
                      Top Winners
                    </p>
                    <div className="flex flex-col gap-2">
                      {data.top_winners.slice(0, 3).map((w) => (
                        <div
                          key={w.variation_id}
                          className="flex items-center justify-between bg-[#353437]/30 rounded-lg px-3 py-2"
                        >
                          <span className="text-xs text-[#E5E1E4]/80 truncate max-w-[200px]">
                            {w.headline}
                          </span>
                          <span className="text-xs font-semibold text-[#FF9500] ml-3">
                            {w.ctr.toFixed(1)}% CTR
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              className="glass-prism md:col-span-12 lg:col-span-5 rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6"
              {...fadeUp(0.26)}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold tracking-tight">
                  {data.ai_recommendations ? "AI Insights" : "Product Insights"}
                </h3>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20">
                  {insightItems.length} insights
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {insightItems.length === 0 && (
                  <p className="text-sm text-[#E5E1E4]/40 py-8 text-center">
                    No insights available yet. Add products and run ads to
                    generate insights.
                  </p>
                )}
                {insightItems.map((item, i) => (
                  <motion.div
                    key={i}
                    className="border-l-4 rounded-r-lg bg-[#353437]/30 p-4 cursor-pointer hover:bg-[#353437]/50 transition-colors"
                    style={{ borderColor: item.color }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  >
                    <p className="text-sm font-semibold leading-snug mb-1">
                      {item.title}
                    </p>
                    {item.desc && (
                      <p className="text-xs text-[#E5E1E4]/40 leading-relaxed">
                        {item.desc}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Product Cards */}
          <motion.section className="mt-8" {...fadeUp(0.32)}>
            <h2 className="text-lg font-bold tracking-tight mb-4">
              Product Performance
            </h2>
            {products.length === 0 ? (
              <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-12 text-center">
                <p className="text-sm text-[#E5E1E4]/40">
                  No products yet. Create your first product to see performance
                  data here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((p, i) => {
                  const totalAds = p.active_ads + p.paused_ads;
                  const activeRatio =
                    totalAds > 0 ? (p.active_ads / totalAds) * 100 : 0;
                  return (
                    <motion.div
                      key={p.id}
                      className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.45 + i * 0.08 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="p-2 rounded-lg bg-[#353437]/50">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={p.winners > 0 ? "#FF9500" : "#E5E1E4"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="2"
                              y="3"
                              width="20"
                              height="14"
                              rx="2"
                              ry="2"
                            />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            p.winners > 0 ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                          }`}
                        >
                          {p.winners} winner{p.winners !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-lg font-bold mb-0.5 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-[#E5E1E4]/40 mb-1">
                        {p.active_ads} active / {p.paused_ads} paused
                      </p>
                      <p className="text-xs text-[#E5E1E4]/50 mb-3">
                        Spend:{" "}
                        <span className="text-[#FF9500] font-semibold">
                          {formatCurrency(p.total_spend)}
                        </span>
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-[#353437]/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, #FF9500, #ffbd7f)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${activeRatio}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.6 + i * 0.1,
                            ease: "easeOut",
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </>
      )}

      {/* Floating Generate Report FAB */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FF9500] text-[#2d1600] font-semibold text-sm shadow-lg shadow-[#FF9500]/20 hover:shadow-[#FF9500]/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Generate Report
      </motion.button>
    </motion.div>
  );
}
