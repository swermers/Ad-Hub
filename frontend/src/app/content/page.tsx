"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ContentPiece, type Product } from "@/lib/api";
import { TemplateRenderer } from "@/components/ad-templates/TemplateRenderer";
import type { AspectRatio } from "@/components/ad-templates/types";

export default function ContentPage() {
  const [content, setContent] = useState<ContentPiece[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
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
        const map: Record<string, Product> = {};
        for (const prod of p) map[prod.id] = prod;
        setProductMap(map);
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
            <ContentCard
              key={piece.id}
              piece={piece}
              product={productMap[piece.product_id]}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentCard({
  piece,
  product,
  onStatusChange,
}: {
  piece: ContentPiece;
  product?: Product;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isVisual =
    piece.content_type === "ad_copy" || piece.content_type === "social_post";

  // Extract brand colors from product
  let brandColors: string[] = [];
  if (product?.brand_colors) {
    try {
      brandColors = JSON.parse(product.brand_colors);
    } catch {
      /* */
    }
  }
  if (product?.brand_brief && brandColors.length === 0) {
    try {
      const brief = JSON.parse(product.brand_brief);
      brandColors = brief?.visual_identity?.primary_colors || [];
    } catch {
      /* */
    }
  }

  const bgColor = brandColors[0] || "#0f0f23";
  const accentColor = brandColors[1] || brandColors[0] || "#6c63ff";

  // Get screenshot
  let screenshotUrl: string | undefined;
  if (product?.screenshots) {
    try {
      const shots = JSON.parse(product.screenshots);
      if (shots.length > 0) {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        screenshotUrl = `${apiUrl}${shots[0]}`;
      }
    } catch {
      /* */
    }
  }

  const headline =
    piece.hook || piece.title || piece.body.split("\n")[0].slice(0, 50);
  const bodyText = piece.hook
    ? piece.body.replace(piece.hook, "").trim().slice(0, 80)
    : piece.body.split("\n").slice(1).join(" ").trim().slice(0, 80);
  const ctaText = piece.cta || "Learn More";

  const templateType = piece.template_type || "bold_hook";
  const aspectRatio: AspectRatio =
    (piece.aspect_ratio as AspectRatio) || "1:1";

  // Thumbnail is a small fixed-size square
  const thumbSize = 100;

  const typeLabel: Record<string, string> = {
    social_post: "Social Post",
    ad_copy: "Ad Copy",
    email: "Email",
    blog_draft: "Blog Draft",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4">
      {/* Visual thumbnail */}
      {isVisual && (
        <Link href={`/content/${piece.id}`} className="flex-shrink-0">
          <div
            className="rounded-lg overflow-hidden border border-gray-100 shadow-sm"
            style={{ width: thumbSize, height: thumbSize }}
          >
            <div
              style={{
                transform: `scale(${thumbSize / 1080})`,
                transformOrigin: "top left",
                width: 1080,
                height: 1080,
              }}
            >
              <TemplateRenderer
                templateType={templateType}
                headline={headline}
                body={bodyText}
                cta={ctaText}
                aspectRatio={aspectRatio}
                backgroundColor={bgColor}
                textColor="#ffffff"
                accentColor={accentColor}
                screenshotUrl={screenshotUrl}
              />
            </div>
          </div>
        </Link>
      )}

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <Link href={`/content/${piece.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate">
              {piece.title || "Untitled"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {typeLabel[piece.content_type] || piece.content_type} &middot;{" "}
              {piece.platform} &middot; {piece.funnel_stage}
            </p>
          </Link>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <StatusBadge status={piece.status} />
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{piece.body}</p>
        <div className="flex gap-2">
          {piece.status === "draft" && (
            <>
              <button
                onClick={() => onStatusChange(piece.id, "approved")}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => onStatusChange(piece.id, "rejected")}
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
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: {
      bg: "bg-yellow-50 text-yellow-700 border-yellow-200",
      dot: "bg-yellow-400",
    },
    approved: {
      bg: "bg-green-50 text-green-700 border-green-200",
      dot: "bg-green-400",
    },
    posted: {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
    },
    rejected: {
      bg: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-400",
    },
  };
  const c = config[status] || {
    bg: "bg-gray-50 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
