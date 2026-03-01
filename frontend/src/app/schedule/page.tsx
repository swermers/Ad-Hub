"use client";

import { useEffect, useState } from "react";
import {
  api,
  ScheduledPost,
  Product,
  ContentPiece,
  PlatformConnection,
} from "@/lib/api";

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

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      posting: "bg-yellow-100 text-yellow-800",
      posted: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return <div className="text-gray-500">Loading schedule...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">
            Manage scheduled and published posts
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Cancel" : "Schedule Post"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductSelect(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content (approved only)
                  </label>
                  <select
                    value={contentId}
                    onChange={(e) => setContentId(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Connection
                  </label>
                  <select
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select connection...</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.platform} — {c.platform_account_name || c.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule For
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="posting">Posting</option>
          <option value="posted">Posted</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All platforms</option>
          <option value="twitter">Twitter</option>
          <option value="meta">Meta</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No scheduled posts yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Schedule content to be published on your connected platforms.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Content</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled For</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {post.content_title || "Untitled"}
                    </p>
                    {post.content_body_preview && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                        {post.content_body_preview}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{post.platform || "—"}</span>
                    {post.platform_account_name && (
                      <span className="text-gray-400 ml-1 text-xs">
                        ({post.platform_account_name})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(post.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(post.status)}`}
                    >
                      {post.status}
                    </span>
                    {post.error && (
                      <p className="text-xs text-red-500 mt-1">{post.error}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {post.status !== "posted" && (
                        <>
                          <button
                            onClick={() => handlePostNow(post.id)}
                            className="text-xs px-2 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                          >
                            Post Now
                          </button>
                          <button
                            onClick={() => handleCancel(post.id)}
                            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {post.posted_at && (
                        <span className="text-xs text-gray-400">
                          Posted {new Date(post.posted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
