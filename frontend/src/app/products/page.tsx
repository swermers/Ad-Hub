"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FF9500] animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9500]">
            Loading
          </span>
        </div>
      </div>
    );

  return (
    <div className="relative">
      <div className="liquid-glow top-0 right-[-10%] opacity-30" />

      <div className="flex items-center justify-between mb-12 entrance-fade stagger-2">
        <div>
          <span className="uppercase tracking-[0.2em] text-[#FF9500] font-bold text-xs mb-4 block">
            Product Catalog
          </span>
          <h1 className="text-5xl font-extrabold tracking-tighter text-[#E5E1E4] leading-none">
            Products
          </h1>
        </div>
        <Link
          href="/products/new"
          className="bg-[#FF9500] text-[#2d1600] px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all haptic-btn shadow-[0_8px_32px_rgba(255,149,0,0.2)] flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="glass-card-subtle p-16 rounded-3xl text-center entrance-fade stagger-3">
          <span className="material-symbols-outlined text-5xl text-[#FF9500]/40 mb-4 block">
            inventory_2
          </span>
          <h3 className="text-xl font-bold mb-2">No products yet</h3>
          <p className="text-[#dbc2ad] mb-6">
            Add your first product to start generating content.
          </p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 bg-[#FF9500] text-[#2d1600] px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all haptic-btn"
          >
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="glass-card-subtle p-8 rounded-2xl group entrance-fade"
              style={{ animationDelay: `${0.15 + index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-[#E5E1E4] text-lg group-hover:text-[#FF9500] transition-colors duration-200">
                  {product.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    product.status === "active"
                      ? "badge-active"
                      : "badge-draft"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <p className="text-sm text-[#dbc2ad] line-clamp-2 mb-4 leading-relaxed">
                {product.description || "No description"}
              </p>
              {product.website_url && (
                <p className="text-[10px] text-[#E5E1E4]/30 truncate uppercase tracking-wider font-medium">
                  {product.website_url}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
