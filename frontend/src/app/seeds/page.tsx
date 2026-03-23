"use client";

import { useEffect, useState } from "react";
import { api, type Product, type SeedItem } from "@/lib/api";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  parked: { bg: "bg-amber-100", text: "text-amber-700", label: "Parked" },
  developing: { bg: "bg-blue-100", text: "text-blue-700", label: "Developing" },
  used: { bg: "bg-green-100", text: "text-green-700", label: "Used" },
  archived: { bg: "bg-gray-100", text: "text-gray-500", label: "Archived" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  A: "Reflective Essay",
  B: "Practical Guide",
  C: "Personal Story",
  D: "Quick Hit",
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "High", color: "text-red-600" },
  0: { label: "Normal", color: "text-gray-500" },
  "-1": { label: "Low", color: "text-gray-400" },
};

export default function SeedBankPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [newSeed, setNewSeed] = useState("");
  const [newHook, setNewHook] = useState("");
  const [newTemplate, setNewTemplate] = useState("A");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState(0);

  useEffect(() => {
    api
      .listProducts()
      .then((p) => {
        setProducts(p);
        if (p.length > 0) setProductId(p[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api
      .listSeeds(productId, statusFilter || undefined)
      .then(setSeeds)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId, statusFilter]);

  const handleCreate = async () => {
    if (!newSeed.trim() || !productId) return;
    try {
      const created = await api.createSeed({
        product_id: productId,
        seed: newSeed,
        audience_hook: newHook,
        template_fit: newTemplate,
        notes: newNotes || undefined,
        priority: newPriority,
        source: "manual",
      });
      setSeeds((prev) => [created, ...prev]);
      setNewSeed("");
      setNewHook("");
      setNewTemplate("A");
      setNewNotes("");
      setNewPriority(0);
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await api.updateSeed(id, { status });
      setSeeds((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSeed(id);
      setSeeds((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (id: string, priority: number) => {
    try {
      const updated = await api.updateSeed(id, { priority });
      setSeeds((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && seeds.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seed Bank</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ideas waiting to grow. Park observations, voice memo insights, and half-formed thoughts here.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          {showAdd ? "Cancel" : "Plant a Seed"}
        </button>
      </div>

      {/* Product selector */}
      {products.length > 1 && (
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Add seed form */}
      {showAdd && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Core Observation
            </label>
            <textarea
              value={newSeed}
              onChange={(e) => setNewSeed(e.target.value)}
              placeholder="The one-sentence insight..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audience Hook
              </label>
              <input
                type="text"
                value={newHook}
                onChange={(e) => setNewHook(e.target.value)}
                placeholder="Why someone would stop scrolling..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Fit
              </label>
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k} - {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Personal context..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={1}>High</option>
                <option value={0}>Normal</option>
                <option value={-1}>Low</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!newSeed.trim()}
            className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40"
          >
            Plant Seed
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {["", "parked", "developing", "used", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-[#FF9500] text-[#2d1600] border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:bg-white/5"
            }`}
          >
            {s ? STATUS_BADGES[s]?.label || s : "All"}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">
          {seeds.length} seed{seeds.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Seed cards */}
      <div className="space-y-3">
        {seeds.map((seed) => {
          const isExpanded = expandedId === seed.id;
          const badge = STATUS_BADGES[seed.status] || STATUS_BADGES.parked;
          const prio = PRIORITY_LABELS[seed.priority] || PRIORITY_LABELS[0];

          return (
            <div
              key={seed.id}
              className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
                seed.priority === 1
                  ? "border-amber-300 shadow-sm"
                  : "border-gray-200"
              }`}
            >
              {/* Card header */}
              <div
                className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : seed.id)}
              >
                {/* Priority indicator */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = seed.priority === 1 ? 0 : seed.priority === 0 ? -1 : 1;
                    handlePriorityChange(seed.id, next);
                  }}
                  className={`mt-0.5 text-lg leading-none ${prio.color}`}
                  title={`Priority: ${prio.label}`}
                >
                  {seed.priority === 1 ? "\u25B2" : seed.priority === -1 ? "\u25BC" : "\u25CF"}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">
                    {seed.seed}
                  </p>
                  {seed.audience_hook && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      Hook: {seed.audience_hook}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {TEMPLATE_LABELS[seed.template_fit] || seed.template_fit}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {isExpanded ? "\u25B2" : "\u25BC"}
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  {seed.heat.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Heat (strongest lines)
                      </p>
                      <ul className="space-y-1">
                        {seed.heat.map((h, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-700 pl-3 border-l-2 border-amber-400"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {seed.metaphor && (
                    <p className="text-sm text-gray-600">
                      <span className="text-xs font-medium text-gray-500">
                        Metaphor:{" "}
                      </span>
                      {seed.metaphor}
                    </p>
                  )}

                  {seed.subject_line && (
                    <p className="text-sm text-gray-600">
                      <span className="text-xs font-medium text-gray-500">
                        Subject line:{" "}
                      </span>
                      {seed.subject_line}
                    </p>
                  )}

                  {seed.weekly_theme && (
                    <p className="text-sm text-gray-600">
                      <span className="text-xs font-medium text-gray-500">
                        Weekly theme:{" "}
                      </span>
                      {seed.weekly_theme}
                    </p>
                  )}

                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-500">
                      Verdict:{" "}
                    </span>
                    {seed.verdict}
                  </p>

                  {seed.notes && (
                    <p className="text-xs text-gray-500 italic">
                      {seed.notes}
                    </p>
                  )}

                  {seed.raw_transcript && (
                    <details className="text-xs">
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                        Original transcript
                      </summary>
                      <p className="mt-1 text-gray-500 whitespace-pre-wrap bg-gray-50 rounded p-2">
                        {seed.raw_transcript}
                      </p>
                    </details>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                    <span>
                      Source: {seed.source}
                    </span>
                    <span>
                      Created{" "}
                      {seed.created_at
                        ? new Date(seed.created_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {seed.status === "parked" && (
                      <button
                        onClick={() => handleStatusChange(seed.id, "developing")}
                        className="px-3 py-1.5 text-xs font-medium bg-[#FF9500] text-[#2d1600] rounded-lg hover:opacity-90"
                      >
                        Start Developing
                      </button>
                    )}
                    {seed.status === "developing" && (
                      <button
                        onClick={() => handleStatusChange(seed.id, "used")}
                        className="px-3 py-1.5 text-xs font-medium bg-[#4ade80]/20 text-[#4ade80] rounded-lg hover:opacity-90"
                      >
                        Mark Used
                      </button>
                    )}
                    {seed.status !== "archived" && (
                      <button
                        onClick={() => handleStatusChange(seed.id, "archived")}
                        className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-white/5"
                      >
                        Archive
                      </button>
                    )}
                    {seed.status === "archived" && (
                      <button
                        onClick={() => handleStatusChange(seed.id, "parked")}
                        className="px-3 py-1.5 text-xs font-medium bg-white text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50"
                      >
                        Unarchive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(seed.seed);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-white/5"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDelete(seed.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {seeds.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            No seeds yet. Drop a voice memo in the Content Studio or plant one manually.
          </p>
        </div>
      )}
    </div>
  );
}
