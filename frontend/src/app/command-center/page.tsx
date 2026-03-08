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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Failed to load command center data.</p>;
  }

  const { summary, products, top_winners, worst_losers, ai_recommendations } = data;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">
            Full snapshot of your ad performance across all products
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(false)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={aiLoading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-blue-900">AI Strategy Brief</h2>
          <p className="text-blue-800">{ai_recommendations.executive_summary}</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Immediate Actions</h3>
              <ul className="space-y-1">
                {ai_recommendations.immediate_actions.map((a, i) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="text-blue-500 shrink-0">&#x2022;</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Budget Recs</h3>
              <ul className="space-y-1">
                {ai_recommendations.budget_recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="text-blue-500 shrink-0">&#x2022;</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Next Tests</h3>
              <ul className="space-y-1">
                {ai_recommendations.next_tests.map((t, i) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="text-blue-500 shrink-0">&#x2022;</span>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>
        <div className="space-y-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {p.product_type}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-500">
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
                <p className="text-sm text-gray-600 mb-2">
                  Spend: <span className="font-medium">${p.total_spend.toFixed(2)}</span>
                </p>
              )}

              {/* Top winner */}
              {p.top_winner && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-2">
                  <span className="font-medium text-green-800">Top Winner:</span>{" "}
                  <span className="text-green-700">&ldquo;{p.top_winner.headline}&rdquo;</span>
                  <span className="text-green-600 ml-2">
                    CTR {p.top_winner.ctr.toFixed(2)}% &middot; {p.top_winner.impressions.toLocaleString()} impressions
                  </span>
                </div>
              )}

              {/* Recent actions */}
              {p.recent_actions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Recent optimizer actions:</p>
                  <div className="space-y-1">
                    {p.recent_actions.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium ${
                            a.action === "paused"
                              ? "bg-red-100 text-red-700"
                              : a.action === "promoted"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {a.action}
                        </span>
                        <span className="text-gray-500 truncate">{a.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {products.length === 0 && (
            <p className="text-gray-500 text-sm">
              No products yet. Add a product and generate some bulk ads to see data here.
            </p>
          )}
        </div>
      </div>

      {/* Winners & Losers */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Winners */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Winners</h2>
          {top_winners.length > 0 ? (
            <div className="space-y-2">
              {top_winners.map((w, i) => (
                <div
                  key={w.variation_id}
                  className="bg-white border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {i + 1}. {w.headline}
                    </p>
                    <p className="text-xs text-gray-500">
                      {w.impressions.toLocaleString()} impressions &middot; ${w.spend.toFixed(2)} spend
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-bold text-green-600">{w.ctr.toFixed(2)}% CTR</p>
                    <p className="text-xs text-gray-500">${w.cpm.toFixed(2)} CPM</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No winners yet. Run some ads and the optimizer will find them.</p>
          )}
        </div>

        {/* Losers */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Worst Performers</h2>
          {worst_losers.length > 0 ? (
            <div className="space-y-2">
              {worst_losers.map((l, i) => (
                <div
                  key={l.variation_id}
                  className="bg-white border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {i + 1}. {l.headline}
                    </p>
                    <p className="text-xs text-gray-500">
                      {l.impressions.toLocaleString()} impressions &middot; ${l.spend.toFixed(2)} spend
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-bold text-red-600">${l.cpm.toFixed(2)} CPM</p>
                    <p className="text-xs text-gray-500">{l.ctr.toFixed(2)}% CTR</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No losers paused yet. The optimizer will flag underperformers.</p>
          )}
        </div>
      </div>

      {/* Content Performance */}
      {summary.content_performance.posts_tracked > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
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
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-600",
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
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
