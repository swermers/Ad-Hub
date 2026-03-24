"use client";

import { useEffect, useState } from "react";
import { api, type Product, type SeedItem } from "@/lib/api";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  parked: { bg: "bg-amber-100", text: "text-amber-700", label: "Parked" },
  developing: { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]", label: "Developing" },
  used: { bg: "bg-[#4ade80]/10", text: "text-[#4ade80]", label: "Used" },
  archived: { bg: "bg-white/10", text: "text-[#E5E1E4]/50", label: "Archived" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  A: "Reflective Essay",
  B: "Practical Guide",
  C: "Personal Story",
  D: "Quick Hit",
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "High", color: "text-[#ffb4ab]" },
  0: { label: "Normal", color: "text-[#E5E1E4]/50" },
  "-1": { label: "Low", color: "text-[#E5E1E4]/40" },
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
    const fetchSeeds = async () => {
      setLoading(true);
      try {
        const data = await api.listSeeds(productId, statusFilter || undefined);
        setSeeds(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSeeds();
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
          <h1 className="text-2xl font-bold text-[#E5E1E4]">Seed Bank</h1>
          <p className="text-sm text-[#E5E1E4]/50 mt-1">
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
          className="w-full max-w-xs bg-[#131315] border border-[#353437] rounded-xl px-4 py-2.5 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 transition-all"
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
        <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#FF9500] uppercase tracking-wider mb-1.5">
              Core Observation
            </label>
            <textarea
              value={newSeed}
              onChange={(e) => setNewSeed(e.target.value)}
              placeholder="The one-sentence insight..."
              rows={2}
              className="w-full bg-[#131315] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/25 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#E5E1E4]/60 uppercase tracking-wider mb-1.5">
                Audience Hook
              </label>
              <input
                type="text"
                value={newHook}
                onChange={(e) => setNewHook(e.target.value)}
                placeholder="Why someone would stop scrolling..."
                className="w-full bg-[#131315] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/25 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#E5E1E4]/60 uppercase tracking-wider mb-1.5">
                Template Fit
              </label>
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                className="w-full bg-[#131315] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all"
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
              <label className="block text-xs font-semibold text-[#E5E1E4]/60 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Personal context..."
                className="w-full bg-[#131315] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/25 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#E5E1E4]/60 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                className="w-full bg-[#131315] border border-[#353437] rounded-xl px-4 py-3 text-sm text-[#E5E1E4] focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all"
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
            className="liquid-gradient px-5 py-2.5 rounded-xl text-sm font-bold text-[#2d1600] hover:shadow-[0_4px_24px_rgba(255,149,0,0.35)] transition-all disabled:opacity-40 disabled:shadow-none"
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
                ? "bg-[#FF9500] text-[#2d1600] border-[#FF9500]"
                : "bg-[#201f21] text-[#dbc2ad] border-white/10 hover:bg-[#201f21]/5"
            }`}
          >
            {s ? STATUS_BADGES[s]?.label || s : "All"}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#E5E1E4]/40 self-center">
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
              className={`bg-[#201f21] border rounded-xl overflow-hidden transition-shadow ${
                seed.priority === 1
                  ? "border-amber-300 shadow-sm"
                  : "border-white/10"
              }`}
            >
              {/* Card header */}
              <div
                className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-[#201f21]/5 transition-colors"
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
                  <p className="text-sm font-medium text-[#E5E1E4] leading-snug">
                    {seed.seed}
                  </p>
                  {seed.audience_hook && (
                    <p className="text-xs text-[#E5E1E4]/50 mt-1 truncate">
                      Hook: {seed.audience_hook}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#E5E1E4]/40">
                    {TEMPLATE_LABELS[seed.template_fit] || seed.template_fit}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[#E5E1E4]/40 text-xs">
                    {isExpanded ? "\u25B2" : "\u25BC"}
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-white/5 pt-3 space-y-3">
                  {seed.heat.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[#E5E1E4]/50 mb-1">
                        Heat (strongest lines)
                      </p>
                      <ul className="space-y-1">
                        {seed.heat.map((h, i) => (
                          <li
                            key={i}
                            className="text-sm text-[#dbc2ad] pl-3 border-l-2 border-amber-400"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {seed.metaphor && (
                    <p className="text-sm text-[#dbc2ad]">
                      <span className="text-xs font-medium text-[#E5E1E4]/50">
                        Metaphor:{" "}
                      </span>
                      {seed.metaphor}
                    </p>
                  )}

                  {seed.subject_line && (
                    <p className="text-sm text-[#dbc2ad]">
                      <span className="text-xs font-medium text-[#E5E1E4]/50">
                        Subject line:{" "}
                      </span>
                      {seed.subject_line}
                    </p>
                  )}

                  {seed.weekly_theme && (
                    <p className="text-sm text-[#dbc2ad]">
                      <span className="text-xs font-medium text-[#E5E1E4]/50">
                        Weekly theme:{" "}
                      </span>
                      {seed.weekly_theme}
                    </p>
                  )}

                  <p className="text-xs text-[#E5E1E4]/40">
                    <span className="font-medium text-[#E5E1E4]/50">
                      Verdict:{" "}
                    </span>
                    {seed.verdict}
                  </p>

                  {seed.notes && (
                    <p className="text-xs text-[#E5E1E4]/50 italic">
                      {seed.notes}
                    </p>
                  )}

                  {seed.raw_transcript && (
                    <details className="text-xs">
                      <summary className="text-[#E5E1E4]/40 cursor-pointer hover:text-[#dbc2ad]">
                        Original transcript
                      </summary>
                      <p className="mt-1 text-[#E5E1E4]/50 whitespace-pre-wrap bg-white/5 rounded p-2">
                        {seed.raw_transcript}
                      </p>
                    </details>
                  )}

                  <div className="flex items-center gap-2 text-xs text-[#E5E1E4]/40 pt-1">
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
                  <div className="flex gap-2 pt-2 border-t border-white/5">
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
                        className="px-3 py-1.5 text-xs font-medium bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg hover:bg-[#201f21]/5"
                      >
                        Archive
                      </button>
                    )}
                    {seed.status === "archived" && (
                      <button
                        onClick={() => handleStatusChange(seed.id, "parked")}
                        className="px-3 py-1.5 text-xs font-medium bg-[#201f21] text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50"
                      >
                        Unarchive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(seed.seed);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#201f21] text-[#dbc2ad] border border-white/10 rounded-lg hover:bg-[#201f21]/5"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDelete(seed.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[#ffb4ab] border border-[#ffb4ab]/30 rounded-lg hover:bg-[#ffb4ab]/10 ml-auto"
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
          <p className="text-[#E5E1E4]/40 text-sm">
            No seeds yet. Drop a voice memo in the Content Studio or plant one manually.
          </p>
        </div>
      )}
    </div>
  );
}
