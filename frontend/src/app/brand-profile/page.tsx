"use client";

import { useEffect, useState } from "react";
import { api, type Product, type BrandProfileData } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to parse JSON strings from the API
function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

type Section = "voice" | "visual" | "content" | "platforms" | "pauses";

export default function BrandProfilePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [profile, setProfile] = useState<BrandProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["voice"])
  );

  // Editable state for all fields
  const [writingSamples, setWritingSamples] = useState<string[]>([]);
  const [toneDescriptors, setToneDescriptors] = useState<string[]>([]);
  const [alwaysUseWords, setAlwaysUseWords] = useState<string[]>([]);
  const [neverUseWords, setNeverUseWords] = useState<string[]>([]);
  const [sentenceStyle, setSentenceStyle] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [logoUsageRules, setLogoUsageRules] = useState("");
  const [primaryColors, setPrimaryColors] = useState<string[]>([]);
  const [secondaryColors, setSecondaryColors] = useState<string[]>([]);
  const [accentColors, setAccentColors] = useState<string[]>([]);
  const [approvedFonts, setApprovedFonts] = useState<string[]>([]);
  const [photographyStyle, setPhotographyStyle] = useState("");

  const [approvedTopics, setApprovedTopics] = useState<string[]>([]);
  const [offLimitTopics, setOffLimitTopics] = useState<string[]>([]);
  const [claimsAllowed, setClaimsAllowed] = useState<string[]>([]);
  const [claimsNeedReview, setClaimsNeedReview] = useState<string[]>([]);
  const [hashtagStrategy, setHashtagStrategy] = useState("");
  const [emojiUsage, setEmojiUsage] = useState("");
  const [ctaStyle, setCtaStyle] = useState("");
  const [regulatoryNotes, setRegulatoryNotes] = useState("");

  const [linkedinRules, setLinkedinRules] = useState("");
  const [instagramRules, setInstagramRules] = useState("");
  const [xRules, setXRules] = useState("");
  const [metaAdsRules, setMetaAdsRules] = useState("");

  const [pausedTopics, setPausedTopics] = useState<string[]>([]);

  useEffect(() => {
    api.listProducts().then((p) => {
      setProducts(p);
      if (p.length > 0) setSelectedProductId(p[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoading(true);
    api.getBrandProfile(selectedProductId).then((p) => {
      setProfile(p);
      populateForm(p);
      setLoading(false);
    });
  }, [selectedProductId]);

  function populateForm(p: BrandProfileData) {
    setWritingSamples(parseJson(p.writing_samples, []));
    setToneDescriptors(parseJson(p.tone_descriptors, []));
    setAlwaysUseWords(parseJson(p.always_use_words, []));
    setNeverUseWords(parseJson(p.never_use_words, []));
    setSentenceStyle(p.sentence_style || "");
    setLogoUrl(p.logo_url || "");
    setLogoUsageRules(p.logo_usage_rules || "");
    setPrimaryColors(parseJson(p.primary_colors, []));
    setSecondaryColors(parseJson(p.secondary_colors, []));
    setAccentColors(parseJson(p.accent_colors, []));
    setApprovedFonts(parseJson(p.approved_fonts, []));
    setPhotographyStyle(p.photography_style || "");
    setApprovedTopics(parseJson(p.approved_topics, []));
    setOffLimitTopics(parseJson(p.off_limit_topics, []));
    setClaimsAllowed(parseJson(p.claims_allowed, []));
    setClaimsNeedReview(parseJson(p.claims_need_review, []));
    setHashtagStrategy(p.hashtag_strategy || "");
    setEmojiUsage(p.emoji_usage || "");
    setCtaStyle(p.cta_style || "");
    setRegulatoryNotes(p.regulatory_notes || "");
    setLinkedinRules(p.linkedin_rules || "");
    setInstagramRules(p.instagram_rules || "");
    setXRules(p.x_rules || "");
    setMetaAdsRules(p.meta_ads_rules || "");
    setPausedTopics(parseJson(p.paused_topics, []));
  }

  async function handleSave() {
    if (!selectedProductId) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateBrandProfile(selectedProductId, {
        writing_samples: writingSamples,
        tone_descriptors: toneDescriptors,
        always_use_words: alwaysUseWords,
        never_use_words: neverUseWords,
        sentence_style: sentenceStyle || undefined,
        logo_usage_rules: logoUsageRules || undefined,
        primary_colors: primaryColors,
        secondary_colors: secondaryColors,
        accent_colors: accentColors,
        approved_fonts: approvedFonts,
        photography_style: photographyStyle || undefined,
        approved_topics: approvedTopics,
        off_limit_topics: offLimitTopics,
        claims_allowed: claimsAllowed,
        claims_need_review: claimsNeedReview,
        hashtag_strategy: hashtagStrategy || undefined,
        emoji_usage: emojiUsage || undefined,
        cta_style: ctaStyle || undefined,
        regulatory_notes: regulatoryNotes || undefined,
        linkedin_rules: linkedinRules || undefined,
        instagram_rules: instagramRules || undefined,
        x_rules: xRules || undefined,
        meta_ads_rules: metaAdsRules || undefined,
        paused_topics: pausedTopics,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!selectedProductId) return;
    try {
      const result = await api.uploadLogo(selectedProductId, file);
      setLogoUrl(result.path);
    } catch {
      alert("Logo upload failed");
    }
  }

  function toggleSection(s: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  if (loading && products.length === 0) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No products yet</p>
        <p className="mt-1 text-sm">
          Create a product first, then set up its brand profile.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define your brand voice, visual identity, and content rules
          </p>
        </div>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading profile...</div>
      ) : (
        <div className="space-y-4">
          {/* Voice & Tone */}
          <CollapsibleSection
            title="Voice & Tone"
            description="How your brand sounds in writing"
            section="voice"
            open={openSections.has("voice")}
            onToggle={toggleSection}
          >
            <div className="space-y-5">
              <TagListField
                label="Tone Descriptors"
                hint="e.g. warm, authoritative, playful"
                values={toneDescriptors}
                onChange={setToneDescriptors}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TagListField
                  label="Always Use These Words"
                  hint='e.g. "learners" not "students"'
                  values={alwaysUseWords}
                  onChange={setAlwaysUseWords}
                />
                <TagListField
                  label="Never Use These Words"
                  hint="Competitor names, banned terms"
                  values={neverUseWords}
                  onChange={setNeverUseWords}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sentence Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {["short_punchy", "long_flowing", "mixed"].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSentenceStyle(style)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        sentenceStyle === style
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {style.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <TextListField
                label="Writing Samples"
                hint="Paste 5-10 real posts or emails that represent your voice"
                values={writingSamples}
                onChange={setWritingSamples}
              />
            </div>
          </CollapsibleSection>

          {/* Visual Identity */}
          <CollapsibleSection
            title="Visual Identity"
            description="Logo, colors, fonts, photography style"
            section="visual"
            open={openSections.has("visual")}
            onToggle={toggleSection}
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <div className="flex items-center gap-4 flex-wrap">
                  {logoUrl && (
                    <img
                      src={`${API_BASE}${logoUrl}`}
                      alt="Brand logo"
                      className="h-16 w-auto rounded border border-gray-200"
                    />
                  )}
                  <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    {logoUrl ? "Replace Logo" : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
              <Field
                label="Logo Usage Rules"
                value={logoUsageRules}
                onChange={setLogoUsageRules}
                placeholder="Min size, clear space requirements, etc."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorListField
                  label="Primary Colors"
                  values={primaryColors}
                  onChange={setPrimaryColors}
                />
                <ColorListField
                  label="Secondary Colors"
                  values={secondaryColors}
                  onChange={setSecondaryColors}
                />
                <ColorListField
                  label="Accent Colors"
                  values={accentColors}
                  onChange={setAccentColors}
                />
              </div>
              <TagListField
                label="Approved Fonts"
                hint="e.g. Inter, Georgia, Helvetica Neue"
                values={approvedFonts}
                onChange={setApprovedFonts}
              />
              <Field
                label="Photography Style"
                value={photographyStyle}
                onChange={setPhotographyStyle}
                placeholder="e.g. candid, warm lighting, alpine landscapes, real students"
              />
            </div>
          </CollapsibleSection>

          {/* Content Rules */}
          <CollapsibleSection
            title="Content Rules"
            description="Topics, claims, hashtags, regulatory constraints"
            section="content"
            open={openSections.has("content")}
            onToggle={toggleSection}
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TagListField
                  label="Approved Topics"
                  hint="Topics the brand covers"
                  values={approvedTopics}
                  onChange={setApprovedTopics}
                />
                <TagListField
                  label="Off-Limit Topics"
                  hint="Topics to never touch"
                  values={offLimitTopics}
                  onChange={setOffLimitTopics}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TagListField
                  label="Claims Allowed"
                  hint="Statements the brand can make"
                  values={claimsAllowed}
                  onChange={setClaimsAllowed}
                />
                <TagListField
                  label="Claims Need Legal Review"
                  hint="Statements that need approval"
                  values={claimsNeedReview}
                  onChange={setClaimsNeedReview}
                />
              </div>
              <Field
                label="Hashtag Strategy"
                value={hashtagStrategy}
                onChange={setHashtagStrategy}
                placeholder="e.g. always include #LASlife, limit to 5 per post"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emoji Usage
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["yes", "limited", "no"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEmojiUsage(opt)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          emojiUsage === opt
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <Field
                  label="CTA Style"
                  value={ctaStyle}
                  onChange={setCtaStyle}
                  placeholder="e.g. action-oriented, warm, no aggressive urgency"
                />
              </div>
              <TextArea
                label="Regulatory Constraints"
                value={regulatoryNotes}
                onChange={setRegulatoryNotes}
                placeholder="Industry-specific rules: education targeting, Fair Housing, health claims, etc."
              />
            </div>
          </CollapsibleSection>

          {/* Platform-Specific Rules */}
          <CollapsibleSection
            title="Platform Rules"
            description="Tone and format rules per platform"
            section="platforms"
            open={openSections.has("platforms")}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <TextArea
                label="LinkedIn"
                value={linkedinRules}
                onChange={setLinkedinRules}
                placeholder="e.g. formal tone, thought leadership, no emoji, max 1300 chars"
              />
              <TextArea
                label="Instagram"
                value={instagramRules}
                onChange={setInstagramRules}
                placeholder="e.g. visual-first, shorter copy, lifestyle tone, carousel-friendly"
              />
              <TextArea
                label="X (Twitter)"
                value={xRules}
                onChange={setXRules}
                placeholder="e.g. conversational, thread-friendly, punchy hooks"
              />
              <TextArea
                label="Meta Ads"
                value={metaAdsRules}
                onChange={setMetaAdsRules}
                placeholder="e.g. compliant with ad policies, no prohibited claims, education targeting rules"
              />
            </div>
          </CollapsibleSection>

          {/* Content Pauses */}
          <CollapsibleSection
            title="Content Pauses"
            description="Temporarily block topics from being generated"
            section="pauses"
            open={openSections.has("pauses")}
            onToggle={toggleSection}
          >
            <TagListField
              label="Paused Topics"
              hint='Topics to pause right now (e.g. "campus safety", "tuition increases")'
              values={pausedTopics}
              onChange={setPausedTopics}
            />
            <p className="text-xs text-gray-400 mt-2">
              The bot will not generate any content mentioning these topics
              until you remove them.
            </p>
          </CollapsibleSection>

          {/* Save button — sticky on mobile */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
            {profile && (
              <p className="text-xs text-gray-400 hidden sm:block">
                v{profile.version} &middot; Last saved{" "}
                {new Date(profile.updated_at).toLocaleDateString()}
              </p>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {saved && (
                <span className="text-sm text-green-600 font-medium">
                  Saved
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable components ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  description,
  section,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  section: Section;
  open: boolean;
  onToggle: (s: Section) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(section)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-5 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
      />
    </div>
  );
}

function TagListField({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-md text-sm text-gray-700"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500 ml-0.5"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Type and press Enter"
          className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex-shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TextListField({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed) {
      onChange([...values, trimmed]);
      setInput("");
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      <div className="space-y-2 mb-3">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100"
          >
            <p className="text-sm text-gray-700 flex-1 whitespace-pre-wrap break-words min-w-0">
              {v}
            </p>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500 text-sm flex-shrink-0 mt-0.5"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a writing sample..."
          rows={3}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 self-start flex-shrink-0"
        >
          Add Sample
        </button>
      </div>
    </div>
  );
}

function ColorListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("#");

  function handleAdd() {
    const trimmed = input.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed) && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("#");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            title={`${c} — click to remove`}
            className="group relative"
          >
            <div
              className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm group-hover:ring-2 group-hover:ring-red-300"
              style={{ backgroundColor: c }}
            />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4 opacity-0 group-hover:opacity-100 transition-opacity">
              &times;
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="color"
            value={input.length >= 4 ? input : "#000000"}
            onChange={(e) => setInput(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer flex-shrink-0"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="#hex"
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex-shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}
