"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type StyleGuideItem, type StyleGuideCreate } from "@/lib/api";

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

function parseJson<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ── Tag list helper ──────────────────────────────────────────────────────────

function TagList({
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  items: string[];
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) { onAdd(v); setInput(""); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20">
            {item}
            <button onClick={() => onRemove(i)} className="hover:text-[#ffb4ab] transition-colors">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder || "Add item…"}
          className="flex-1 px-3 py-2 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 text-sm text-[#E5E1E4] placeholder-[#E5E1E4]/30 focus:outline-none focus:border-[#FF9500]/50 transition-colors"
        />
        <button
          onClick={add}
          className="px-4 py-2 bg-[#FF9500]/10 text-[#FF9500] rounded-xl text-sm font-semibold hover:bg-[#FF9500]/20 transition-colors border border-[#FF9500]/20"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-6 space-y-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#FF9500]">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-[#E5E1E4]/60 uppercase tracking-[0.08em]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 glass-prism rounded-xl border border-[#554334]/30 bg-[#1b1b1d]/60 text-sm text-[#E5E1E4] placeholder-[#E5E1E4]/30 focus:outline-none focus:border-[#FF9500]/50 transition-colors";
const textareaCls = `${inputCls} resize-none min-h-[80px]`;

// ── Guide card ───────────────────────────────────────────────────────────────

function GuideCard({
  guide,
  isSelected,
  onSelect,
  onDelete,
}: {
  guide: StyleGuideItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const pillars = parseJson<string[]>(guide.messaging_pillars, []);

  return (
    <motion.div
      whileHover={{ borderColor: "rgba(255,149,0,0.35)" }}
      onClick={onSelect}
      className={`glass-prism rounded-2xl border backdrop-blur-xl p-5 cursor-pointer transition-all ${
        isSelected
          ? "border-[#FF9500]/40 bg-[#FF9500]/5"
          : "border-[#554334]/30 bg-[#1b1b1d]/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#E5E1E4] truncate">{guide.name}</p>
          {guide.description && (
            <p className="text-xs text-[#E5E1E4]/40 mt-0.5 line-clamp-2">{guide.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 p-1.5 rounded-lg text-[#E5E1E4]/30 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
      {pillars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {pillars.slice(0, 3).map((p, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/15">
              {p}
            </span>
          ))}
          {pillars.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] text-[#E5E1E4]/30">+{pillars.length - 3}</span>
          )}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-[#554334]/20 flex items-center gap-3">
        {guide.tone_rules && <span className="text-[10px] text-[#E5E1E4]/30 font-mono">Tone rules</span>}
        {guide.vocabulary_rules && <span className="text-[10px] text-[#E5E1E4]/30 font-mono">Vocabulary</span>}
        {guide.target_personas && parseJson<unknown[]>(guide.target_personas, []).length > 0 && (
          <span className="text-[10px] text-[#E5E1E4]/30 font-mono">
            {parseJson<unknown[]>(guide.target_personas, []).length} persona{parseJson<unknown[]>(guide.target_personas, []).length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StyleGuidesPage() {
  const [guides, setGuides] = useState<StyleGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for selected/new guide
  const [form, setForm] = useState<{
    name: string;
    description: string;
    messaging_pillars: string[];
    taglines: string[];
    mission_statement: string;
    value_proposition: string;
    tone_rules: string;
    formatting_rules: string;
    vocabulary_prefer: string[];
    vocabulary_avoid: string[];
    cta_guidelines: string;
    pain_points: string[];
  }>({
    name: "",
    description: "",
    messaging_pillars: [],
    taglines: [],
    mission_statement: "",
    value_proposition: "",
    tone_rules: "",
    formatting_rules: "",
    vocabulary_prefer: [],
    vocabulary_avoid: [],
    cta_guidelines: "",
    pain_points: [],
  });

  const isNew = selectedId === "new";

  useEffect(() => {
    api.listStyleGuides()
      .then(setGuides)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadGuide = (guide: StyleGuideItem) => {
    const vocab = parseJson<{ prefer?: string[]; avoid?: string[] }>(guide.vocabulary_rules, {});
    setForm({
      name: guide.name,
      description: guide.description || "",
      messaging_pillars: parseJson(guide.messaging_pillars, []),
      taglines: parseJson(guide.taglines, []),
      mission_statement: guide.mission_statement || "",
      value_proposition: guide.value_proposition || "",
      tone_rules: guide.tone_rules || "",
      formatting_rules: guide.formatting_rules || "",
      vocabulary_prefer: vocab.prefer || [],
      vocabulary_avoid: vocab.avoid || [],
      cta_guidelines: guide.cta_guidelines || "",
      pain_points: parseJson(guide.pain_points, []),
    });
  };

  const resetForm = () => setForm({
    name: "",
    description: "",
    messaging_pillars: [],
    taglines: [],
    mission_statement: "",
    value_proposition: "",
    tone_rules: "",
    formatting_rules: "",
    vocabulary_prefer: [],
    vocabulary_avoid: [],
    cta_guidelines: "",
    pain_points: [],
  });

  const handleSelect = (guide: StyleGuideItem) => {
    setSelectedId(guide.id);
    loadGuide(guide);
    setExtractResult(null);
  };

  const handleNewGuide = () => {
    setSelectedId("new");
    resetForm();
    setExtractResult(null);
  };

  const buildPayload = (): StyleGuideCreate => ({
    name: form.name,
    description: form.description || undefined,
    messaging_pillars: form.messaging_pillars.length ? form.messaging_pillars : undefined,
    taglines: form.taglines.length ? form.taglines : undefined,
    mission_statement: form.mission_statement || undefined,
    value_proposition: form.value_proposition || undefined,
    tone_rules: form.tone_rules || undefined,
    formatting_rules: form.formatting_rules || undefined,
    vocabulary_rules: (form.vocabulary_prefer.length || form.vocabulary_avoid.length)
      ? JSON.stringify({ prefer: form.vocabulary_prefer, avoid: form.vocabulary_avoid })
      : undefined,
    cta_guidelines: form.cta_guidelines || undefined,
    pain_points: form.pain_points.length ? form.pain_points : undefined,
  });

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await api.createStyleGuide(buildPayload());
        setGuides((prev) => [created, ...prev]);
        setSelectedId(created.id);
      } else if (selectedId) {
        const updated = await api.updateStyleGuide(selectedId, buildPayload());
        setGuides((prev) => prev.map((g) => (g.id === selectedId ? updated : g)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this style guide?")) return;
    try {
      await api.deleteStyleGuide(id);
      setGuides((prev) => prev.filter((g) => g.id !== id));
      if (selectedId === id) { setSelectedId(null); resetForm(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || isNew) return;
    setExtracting(true);
    setExtractResult(null);
    try {
      const result = await api.extractStyleGuide(selectedId, file);
      // Reload guide data
      const updated = await api.getStyleGuide(selectedId);
      setGuides((prev) => prev.map((g) => (g.id === selectedId ? updated : g)));
      loadGuide(updated);
      setExtractResult(`Extracted ${result.extracted_fields} fields. ${result.summary}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-72 bg-[#E5E1E4]/10 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-[#1b1b1d]/60 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" className="space-y-8">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-end justify-between">
        <div>
          <p className="text-[#FF9500] text-[11px] font-black uppercase tracking-[0.2em] mb-3">Brand System</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-[#E5E1E4]">
            Style<span className="text-[#E5E1E4]/30"> Guides.</span>
          </h1>
          <p className="text-[#E5E1E4]/40 text-sm mt-2 font-mono">
            Reusable messaging + writing rules paired with voice profiles
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNewGuide}
          className="px-5 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold"
        >
          New Guide
        </motion.button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-prism rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 backdrop-blur-xl px-5 py-4 flex items-center justify-between"
        >
          <p className="text-sm text-[#ffb4ab]">{error}</p>
          <button onClick={() => setError(null)} className="text-[#ffb4ab]/60 hover:text-[#ffb4ab] text-xs">Dismiss</button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guide list */}
        <motion.div {...fadeUp(0.06)} className="space-y-3">
          {guides.length === 0 && !isNew && (
            <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-8 text-center">
              <p className="text-sm text-[#E5E1E4]/40">No style guides yet.</p>
              <p className="text-xs text-[#E5E1E4]/25 mt-1">Create one to pair with a voice profile.</p>
            </div>
          )}
          {guides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              isSelected={selectedId === guide.id}
              onSelect={() => handleSelect(guide)}
              onDelete={() => handleDelete(guide.id)}
            />
          ))}
        </motion.div>

        {/* Editor */}
        <motion.div {...fadeUp(0.1)} className="lg:col-span-2 space-y-4">
          {!selectedId ? (
            <div className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-12 text-center">
              <p className="text-sm text-[#E5E1E4]/40">Select a guide to edit, or create a new one.</p>
            </div>
          ) : (
            <>
              {/* Extract from PDF/image (only for saved guides) */}
              {!isNew && (
                <Section title="Import from Document">
                  <p className="text-xs text-[#E5E1E4]/40">
                    Claude Vision will read your guide and extract messaging pillars, tone rules, vocabulary, and audience details automatically.
                  </p>
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-[#554334]/20 bg-[#1b1b1d]/40">
                    <span className="material-symbols-outlined text-[#FF9500]/60 text-xl mt-0.5 flex-shrink-0">description</span>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-semibold text-[#E5E1E4]/70">Accepted formats</p>
                      <div className="flex flex-wrap gap-2">
                        {["PDF", "PNG", "JPG", "WEBP", "MD"].map((fmt) => (
                          <span key={fmt} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            fmt === "PDF" || fmt === "PNG" || fmt === "MD"
                              ? "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20"
                              : "bg-[#E5E1E4]/5 text-[#E5E1E4]/40 border-[#554334]/20"
                          }`}>
                            {fmt}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#E5E1E4]/30 mt-1">
                        Tip: Use <span className="text-[#E5E1E4]/50 font-medium">Google Stitch</span> to generate a brand image export, then upload the PNG here.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.md,.txt" onChange={handleExtract} className="hidden" />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extracting}
                      className="px-5 py-2.5 bg-[#FF9500]/10 text-[#FF9500] rounded-xl text-sm font-semibold hover:bg-[#FF9500]/20 transition-colors border border-[#FF9500]/20 disabled:opacity-50"
                    >
                      {extracting ? "Extracting…" : "Upload & Extract"}
                    </motion.button>
                    {extractResult && (
                      <p className="text-xs text-[#4ade80]">{extractResult}</p>
                    )}
                  </div>
                </Section>
              )}

              {/* Identity */}
              <Section title="Identity">
                <Field label="Guide Name">
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Thought Leadership Guide"
                    className={inputCls}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="What is this guide for? Which voices or products will use it?"
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
              </Section>

              {/* Messaging */}
              <Section title="Messaging">
                <Field label="Messaging Pillars">
                  <TagList
                    items={form.messaging_pillars}
                    onAdd={(v) => setField("messaging_pillars", [...form.messaging_pillars, v])}
                    onRemove={(i) => setField("messaging_pillars", form.messaging_pillars.filter((_, idx) => idx !== i))}
                    placeholder="Add a pillar (e.g. Trust, Simplicity)"
                  />
                </Field>
                <Field label="Approved Taglines / Slogans">
                  <TagList
                    items={form.taglines}
                    onAdd={(v) => setField("taglines", [...form.taglines, v])}
                    onRemove={(i) => setField("taglines", form.taglines.filter((_, idx) => idx !== i))}
                    placeholder="Add a tagline"
                  />
                </Field>
                <Field label="Mission Statement">
                  <textarea
                    value={form.mission_statement}
                    onChange={(e) => setField("mission_statement", e.target.value)}
                    placeholder="What is the brand's purpose?"
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
                <Field label="Value Proposition">
                  <textarea
                    value={form.value_proposition}
                    onChange={(e) => setField("value_proposition", e.target.value)}
                    placeholder="What makes this brand uniquely valuable?"
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
              </Section>

              {/* Writing Rules */}
              <Section title="Writing Rules">
                <Field label="Tone Rules">
                  <textarea
                    value={form.tone_rules}
                    onChange={(e) => setField("tone_rules", e.target.value)}
                    placeholder="e.g. Write like a thoughtful friend, not a brand account. Direct, warm, and specific."
                    className={textareaCls}
                    rows={3}
                  />
                </Field>
                <Field label="Formatting Rules">
                  <textarea
                    value={form.formatting_rules}
                    onChange={(e) => setField("formatting_rules", e.target.value)}
                    placeholder="e.g. Short paragraphs (2-3 sentences max). Avoid bullet-hell. No ALL CAPS."
                    className={textareaCls}
                    rows={3}
                  />
                </Field>
                <Field label="CTA Guidelines">
                  <textarea
                    value={form.cta_guidelines}
                    onChange={(e) => setField("cta_guidelines", e.target.value)}
                    placeholder="e.g. CTAs should feel like an invitation, not a demand. Soft verbs preferred."
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Preferred Vocabulary">
                    <TagList
                      items={form.vocabulary_prefer}
                      onAdd={(v) => setField("vocabulary_prefer", [...form.vocabulary_prefer, v])}
                      onRemove={(i) => setField("vocabulary_prefer", form.vocabulary_prefer.filter((_, idx) => idx !== i))}
                      placeholder="Add preferred word"
                    />
                  </Field>
                  <Field label="Vocabulary to Avoid">
                    <TagList
                      items={form.vocabulary_avoid}
                      onAdd={(v) => setField("vocabulary_avoid", [...form.vocabulary_avoid, v])}
                      onRemove={(i) => setField("vocabulary_avoid", form.vocabulary_avoid.filter((_, idx) => idx !== i))}
                      placeholder="Add word to avoid"
                    />
                  </Field>
                </div>
              </Section>

              {/* Audience */}
              <Section title="Audience">
                <Field label="Core Pain Points">
                  <TagList
                    items={form.pain_points}
                    onAdd={(v) => setField("pain_points", [...form.pain_points, v])}
                    onRemove={(i) => setField("pain_points", form.pain_points.filter((_, idx) => idx !== i))}
                    placeholder="Add an audience pain point"
                  />
                </Field>
              </Section>

              {/* Save */}
              <div className="flex justify-end gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedId(null); resetForm(); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#E5E1E4]/50 hover:text-[#E5E1E4] hover:bg-white/5 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#FF9500] text-[#2d1600] rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving…" : isNew ? "Create Guide" : "Save Changes"}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
