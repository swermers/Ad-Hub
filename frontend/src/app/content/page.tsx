"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ContentPiece, type Product } from "@/lib/api";

export default function ContentPage() {
  const [content, setContent] = useState<ContentPiece[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    Promise.all([
      api.listContent({
        product_id: filterProduct || undefined,
        status: filterStatus || undefined,
        content_type: filterType || undefined,
      }),
      api.listProducts(),
    ])
      .then(([c, p]) => {
        setContent(c);
        setProducts(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterProduct, filterStatus, filterType]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await api.updateContentStatus(id, status);
      setContent((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Queue</h1>
          <p className="text-gray-500 mt-1">
            Review and manage generated content
          </p>
        </div>
        <Link
          href="/generate"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Generate More
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterProduct}
          onChange={(e) => {
            setFilterProduct(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="social_post">Social Post</option>
          <option value="ad_copy">Ad Copy</option>
          <option value="email">Email</option>
          <option value="blog_draft">Blog Draft</option>
        </select>
      </div>

      {/* Content List */}
      {content.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No content found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map((piece) => (
            <div
              key={piece.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <Link
                  href={`/content/${piece.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    {piece.title || "Untitled"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {piece.content_type} &middot; {piece.platform} &middot;{" "}
                    {piece.funnel_stage}
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-4">
                  <StatusBadge status={piece.status} />
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {piece.body}
              </p>
              <div className="flex gap-2">
                {piece.status === "draft" && (
                  <>
                    <button
                      onClick={() => handleStatusChange(piece.id, "approved")}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(piece.id, "rejected")}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
                <Link
                  href={`/content/${piece.id}`}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                >
                  View / Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    posted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
