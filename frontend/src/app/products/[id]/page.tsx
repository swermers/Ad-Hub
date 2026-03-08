"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type Product,
  type CrawledPage,
  type CrawlStatus,
} from "@/lib/api";

const PRODUCT_TYPES = [
  { value: "saas", label: "SaaS / Software" },
  { value: "physical", label: "Physical Product" },
  { value: "service", label: "Service Business" },
  { value: "other", label: "Other" },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const interval = setInterval(async () => {
        const p = await api.getProduct(id);
        setProduct(p);
        if (p.brand_brief) {
          clearInterval(interval);
          setGeneratingBrief(false);
        }
      }, 3000);
      setTimeout(() => {
        clearInterval(interval);
        setGeneratingBrief(false);
      }, 60000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Brief generation failed");
      setGeneratingBrief(false);
    }
  };

  const handleProductTypeChange = async (type: string) => {
    if (!product) return;
    const updated = await api.updateProduct(id, { product_type: type });
    setProduct(updated);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadScreenshot(id, file);
      }
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteScreenshot = async (path: string) => {
    try {
      await api.deleteScreenshot(id, path);
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) {
      console.error(err);
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

  const screenshots: string[] = product.screenshots ? JSON.parse(product.screenshots) : [];
  const brandColors: string[] = product.brand_colors ? JSON.parse(product.brand_colors) : [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500 mt-1">{product.description}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/bulk-generate?product_id=${product.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Bulk Ads
          </Link>
          <Link
            href={`/generate?product_id=${product.id}`}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Generate Content
          </Link>
        </div>
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
            <span className="text-gray-500 block mb-2">Product Type:</span>
            <div className="flex gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleProductTypeChange(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    product.product_type === t.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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

      {/* Screenshots Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Screenshots & Visual Context
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleScreenshotUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Screenshots"}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Upload screenshots of your product, website, or competitor ads. These help generate more accurate, brand-loyal ad copy.
        </p>

        {screenshots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-400 text-sm">No screenshots yet. Upload some or crawl your website to auto-capture.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {screenshots.map((path, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${path}`}
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={() => handleDeleteScreenshot(path)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Colors */}
      {brandColors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Extracted Brand Colors
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Colors detected from your website. These are used to style ad templates.
          </p>
          <div className="flex flex-wrap gap-3">
            {brandColors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono text-gray-600">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
