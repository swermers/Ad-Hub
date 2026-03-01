"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, type Product, type GenerateStatus } from "@/lib/api";

function GenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<GenerateStatus | null>(null);

  const [productId, setProductId] = useState(
    searchParams.get("product_id") || ""
  );
  const [contentTypes, setContentTypes] = useState<string[]>(["social_post"]);
  const [platforms, setPlatforms] = useState<string[]>(["twitter"]);
  const [count, setCount] = useState(5);
  const [funnelStage, setFunnelStage] = useState("awareness");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    api
      .listProducts()
      .then((p) => {
        setProducts(p);
        if (!productId && p.length > 0) setProductId(p[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  const handleGenerate = async () => {
    if (!productId) return;
    setGenerating(true);
    setStatus(null);

    try {
      const result = await api.generateContent(productId, {
        content_types: contentTypes,
        platforms,
        count,
        funnel_stage: funnelStage,
        instructions: instructions || undefined,
      });
      setStatus(result);

      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const s = await api.getGenerateStatus(productId, result.task_id);
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            clearInterval(interval);
            setGenerating(false);
            if (s.status === "completed") {
              router.push(`/content?product_id=${productId}`);
            }
          }
        } catch {
          clearInterval(interval);
          setGenerating(false);
        }
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Generate Content
      </h1>
      <p className="text-gray-500 mb-8">
        Select your product, content type, and platform to generate marketing
        content.
      </p>

      <div className="space-y-6">
        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Types
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              ["social_post", "Social Post"],
              ["ad_copy", "Ad Copy"],
              ["email", "Email"],
              ["blog_draft", "Blog Draft"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleItem(contentTypes, setContentTypes, value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  contentTypes.includes(value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              ["twitter", "Twitter/X"],
              ["linkedin", "LinkedIn"],
              ["meta", "Meta/Facebook"],
              ["google", "Google Ads"],
              ["general", "General"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggleItem(platforms, setPlatforms, value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  platforms.includes(value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Funnel Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Funnel Stage
          </label>
          <div className="flex gap-2">
            {[
              ["awareness", "Awareness"],
              ["consideration", "Consideration"],
              ["conversion", "Conversion"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFunnelStage(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  funnelStage === value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variations per type/platform ({count})
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="e.g., Focus on the new curation features and how they save time..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Status */}
        {status && generating && (
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            Status: {status.status} | Pieces generated:{" "}
            {status.pieces_generated}
          </div>
        )}

        {status?.status === "failed" && (
          <div className="p-4 bg-red-50 rounded-lg text-sm text-red-700">
            Generation failed: {status.error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !productId || contentTypes.length === 0}
          className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Content"}
        </button>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
      <GenerateForm />
    </Suspense>
  );
}
