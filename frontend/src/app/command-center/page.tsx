"use client";

import { useCallback, useEffect, useState } from "react";
import { api, CommandCenter } from "@/lib/api";

export default function CommandCenterPage() {
  const [data, setData] = useState<CommandCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async (includeAi = false) => {
    try {
      if (includeAi) setAiLoading(true);
      else setLoading(true);
      const result = await api.getCommandCenter(includeAi);
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9500]" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-[#E5E1E4]/50">Failed to load command center data.</p>;
  }

  const { summary, products, top_winners, worst_losers, ai_recommendations } = data;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Command Center</h1>
          <p className="text-[#E5E1E4]/50 text-sm mt-1">
            Full snapshot of your ad performance across all products
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(false)}
            className="px-4 py-2 text-sm font-medium bg-[#201f21] border border-white/10 rounded-lg hover:bg-white/5"
          >
            Refresh
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={aiLoading}
            className="px-4 py-2 text-sm font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {aiLoading ? "Analyzing..." : "Get AI Recommendations"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Products" value={summary.total_products} />
        <SummaryCard label="Active Ads" value={summary.total_active_ads} color="green" />
        <SummaryCard label="Paused" value={summary.total_paused_ads} color="red" />
        <SummaryCard label="Winners" value={summary.total_winners} color="blue" />
        <SummaryCard label="Total Spend" value={`$${summary.total_spend.toFixed(2)}`} />
      </div>

      {/* AI Recommendations */}
      {ai_recommendations && (
        <div className="bg-gradient-to-r from-[#FF9500]/10 to-indigo-50 border border-[#FF9500]/20 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#FF9500]">AI Strategy Brief</h2>
          <p className="text-[#FF9500]">{ai_recommendations.executive_summary}</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#FF9500] mb-2">Immediate Actions</h3>
              <ul className="space-y-1">
                {ai_recommendations.immediate_actions.map((a, i) => (
                  <li key={i} className="text-sm text-[#FF9500] flex gap-2">
                    <span className="text-[#FF9500] shrink-0">&#x2022;</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#FF9500] mb-2">Budget Recs</h3>
              <ul className="space-y-1">
                {ai_recommendations.budget_recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-[#FF9500] flex gap-2">
                    <span className="text-[#FF9500] shrink-0">&#x2022;</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#FF9500] mb-2">Next Tests</h3>
              <ul className="space-y-1">
                {ai_recommendations.next_tests.map((t, i) => (
                  <li key={i} className="text-sm text-[#FF9500] flex gap-2">
                    <span className="text-[#FF9500] shrink-0">&#x2022;</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Product Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-[#E5E1E4] mb-4">Products</h2>
        <div className="space-y-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-[#201f21] border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#E5E1E4]">{p.name}</h3>
                  <span className="text-xs bg-white/10 text-[#dbc2ad] px-2 py-0.5 rounded-full">
                    {p.product_type}
                  </span>
                </div>
                <div className="text-right text-sm text-[#E5E1E4]/50">
                  {p.total_variations} variations &middot; {p.pain_points_count} pain points
                </div>
              </div>

              {/* Status bar */}
              <div className="flex gap-3 mb-3">
                <StatusPill label="Active" count={p.active_ads} color="green" />
                <StatusPill label="Paused" count={p.paused_ads} color="red" />
                <StatusPill label="Winners" count={p.winners} color="blue" />
                <StatusPill label="Draft" count={p.status_breakdown.draft || 0} color="gray" />
              </div>

              {p.total_spend > 0 && (
                <p className="text-sm text-[#dbc2ad] mb-2">
                  Spend: <span className="font-medium">${p.total_spend.toFixed(2)}</span>
                </p>
              )}

              {/* Top winner */}
              {p.top_winner && (
                <div className="bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-lg px-3 py-2 text-sm mb-2">
                  <span className="font-medium text-[#4ade80]">Top Winner:</span>{" "}
                  <span className="text-[#4ade80]">&ldquo;{p.top_winner.headline}&rdquo;</span>
                  <span className="text-[#4ade80] ml-2">
                    CTR {p.top_winner.ctr.toFixed(2)}% &middot; {p.top_winner.impressions.toLocaleString()} impressions
                  </span>
                </div>
              )}

              {/* Recent actions */}
              {p.recent_actions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-[#E5E1E4]/50 mb-1">Recent optimizer actions:</p>
                  <div className="space-y-1">
                    {p.recent_actions.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            a.action === "paused"
                              ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                              : a.action === "promoted"
                                ? "bg-[#4ade80]/10 text-[#4ade80]"
                                : "bg-white/10 text-[#dbc2ad]"
                          }`}
                        >
                          {a.action}
                        </span>
                        <span className="text-[#E5E1E4]/50 truncate">{a.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {products.length === 0 && (
            <p className="text-[#E5E1E4]/50 text-sm">
              No products yet. Add a product and generate some bulk ads to see data here.
            </p>
          )}
        </div>
      </div>

      {/* Winners & Losers */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Winners */}
        <div>
          <h2 className="text-lg font-semibold text-[#E5E1E4] mb-3">Top Winners</h2>
          {top_winners.length > 0 ? (
            <div className="space-y-2">
              {top_winners.map((w, i) => (
                <div
                  key={w.variation_id}
                  className="bg-[#201f21] border border-[#4ade80]/20 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#E5E1E4] truncate">
                      {i + 1}. {w.headline}
                    </p>
                    <p className="text-xs text-[#E5E1E4]/50">
                      {w.impressions.toLocaleString()} impressions &middot; ${w.spend.toFixed(2)} spend
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-bold text-[#4ade80]">{w.ctr.toFixed(2)}% CTR</p>
                    <p className="text-xs text-[#E5E1E4]/50">${w.cpm.toFixed(2)} CPM</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#E5E1E4]/50">No winners yet. Run some ads and the optimizer will find them.</p>
          )}
        </div>

        {/* Losers */}
        <div>
          <h2 className="text-lg font-semibold text-[#E5E1E4] mb-3">Worst Performers</h2>
          {worst_losers.length > 0 ? (
            <div className="space-y-2">
              {worst_losers.map((l, i) => (
                <div
                  key={l.variation_id}
                  className="bg-[#201f21] border border-[#ffb4ab]/20 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#E5E1E4] truncate">
                      {i + 1}. {l.headline}
                    </p>
                    <p className="text-xs text-[#E5E1E4]/50">
                      {l.impressions.toLocaleString()} impressions &middot; ${l.spend.toFixed(2)} spend
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-bold text-[#ffb4ab]">${l.cpm.toFixed(2)} CPM</p>
                    <p className="text-xs text-[#E5E1E4]/50">{l.ctr.toFixed(2)}% CTR</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#E5E1E4]/50">No losers paused yet. The optimizer will flag underperformers.</p>
          )}
        </div>
      </div>

      {/* Content Performance */}
      {summary.content_performance.posts_tracked > 0 && (
        <div className="bg-[#201f21] border border-white/10 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-[#E5E1E4] mb-3">
            Content Performance (Last {summary.content_performance.period_days} Days)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Impressions" value={summary.content_performance.total_impressions.toLocaleString()} />
            <Stat label="Clicks" value={summary.content_performance.total_clicks.toLocaleString()} />
            <Stat label="Avg CTR" value={`${summary.content_performance.avg_ctr.toFixed(2)}%`} />
            <Stat label="Spend" value={`$${summary.content_performance.total_spend.toFixed(2)}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "green" | "red" | "blue";
}) {
  const colorClasses = {
    green: "text-[#4ade80]",
    red: "text-[#ffb4ab]",
    blue: "text-[#FF9500]",
  };
  return (
    <div className="bg-[#201f21] border border-white/10 rounded-xl p-4">
      <p className="text-sm text-[#E5E1E4]/50">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : "text-[#E5E1E4]"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-[#4ade80]/10 text-[#4ade80]",
    red: "bg-[#ffb4ab]/10 text-[#ffb4ab]",
    blue: "bg-[#FF9500]/10 text-[#FF9500]",
    gray: "bg-white/10 text-[#dbc2ad]",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorMap[color] || colorMap.gray}`}>
      {label}: {count}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#E5E1E4]/50">{label}</p>
      <p className="text-lg font-semibold text-[#E5E1E4]">{value}</p>
    </div>
  );
}
