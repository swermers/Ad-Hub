"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Product,
  type CrawledPage,
  type CrawlStatus,
} from "@/lib/api";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [p, pg] = await Promise.all([
        api.getProduct(id),
        api.listCrawledPages(id),
      ]);
      setProduct(p);
      setPages(pg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const status = await api.startCrawl(id);
      setCrawlStatus(status);
      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const s = await api.getCrawlStatus(id, status.task_id);
          setCrawlStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            clearInterval(interval);
            setCrawling(false);
            loadData();
          }
        } catch {
          clearInterval(interval);
          setCrawling(false);
        }
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Crawl failed");
      setCrawling(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    try {
      await api.generateBrief(id);
      // Brief generation is async, poll product for updates
      const interval = setInterval(async () => {
        const p = await api.getProduct(id);
        setProduct(p);
        if (p.brand_brief) {
          clearInterval(interval);
          setGeneratingBrief(false);
        }
      }, 3000);
      // Timeout after 60s
      setTimeout(() => {
        clearInterval(interval);
        setGeneratingBrief(false);
      }, 60000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Brief generation failed");
      setGeneratingBrief(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!product) return <div className="text-red-500">Product not found</div>;

  let briefData: Record<string, unknown> | null = null;
  if (product.brand_brief) {
    try {
      briefData = JSON.parse(product.brand_brief);
    } catch {
      briefData = null;
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500 mt-1">{product.description}</p>
        </div>
        <Link
          href={`/generate?product_id=${product.id}`}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Generate Content
        </Link>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Product Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Website:</span>{" "}
            <span className="text-gray-900">
              {product.website_url || "Not set"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <span className="text-gray-900">{product.status}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Target Audience:</span>{" "}
            <span className="text-gray-900">
              {product.target_audience || "Not set"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Pain Points:</span>{" "}
            <span className="text-gray-900">
              {product.pain_points || "Not set"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Differentiators:</span>{" "}
            <span className="text-gray-900">
              {product.differentiators || "Not set"}
            </span>
          </div>
        </div>
      </div>

      {/* Crawl Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Website Crawl
          </h2>
          <button
            onClick={handleCrawl}
            disabled={crawling || !product.website_url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {crawling ? "Crawling..." : "Crawl Website"}
          </button>
        </div>

        {crawlStatus && crawling && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Status: {crawlStatus.status} | Pages crawled:{" "}
            {crawlStatus.pages_crawled}
          </div>
        )}

        {pages.length === 0 ? (
          <p className="text-gray-500 text-sm">No pages crawled yet</p>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {page.title || page.url}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{page.url}</p>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {page.page_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Brief Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Brand Brief</h2>
          <button
            onClick={handleGenerateBrief}
            disabled={generatingBrief}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingBrief ? "Generating..." : "Generate Brief"}
          </button>
        </div>

        {!briefData ? (
          <p className="text-gray-500 text-sm">
            No brand brief yet. Crawl your website first, then generate a brief.
          </p>
        ) : (
          <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(briefData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
