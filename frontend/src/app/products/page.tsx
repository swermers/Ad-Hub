"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api, Product } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "text-green-400";
    case "draft":
      return "text-yellow-400";
    case "archived":
      return "text-[#E5E1E4]/40";
    default:
      return "text-[#E5E1E4]/60";
  }
}

function statusDot(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-500";
    case "draft":
      return "bg-yellow-400";
    case "archived":
      return "bg-[#E5E1E4]/30";
    default:
      return "bg-[#E5E1E4]/40";
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ── Loading skeleton ── */
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={4 + index}
      className="rounded-2xl overflow-hidden bg-[#1b1b1d] border border-[#353437] p-5 space-y-4 animate-pulse"
    >
      <div className="h-5 w-2/3 rounded bg-[#353437]" />
      <div className="h-3 w-full rounded bg-[#353437]/60" />
      <div className="h-3 w-4/5 rounded bg-[#353437]/60" />
      <div className="flex items-center gap-2 pt-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[#353437]" />
        <div className="h-3 w-16 rounded bg-[#353437]/60" />
      </div>
      <div className="h-8 w-full rounded-lg bg-[#353437]/40 mt-2" />
    </motion.div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listProducts()
      .then((items) => {
        setProducts(items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to load products");
        setLoading(false);
      });
  }, []);

  /* ── Computed stats ── */
  const totalCount = products.length;
  const typeBreakdown = products.reduce<Record<string, number>>((acc, p) => {
    const t = p.product_type || "Other";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const activeCount = products.filter(
    (p) => p.status?.toLowerCase() === "active"
  ).length;

  return (
    <div className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <p className="text-[#FF9500] text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">
            Product Management
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Product{" "}
            <span className="text-[#554334]/40">Atelier</span>
          </h1>
        </div>

        <div className="flex gap-3">
          <Link href="/products/new">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full px-5 py-2.5 text-sm font-bold bg-[#FF9500] text-[#2d1600] hover:brightness-110 transition"
            >
              + Add Product
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Products */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="glass-prism rounded-2xl p-5 border-l-2 border-[#FF9500]"
        >
          <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50 mb-1">
            Total Products
          </p>
          <p className="text-3xl font-black tracking-tight">
            {loading ? (
              <span className="inline-block h-8 w-12 rounded bg-[#353437] animate-pulse" />
            ) : (
              totalCount
            )}
          </p>
        </motion.div>

        {/* Active Products */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="glass-prism rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50">
              Active
            </p>
          </div>
          <p className="text-3xl font-black tracking-tight">
            {loading ? (
              <span className="inline-block h-8 w-12 rounded bg-[#353437] animate-pulse" />
            ) : (
              activeCount
            )}
          </p>
        </motion.div>

        {/* Product Types */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="glass-prism rounded-2xl p-5"
        >
          <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50 mb-1">
            Product Types
          </p>
          {loading ? (
            <span className="inline-block h-8 w-20 rounded bg-[#353437] animate-pulse" />
          ) : totalCount === 0 ? (
            <p className="text-lg font-semibold text-[#E5E1E4]/40">&mdash;</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(typeBreakdown).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9500]/10 border border-[#FF9500]/20 px-3 py-1 text-xs font-medium text-[#FF9500]"
                >
                  {type}
                  <span className="text-[#E5E1E4]/50">{count}</span>
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="glass-prism rounded-2xl p-6 border border-red-500/30 text-center"
        >
          <p className="text-red-400 font-medium mb-2">Failed to load products</p>
          <p className="text-sm text-[#E5E1E4]/50 mb-4">{error}</p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setError(null);
              setLoading(true);
              api
                .listProducts()
                .then((items) => {
                  setProducts(items);
                  setLoading(false);
                })
                .catch((err) => {
                  setError(err?.message ?? "Failed to load products");
                  setLoading(false);
                });
            }}
            className="rounded-full px-5 py-2 text-sm font-semibold border border-red-500/40 text-red-400 hover:border-red-400 transition-colors"
          >
            Retry
          </motion.button>
        </motion.div>
      )}

      {/* ── Product Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Loading skeletons */}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}

        {/* Real product cards */}
        {!loading &&
          products.map((product, i) => (
            <motion.div
              key={product.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4 + i}
              className="group relative rounded-2xl overflow-hidden bg-[#1b1b1d] border border-[#353437] hover:border-[#FF9500]/40 transition-colors"
            >
              <Link href={`/products/${product.id}`} className="block p-5 space-y-3">
                {/* Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-lg tracking-tight text-[#E5E1E4] group-hover:text-[#FF9500] transition-colors leading-tight">
                    {product.name}
                  </h3>
                  <span className="flex items-center gap-1.5 shrink-0 mt-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${statusDot(product.status)}`}
                    />
                    <span
                      className={`text-xs font-medium capitalize ${statusColor(product.status)}`}
                    >
                      {product.status || "unknown"}
                    </span>
                  </span>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-[#E5E1E4]/50 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-[#E5E1E4]/40 pt-1">
                  {product.product_type && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                      {product.product_type}
                    </span>
                  )}
                  {product.website_url && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-4.247m0 0A8.966 8.966 0 013 12c0-1.528.38-2.967 1.05-4.228" />
                      </svg>
                      <span className="truncate">{product.website_url.replace(/^https?:\/\//, "")}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {formatDate(product.created_at)}
                  </span>
                </div>

                {/* Edit button area */}
                <div className="pt-2">
                  <span className="block w-full text-center rounded-lg py-2 text-xs font-semibold uppercase tracking-wider border border-[#554334] text-[#E5E1E4]/80 group-hover:border-[#FF9500] group-hover:text-[#FF9500] transition-colors">
                    Edit Product
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}

        {/* Empty State / Add Card — always shown when not loading */}
        {!loading && (
          <Link href="/products/new">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4 + products.length}
              className={`rounded-2xl border-2 border-dashed border-[#353437] flex flex-col items-center justify-center gap-3 hover:border-[#FF9500]/40 transition-colors cursor-pointer group ${
                products.length === 0 ? "min-h-[280px]" : "min-h-[220px]"
              }`}
            >
              <div className="w-12 h-12 rounded-full border-2 border-[#554334] group-hover:border-[#FF9500] flex items-center justify-center transition-colors">
                <svg
                  className="w-5 h-5 text-[#554334] group-hover:text-[#FF9500] transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-[#E5E1E4]/40 group-hover:text-[#E5E1E4]/60 transition-colors">
                {products.length === 0
                  ? "Create your first product"
                  : "Add new product"}
              </p>
              {products.length === 0 && (
                <p className="text-xs text-[#E5E1E4]/25 max-w-[200px] text-center">
                  Get started by adding a product to manage your ads and campaigns.
                </p>
              )}
            </motion.div>
          </Link>
        )}
      </div>
    </div>
  );
}
