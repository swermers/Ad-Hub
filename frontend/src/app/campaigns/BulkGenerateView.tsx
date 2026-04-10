"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type Product,
  type AdTemplate,
  type PainPointItem,
  type AdVariation,
  type BulkGenerateStatus,
  type ResearchStatus,
  API_BASE,
} from "@/lib/api";
import { TemplateRenderer, TEMPLATE_OPTIONS } from "@/components/ad-templates/TemplateRenderer";
import { AdPreviewCard } from "@/components/ad-templates/AdPreviewCard";
import { exportAdsAsZip } from "@/lib/export";
import type { AspectRatio } from "@/components/ad-templates/types";
import { ASPECT_DIMENSIONS } from "@/components/ad-templates/types";
import { CsvBulkImport, type CsvAdRow } from "@/components/CsvBulkImport";

const VideoPreview = dynamic(
  () => import("@/components/ad-templates/remotion/VideoPreview").then((m) => m.VideoPreview),
  { ssr: false, loading: () => <div className="animate-pulse bg-white/10 rounded-lg" style={{ width: 540, height: 540 }} /> },
);

const VIDEO_STYLE_OPTIONS_PROMISE = import("@/components/ad-templates/remotion/VideoPreview").then((m) => m.VIDEO_STYLE_OPTIONS);

