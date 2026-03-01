"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Product, type ContentPiece } from "@/lib/api";

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listProducts(), api.listContent()])
      .then(([p, c]) => {
        setProducts(p);
        setContent(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  const draftCount = content.filter((c) => c.status === "draft").length;
  const approvedCount = content.filter((c) => c.status === "approved").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your content automation
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            New Product
          </Link>
          <Link
            href="/generate"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Generate Content
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products" value={products.length} />
        <StatCard label="Total Content" value={content.length} />
        <StatCard label="Drafts" value={draftCount} />
        <StatCard label="Approved" value={approvedCount} />
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Content
        </h2>
        {content.length === 0 ? (
          <p className="text-gray-500">
            No content yet.{" "}
            <Link href="/generate" className="text-blue-600 hover:underline">
              Generate some
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {content.slice(0, 10).map((piece) => (
              <Link
                key={piece.id}
                href={`/content/${piece.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {piece.title || "Untitled"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {piece.content_type} &middot; {piece.platform}
                  </p>
                </div>
                <StatusBadge status={piece.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
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
