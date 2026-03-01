"use client";

import { useEffect, useState } from "react";
import {
  api,
  AnalyticsOverview,
  TopPerformer,
  Insights,
  Product,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedProduct, days]);

  async function loadProducts() {
    try {
      const prods = await api.listProducts();
      setProducts(prods);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const [ov, top] = await Promise.all([
        api.getOverview(selectedProduct || undefined, days),
        api.getTopPerformers(selectedProduct || undefined),
      ]);
      setOverview(ov);
      setTopPerformers(top);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    if (!selectedProduct) {
      alert("Select a product to generate insights.");
      return;
    }
    setInsightsLoading(true);
    try {
      const ins = await api.getInsights(selectedProduct);
      setInsights(ins);
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function handleCollect() {
    try {
      const result = await api.triggerCollect();
      alert(`Collected metrics for ${result.collected} posts.`);
      await loadAnalytics();
    } catch (err) {
      console.error("Failed to collect:", err);
      alert("Failed to trigger metric collection.");
    }
  }

  const statCards = overview
    ? [
        { label: "Impressions", value: overview.total_impressions.toLocaleString() },
        { label: "Clicks", value: overview.total_clicks.toLocaleString() },
        { label: "Avg CTR", value: `${overview.avg_ctr.toFixed(2)}%` },
        { label: "Likes", value: overview.total_likes.toLocaleString() },
        { label: "Shares", value: overview.total_shares.toLocaleString() },
        { label: "Comments", value: overview.total_comments.toLocaleString() },
        { label: "Conversions", value: overview.total_conversions.toLocaleString() },
        { label: "Spend", value: `$${overview.total_spend.toFixed(2)}` },
      ]
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Performance metrics and AI-powered insights
          </p>
        </div>
        <button
          onClick={handleCollect}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Collect Metrics
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {overview && (
            <p className="text-sm text-gray-400 mb-6">
              Tracking {overview.posts_tracked} posts over {overview.period_days} days
            </p>
          )}

          {/* Top Performers */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Performing Content
            </h2>
            {topPerformers.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No performance data yet. Publish content and collect metrics to see results.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Content</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">CTR</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Likes</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topPerformers.map((tp, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">
                            {tp.title || "Untitled"}
                          </p>
                          {tp.body_preview && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                              {tp.body_preview}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize">{tp.platform}</td>
                        <td className="px-4 py-3 text-right">
                          {tp.total_impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tp.total_clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(tp.avg_ctr * 100).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tp.total_likes.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tp.total_shares.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                AI Insights
              </h2>
              <button
                onClick={loadInsights}
                disabled={insightsLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {insightsLoading ? "Generating..." : "Generate Insights"}
              </button>
            </div>

            {insights ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Key Insights
                  </h3>
                  <ul className="space-y-2">
                    {insights.insights.map((item, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-blue-500 mt-0.5 shrink-0">&#8226;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((item, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-green-500 mt-0.5 shrink-0">&#8226;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Content Angles to Explore
                  </h3>
                  <ul className="space-y-2">
                    {(insights.content_angles || []).map((item, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-purple-500 mt-0.5 shrink-0">&#8226;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  Select a product and click &quot;Generate Insights&quot; to get
                  AI-powered optimization recommendations.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