type VideoStyle = import("@/components/ad-templates/remotion/VideoPreview").VideoStyle;

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
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>("1:1");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"still" | "video">("still");
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("default");
  const [videoStyleOptions, setVideoStyleOptions] = useState<{ value: VideoStyle; label: string; description: string }[]>([]);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvImportedRows, setCsvImportedRows] = useState<CsvAdRow[]>([]);

  useEffect(() => {
    VIDEO_STYLE_OPTIONS_PROMISE.then(setVideoStyleOptions).catch(console.error);
  }, []);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (productId) {
      api.listTemplates(productId).then(setTemplates).catch(console.error);
      api.listPainPoints(productId).then(setPainPoints).catch(console.error);
      // Load product screenshots for template previews
      api.getProduct(productId).then((p) => {
        if (p.screenshots) {
          try {
            const shots: string[] = JSON.parse(p.screenshots);
            if (shots.length > 0) {
              setScreenshotUrl(`${API_BASE}${shots[0]}`);
            }
          } catch { /* ignore parse errors */ }
        }
      }).catch(console.error);
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
        return { id: v.id, element: el, name: `ad_${v.headline.replace(/\W+/g, "_").slice(0, 40)}_${v.id.slice(0, 8)}`, aspectRatio: selectedAspectRatio };
      })
      .filter(Boolean) as { id: string; element: HTMLElement; name: string; aspectRatio: AspectRatio }[];

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

  const handleCsvImport = (rows: CsvAdRow[]) => {
    setCsvImportedRows(rows);
    setShowCsvImport(false);
    // Convert CSV rows to AdVariation-like objects for preview
    const csvVariations: AdVariation[] = rows.map((row, i) => ({
      id: `csv-${Date.now()}-${i}`,
      product_id: productId || "",
      batch_id: `csv-import-${Date.now()}`,
      template_id: "",
      pain_point_id: null,
      headline: row.headline,
      body: row.body,
      cta: row.cta,
      template_type: row.template_type || selectedTemplateType,
      template_config: {
        ...(row.backgroundColor ? { backgroundColor: row.backgroundColor } : {}),
        ...(row.textColor ? { textColor: row.textColor } : {}),
        ...(row.accentColor ? { accentColor: row.accentColor } : {}),
      },
      status: "draft",
      image_url: null,
      meta_ad_id: null,
      performance_score: null,
      pain_point_text: null,
      desired_outcome: null,
      created_at: new Date().toISOString(),
    }));
    setVariations(csvVariations);
    setSelectedVariationIds(csvVariations.map((v) => v.id));
    setStep("preview");
  };

  if (loading) return <div className="text-[#E5E1E4]/50">Loading...</div>;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-[#E5E1E4]">Bulk Ad Generator</h1>
        <button
          onClick={() => setShowCsvImport(!showCsvImport)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#FF9500] border border-[#FF9500]/20 rounded-lg hover:bg-[#FF9500]/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Import CSV
        </button>
      </div>
      <p className="text-[#E5E1E4]/50 mb-6">
        Generate hundreds of ad variations from pain points or import a CSV of headlines, preview them, and export or upload to Facebook.
      </p>

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div className="mb-6">
          <CsvBulkImport
            onImport={handleCsvImport}
            onClose={() => setShowCsvImport(false)}
          />
        </div>
      )}

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {(["product", "template", "pain_points", "configure", "preview"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full ${
              (["product", "template", "pain_points", "configure", "preview"] as Step[]).indexOf(step) >= i
                ? "bg-[#FF9500]"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Product */}
      {step === "product" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">Select Product</h2>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#201f21] text-[#E5E1E4]"
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
              className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
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
            <h2 className="text-lg font-semibold text-[#E5E1E4]">Choose Ad Template</h2>
            <button
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
              className="text-sm text-[#FF9500] hover:text-[#FF9500]"
            >
              + Create new
            </button>
          </div>

          {showCreateTemplate && (
            <div className="p-4 bg-white/5 rounded-lg space-y-3">
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name..."
                className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedTemplateType(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      selectedTemplateType === opt.value
                        ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                        : "bg-[#201f21] text-[#dbc2ad] border-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={handleCreateTemplate} className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm">
                Create Template
              </button>
            </div>
          )}

          {/* Aspect ratio selector */}
          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">Aspect Ratio</label>
            <div className="flex gap-3">
              {(Object.keys(ASPECT_DIMENSIONS) as AspectRatio[]).map((ratio) => {
                const dims = ASPECT_DIMENSIONS[ratio];
                return (
                  <button
                    key={ratio}
                    onClick={() => setSelectedAspectRatio(ratio)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedAspectRatio === ratio
                        ? "border-[#FF9500] bg-[#FF9500]/10"
                        : "border-white/10 hover:border-white/10"
                    }`}
                  >
                    <div
                      className="bg-white/10 rounded"
                      style={{
                        width: ratio === "9:16" ? 18 : 24,
                        height: ratio === "9:16" ? 32 : ratio === "4:5" ? 30 : 24,
                      }}
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#E5E1E4]">{ratio}</p>
                      <p className="text-xs text-[#E5E1E4]/50">{dims.width}&times;{dims.height}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template preview cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {TEMPLATE_OPTIONS.map((opt) => {
              const existingTemplate = templates.find((t) => t.template_type === opt.value);
              const isSelected = existingTemplate
                ? selectedTemplateId === existingTemplate.id
                : selectedTemplateType === opt.value && !selectedTemplateId;
              const previewWidth = 220;
              const previewDims = ASPECT_DIMENSIONS[selectedAspectRatio];
              const previewScale = previewWidth / previewDims.width;
              const previewHeight = previewDims.height * previewScale;

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
                    isSelected ? "border-[#FF9500] shadow-lg ring-2 ring-[#FF9500]/20" : "border-white/10 hover:border-white/10"
                  }`}
                >
                  <div style={{ width: previewWidth, height: previewHeight, overflow: "hidden" }}>
                    <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                      <TemplateRenderer
                        templateType={opt.value}
                        headline="Your Headline Here"
                        body="Your ad body text goes here to show the layout"
                        cta="Try Free"
                        aspectRatio={selectedAspectRatio}
                        screenshotUrl={screenshotUrl || undefined}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-[#201f21]">
                    <p className="font-medium text-sm text-[#E5E1E4]">{opt.label}</p>
                    <p className="text-xs text-[#E5E1E4]/50 mt-1">{opt.description}</p>
                    <div className="flex gap-1 mt-2">
                      {opt.bestFor.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/10 text-[#E5E1E4]/50 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("product")} className="px-6 py-2 border border-white/10 rounded-lg text-sm">
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
              className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium"
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
            <h2 className="text-lg font-semibold text-[#E5E1E4]">Select Pain Points</h2>
            <button
              onClick={handleResearchPainPoints}
              disabled={researching}
              className="px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {researching ? "Researching..." : "AI Research Pain Points"}
            </button>
          </div>

          {painPoints.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <p className="text-[#E5E1E4]/50 mb-4">No pain points yet. Use AI to research them or add manually.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setSelectedPainPointIds(painPoints.map((p) => p.id))}
                  className="text-sm text-[#FF9500] hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedPainPointIds([])}
                  className="text-sm text-[#E5E1E4]/50 hover:underline"
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
                        ? "border-[#FF9500]/30 bg-[#FF9500]/10"
                        : "border-white/10 hover:bg-[#201f21]/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPainPointIds.includes(pp.id)}
                      onChange={() => togglePainPoint(pp.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E5E1E4]">{pp.pain_point}</p>
                      {pp.desired_outcome && (
                        <p className="text-xs text-[#E5E1E4]/50 mt-1">{pp.desired_outcome}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-white/10 text-[#dbc2ad] px-2 py-0.5 rounded">{pp.category}</span>
                        <span className="text-xs bg-white/10 text-[#dbc2ad] px-2 py-0.5 rounded">
                          severity: {pp.severity}/10
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          <p className="text-sm text-[#E5E1E4]/50">
            {selectedPainPointIds.length} selected &times; {variationsPerPoint} variations ={" "}
            <strong>{selectedPainPointIds.length * variationsPerPoint} total ads</strong>
          </p>

          <div className="flex gap-3">
            <button onClick={() => setStep("template")} className="px-6 py-2 border border-white/10 rounded-lg text-sm">
              Back
            </button>
            <button
              onClick={() => setStep("configure")}
              disabled={selectedPainPointIds.length === 0}
              className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Configure */}
      {step === "configure" && (
        <div className="space-y-6 max-w-lg">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">Configure Generation</h2>

          <div>
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">
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
            <label className="block text-sm font-medium text-[#dbc2ad] mb-2">Funnel Stage</label>
            <div className="flex gap-2">
              {["awareness", "consideration", "conversion"].map((stage) => (
                <button
                  key={stage}
                  onClick={() => setFunnelStage(stage)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    funnelStage === stage
                      ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                      : "bg-[#201f21] text-[#dbc2ad] border-white/10"
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#FF9500]/10 rounded-lg text-sm text-[#FF9500]">
            Will generate <strong>{selectedPainPointIds.length * variationsPerPoint}</strong> ad variations
            using <strong>{TEMPLATE_OPTIONS.find((o) => o.value === selectedTemplateType)?.label}</strong> template
            at <strong>{selectedAspectRatio}</strong> ({ASPECT_DIMENSIONS[selectedAspectRatio].width}&times;{ASPECT_DIMENSIONS[selectedAspectRatio].height}).
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("pain_points")} className="px-6 py-2 border border-white/10 rounded-lg text-sm">
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm font-medium disabled:opacity-50"
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
            <h2 className="text-lg font-semibold text-[#E5E1E4]">
              Preview ({variations.length} variations)
            </h2>
            <div className="flex gap-2">
              {/* Still / Video toggle */}
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setPreviewMode("still")}
                  className={`px-3 py-1.5 text-sm font-medium ${previewMode === "still" ? "bg-[#FF9500] text-[#2d1600]" : "bg-[#201f21] text-[#dbc2ad]"}`}
                >
                  Still
                </button>
                <button
                  onClick={() => setPreviewMode("video")}
                  className={`px-3 py-1.5 text-sm font-medium ${previewMode === "video" ? "bg-[#FF9500] text-[#2d1600]" : "bg-[#201f21] text-[#dbc2ad]"}`}
                >
                  Video
                </button>
              </div>
              <button onClick={selectAllVariations} className="px-3 py-1.5 text-sm border border-white/10 rounded-lg">
                {selectedVariationIds.length === variations.length ? "Deselect all" : "Select all"}
              </button>
              <button
                onClick={handleBulkApprove}
                disabled={selectedVariationIds.length === 0}
                className="px-3 py-1.5 text-sm bg-[#4ade80]/20 text-[#4ade80] rounded-lg disabled:opacity-50"
              >
                Approve ({selectedVariationIds.length})
              </button>
              <button
                onClick={handleExportZip}
                disabled={selectedVariationIds.length === 0 || exporting}
                className="px-3 py-1.5 text-sm bg-[#FF9500] text-[#2d1600] rounded-lg disabled:opacity-50"
              >
                {exporting
                  ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                  : `Export ZIP (${selectedVariationIds.length})`}
              </button>
              <button
                onClick={() => setStep("configure")}
                className="px-3 py-1.5 text-sm border border-white/10 rounded-lg"
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
                aspectRatio={selectedAspectRatio}
                screenshotUrl={screenshotUrl || undefined}
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
                    aspectRatio={selectedAspectRatio}
                    screenshotUrl={screenshotUrl || undefined}
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
            className="bg-[#201f21] rounded-2xl overflow-hidden max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ maxHeight: "70vh", overflow: "auto", display: "flex", justifyContent: "center", padding: 24 }}>
              {previewMode === "video" ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Video style selector */}
                  <div className="flex gap-2">
                    {videoStyleOptions.map((vs) => (
                      <button
                        key={vs.value}
                        onClick={() => setVideoStyle(vs.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          videoStyle === vs.value
                            ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                            : "bg-[#201f21] text-[#dbc2ad] border-white/10 hover:border-white/20"
                        }`}
                        title={vs.description}
                      >
                        {vs.label}
                      </button>
                    ))}
                  </div>
                  <VideoPreview
                    headline={expandedVariation.headline}
                    body={expandedVariation.body}
                    cta={expandedVariation.cta}
                    aspectRatio={selectedAspectRatio}
                    screenshotUrl={screenshotUrl || undefined}
                    backgroundColor={expandedVariation.template_config?.backgroundColor}
                    textColor={expandedVariation.template_config?.textColor}
                    accentColor={expandedVariation.template_config?.accentColor}
                    videoStyle={videoStyle}
                    previewWidth={480}
                  />
                </div>
              ) : (
                <div style={{ transform: "scale(0.5)", transformOrigin: "top center" }}>
                  <TemplateRenderer
                    templateType={expandedVariation.template_type || selectedTemplateType}
                    headline={expandedVariation.headline}
                    body={expandedVariation.body}
                    cta={expandedVariation.cta}
                    aspectRatio={selectedAspectRatio}
                    screenshotUrl={screenshotUrl || undefined}
                    {...expandedVariation.template_config}
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10 space-y-2">
              <p className="text-sm font-medium text-[#E5E1E4]">{expandedVariation.headline}</p>
              <p className="text-sm text-[#dbc2ad]">{expandedVariation.body}</p>
              <p className="text-xs text-[#E5E1E4]/50">CTA: {expandedVariation.cta}</p>
              {expandedVariation.pain_point_text && (
                <p className="text-xs text-[#FF9500]">Pain point: {expandedVariation.pain_point_text}</p>
              )}
              <button
                onClick={() => setExpandedVariation(null)}
                className="mt-2 px-4 py-2 bg-[#FF9500] text-[#2d1600] rounded-lg text-sm"
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
