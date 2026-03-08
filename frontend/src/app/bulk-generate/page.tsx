"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type Product,
  type AdTemplate,
  type PainPointItem,
  type AdVariation,
  type BulkGenerateStatus,
  type ResearchStatus,
} from "@/lib/api";
import { TemplateRenderer, TEMPLATE_OPTIONS } from "@/components/ad-templates/TemplateRenderer";
import { AdPreviewCard } from "@/components/ad-templates/AdPreviewCard";
import { exportAdsAsZip } from "@/lib/export";

type Step = "product" | "template" | "pain_points" | "configure" | "preview";

export default function BulkGeneratePage() {
  const [step, setStep] = useState<Step>("product");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [templates, setTemplates] = useState<AdTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateType, setSelectedTemplateType] = useState("pain_solution");
  const [painPoints, setPainPoints] = useState<PainPointItem[]>([]);
  const [selectedPainPointIds, setSelectedPainPointIds] = useState<string[]>([]);
  const [variationsPerPoint, setVariationsPerPoint] = useState(5);
  const [funnelStage, setFunnelStage] = useState("awareness");
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [selectedVariationIds, setSelectedVariationIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [researching, setResearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [expandedVariation, setExpandedVariation] = useState<AdVariation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (productId) {
      api.listTemplates(productId).then(setTemplates).catch(console.error);
      api.listPainPoints(productId).then(setPainPoints).catch(console.error);
    }
  }, [productId]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName || !selectedTemplateType) return;
    const t = await api.createTemplate({
      product_id: productId || undefined,
      name: newTemplateName,
      template_type: selectedTemplateType,
    });
    setTemplates((prev) => [t, ...prev]);
    setSelectedTemplateId(t.id);
    setShowCreateTemplate(false);
    setNewTemplateName("");
  };

  const handleResearchPainPoints = async () => {
    if (!productId) return;
    setResearching(true);
    try {
      const result = await api.researchPainPoints(productId, 20);
      const interval = setInterval(async () => {
        const s: ResearchStatus = await api.getResearchStatus(productId, result.task_id);
        if (s.status === "completed" || s.status === "failed") {
          clearInterval(interval);
          setResearching(false);
          if (s.status === "completed") {
            const points = await api.listPainPoints(productId);
            setPainPoints(points);
          }
        }
      }, 2000);
    } catch {
      setResearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!productId || !selectedTemplateId || selectedPainPointIds.length === 0) return;
    setGenerating(true);

    try {
      const result = await api.bulkGenerate(productId, {
        template_id: selectedTemplateId,
        pain_point_ids: selectedPainPointIds,
        variations_per_pain_point: variationsPerPoint,
        funnel_stage: funnelStage,
      });

      const interval = setInterval(async () => {
        const s: BulkGenerateStatus = await api.getBulkGenerateStatus(productId, result.task_id);
        if (s.status === "completed" || s.status === "failed") {
          clearInterval(interval);
          setGenerating(false);
          if (s.status === "completed" && s.batch_id) {
            const vars = await api.listVariations(productId, s.batch_id);
            setVariations(vars);
            setStep("preview");
          }
        }
      }, 2000);
    } catch {
      setGenerating(false);
    }
  };

  const togglePainPoint = (id: string) => {
    setSelectedPainPointIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleVariation = (id: string) => {
    setSelectedVariationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVariations = () => {
    if (selectedVariationIds.length === variations.length) {
      setSelectedVariationIds([]);
    } else {
      setSelectedVariationIds(variations.map((v) => v.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedVariationIds.length === 0) return;
    await api.bulkUpdateVariationStatus(selectedVariationIds, "approved");
    setVariations((prev) =>
      prev.map((v) =>
        selectedVariationIds.includes(v.id) ? { ...v, status: "approved" } : v
      )
    );
  };

  const handleExportZip = useCallback(async () => {
    const toExport = variations.filter((v) => selectedVariationIds.includes(v.id));
    if (toExport.length === 0) return;

    setExporting(true);
    setExportProgress({ current: 0, total: toExport.length });

    // Wait for DOM to render the hidden full-size elements
    await new Promise((r) => setTimeout(r, 100));

    const elements = toExport
      .map((v) => {
        const el = document.getElementById(`export-ad-${v.id}`);
        if (!el) return null;
        return { id: v.id, element: el, name: `ad_${v.headline.replace(/\W+/g, "_").slice(0, 40)}_${v.id.slice(0, 8)}` };
      })
      .filter(Boolean) as { id: string; element: HTMLElement; name: string }[];

    try {
      await exportAdsAsZip(elements, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [variations, selectedVariationIds]);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Ad Generator</h1>
      <p className="text-gray-500 mb-6">
        Generate hundreds of ad variations from pain points, preview them, and export or upload to Facebook.
      </p>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {(["product", "template", "pain_points", "configure", "preview"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full ${
              (["product", "template", "pain_points", "configure", "preview"] as Step[]).indexOf(step) >= i
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Product */}
      {step === "product" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Select Product</h2>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">Choose a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div>
            <button
              onClick={() => productId && setStep("template")}
              disabled={!productId}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Template */}
      {step === "template" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Choose Ad Template</h2>
            <button
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Create new
            </button>
          </div>

          {showCreateTemplate && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedTemplateType(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      selectedTemplateType === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={handleCreateTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Create Template
              </button>
            </div>
          )}

          {/* Template preview cards */}
          <div className="grid grid-cols-3 gap-6">
            {TEMPLATE_OPTIONS.map((opt) => {
              const existingTemplate = templates.find((t) => t.template_type === opt.value);
              const isSelected = existingTemplate
                ? selectedTemplateId === existingTemplate.id
                : selectedTemplateType === opt.value && !selectedTemplateId;

              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (existingTemplate) {
                      setSelectedTemplateId(existingTemplate.id);
                      setSelectedTemplateType(existingTemplate.template_type);
                    } else {
                      setSelectedTemplateType(opt.value);
                      setSelectedTemplateId("");
                    }
                  }}
                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected ? "border-blue-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div style={{ width: 270, height: 270, overflow: "hidden" }}>
                    <div style={{ transform: "scale(0.25)", transformOrigin: "top left" }}>
                      <TemplateRenderer
                        templateType={opt.value}
                        headline="Your Headline Here"
                        body="Your ad body text goes here to show the layout"
                        cta="Try Free"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("product")} className="px-6 py-2 border border-gray-300 rounded-lg text-sm">
              Back
            </button>
            <button
              onClick={async () => {
                if (!selectedTemplateId && selectedTemplateType) {
                  const t = await api.createTemplate({
                    product_id: productId || undefined,
                    name: TEMPLATE_OPTIONS.find((o) => o.value === selectedTemplateType)?.label || selectedTemplateType,
                    template_type: selectedTemplateType,
                  });
                  setSelectedTemplateId(t.id);
                  setTemplates((prev) => [t, ...prev]);
                }
                setStep("pain_points");
              }}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Pain Points */}
      {step === "pain_points" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Select Pain Points</h2>
            <button
              onClick={handleResearchPainPoints}
              disabled={researching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {researching ? "Researching..." : "AI Research Pain Points"}
            </button>
          </div>

          {painPoints.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500 mb-4">No pain points yet. Use AI to research them or add manually.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setSelectedPainPointIds(painPoints.map((p) => p.id))}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedPainPointIds([])}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {painPoints.map((pp) => (
                  <label
                    key={pp.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPainPointIds.includes(pp.id)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPainPointIds.includes(pp.id)}
                      onChange={() => togglePainPoint(pp.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{pp.pain_point}</p>
                      {pp.desired_outcome && (
                        <p className="text-xs text-gray-500 mt-1">{pp.desired_outcome}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{pp.category}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          severity: {pp.severity}/10
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          <p className="text-sm text-gray-500">
            {selectedPainPointIds.length} selected &times; {variationsPerPoint} variations ={" "}
            <strong>{selectedPainPointIds.length * variationsPerPoint} total ads</strong>
          </p>

          <div className="flex gap-3">
            <button onClick={() => setStep("template")} className="px-6 py-2 border border-gray-300 rounded-lg text-sm">
              Back
            </button>
            <button
              onClick={() => setStep("configure")}
              disabled={selectedPainPointIds.length === 0}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Configure */}
      {step === "configure" && (
        <div className="space-y-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-800">Configure Generation</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variations per pain point ({variationsPerPoint})
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={variationsPerPoint}
              onChange={(e) => setVariationsPerPoint(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Funnel Stage</label>
            <div className="flex gap-2">
              {["awareness", "consideration", "conversion"].map((stage) => (
                <button
                  key={stage}
                  onClick={() => setFunnelStage(stage)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    funnelStage === stage
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            Will generate <strong>{selectedPainPointIds.length * variationsPerPoint}</strong> ad variations
            using <strong>{TEMPLATE_OPTIONS.find((o) => o.value === selectedTemplateType)?.label}</strong> template.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("pain_points")} className="px-6 py-2 border border-gray-300 rounded-lg text-sm">
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Ads"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Preview Gallery */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Preview ({variations.length} variations)
            </h2>
            <div className="flex gap-2">
              <button onClick={selectAllVariations} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
                {selectedVariationIds.length === variations.length ? "Deselect all" : "Select all"}
              </button>
              <button
                onClick={handleBulkApprove}
                disabled={selectedVariationIds.length === 0}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                Approve ({selectedVariationIds.length})
              </button>
              <button
                onClick={handleExportZip}
                disabled={selectedVariationIds.length === 0 || exporting}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {exporting
                  ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                  : `Export ZIP (${selectedVariationIds.length})`}
              </button>
              <button
                onClick={() => setStep("configure")}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
              >
                Back
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {variations.map((v) => (
              <AdPreviewCard
                key={v.id}
                variation={v}
                selected={selectedVariationIds.includes(v.id)}
                onToggleSelect={toggleVariation}
                onClick={() => setExpandedVariation(v)}
              />
            ))}
          </div>

          {/* Hidden full-size renders for export */}
          <div
            ref={exportContainerRef}
            style={{ position: "absolute", left: "-9999px", top: 0 }}
          >
            {variations
              .filter((v) => selectedVariationIds.includes(v.id))
              .map((v) => (
                <div key={v.id} id={`export-ad-${v.id}`}>
                  <TemplateRenderer
                    templateType={v.template_type || selectedTemplateType}
                    headline={v.headline}
                    body={v.body}
                    cta={v.cta}
                    {...v.template_config}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Expanded variation modal */}
      {expandedVariation && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
          onClick={() => setExpandedVariation(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ maxHeight: "70vh", overflow: "auto", display: "flex", justifyContent: "center", padding: 24 }}>
              <div style={{ transform: "scale(0.5)", transformOrigin: "top center" }}>
                <TemplateRenderer
                  templateType={expandedVariation.template_type || selectedTemplateType}
                  headline={expandedVariation.headline}
                  body={expandedVariation.body}
                  cta={expandedVariation.cta}
                  {...expandedVariation.template_config}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 space-y-2">
              <p className="text-sm font-medium text-gray-900">{expandedVariation.headline}</p>
              <p className="text-sm text-gray-600">{expandedVariation.body}</p>
              <p className="text-xs text-gray-500">CTA: {expandedVariation.cta}</p>
              {expandedVariation.pain_point_text && (
                <p className="text-xs text-blue-600">Pain point: {expandedVariation.pain_point_text}</p>
              )}
              <button
                onClick={() => setExpandedVariation(null)}
                className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
