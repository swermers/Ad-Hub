"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type VoiceProfileItem, type VoiceProfileCreate, type VoiceProfileParsed } from "@/lib/api";

interface VoiceProfileSelectorProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

export default function VoiceProfileSelector({
  selectedId,
  onSelect,
  disabled,
}: VoiceProfileSelectorProps) {
  const [profiles, setProfiles] = useState<VoiceProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await api.listVoiceProfiles();
      setProfiles(data);
      // Auto-select default if nothing selected
      if (!selectedId) {
        const def = data.find((p) => p.is_default);
        if (def) onSelect(def.id);
      }
    } catch {
      // Silently fail — profiles are optional
    } finally {
      setLoading(false);
    }
  }, [selectedId, onSelect]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <>
      {/* Selector */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={`glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d]/60 backdrop-blur-xl p-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#E5E1E4]/50">
            Voice Profile
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowManager(true)}
            className="text-[10px] text-[#FF9500] font-medium hover:text-[#ffbd7f] transition-colors"
          >
            Manage
          </motion.button>
        </div>

        {loading ? (
          <div className="h-10 rounded-xl bg-[#353437]/30 animate-pulse" />
        ) : profiles.length === 0 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowManager(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#554334] hover:border-[#FF9500]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[#FF9500]/60 text-xl">add_circle</span>
            <span className="text-sm text-[#E5E1E4]/50">Create your first voice profile</span>
          </motion.button>
        ) : (
          <div className="space-y-2">
            {/* No profile option */}
            <button
              onClick={() => onSelect(null)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm ${
                !selectedId
                  ? "bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500]"
                  : "border border-transparent hover:bg-[#1b1b1d] text-[#E5E1E4]/50"
              }`}
            >
              <span className="material-symbols-outlined text-lg">tune</span>
              Default (no profile)
            </button>

            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                  selectedId === p.id
                    ? "bg-[#FF9500]/10 border border-[#FF9500]/30"
                    : "border border-transparent hover:bg-[#1b1b1d]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedId === p.id ? "bg-[#FF9500]/20" : "bg-[#353437]/50"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      selectedId === p.id ? "text-[#FF9500]" : "text-[#E5E1E4]/40"
                    }`}
                  >
                    record_voice_over
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium truncate ${
                      selectedId === p.id ? "text-[#FF9500]" : "text-[#E5E1E4]/70"
                    }`}
                  >
                    {p.name}
                    {p.is_default && (
                      <span className="ml-1.5 text-[10px] text-[#FF9500]/60 font-normal">
                        default
                      </span>
                    )}
                  </p>
                  {p.tone_keywords.length > 0 && (
                    <p className="text-[10px] text-[#E5E1E4]/30 truncate">
                      {p.tone_keywords.join(" · ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Profile Manager Modal */}
      <AnimatePresence>
        {showManager && (
          <ProfileManager
            profiles={profiles}
            onClose={() => {
              setShowManager(false);
              loadProfiles();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Profile Manager Modal ─────────────────────────────────────────────────── */

function ProfileManager({
  profiles,
  onClose,
}: {
  profiles: VoiceProfileItem[];
  onClose: () => void;
}) {
  const [items, setItems] = useState(profiles);
  const [editing, setEditing] = useState<VoiceProfileItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [importedData, setImportedData] = useState<VoiceProfileParsed | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(async () => {
    try {
      const data = await api.listVoiceProfiles();
      setItems(data);
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deleteVoiceProfile(id);
        setItems((prev) => prev.filter((p) => p.id !== id));
      } catch {
        // ignore
      }
    },
    [],
  );

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";

    setImporting(true);
    setImportError(null);
    try {
      const parsed = await api.parseVoiceMarkdown(file);
      setImportedData(parsed);
      setCreating(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse markdown file");
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="glass-prism rounded-2xl border border-[#554334]/30 bg-[#1b1b1d] backdrop-blur-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#353437]/50">
          <h2 className="text-lg font-semibold text-[#E5E1E4]">Voice Profiles</h2>
          <button onClick={onClose} className="text-[#E5E1E4]/40 hover:text-[#E5E1E4] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {(creating || editing) ? (
              <ProfileForm
                key="form"
                profile={editing}
                prefill={importedData}
                onSave={async () => {
                  setCreating(false);
                  setEditing(null);
                  setImportedData(null);
                  await refreshList();
                }}
                onCancel={() => {
                  setCreating(false);
                  setEditing(null);
                  setImportedData(null);
                }}
              />
            ) : (
              <>
                {items.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#353437]/50 hover:border-[#554334] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#FF9500] text-xl">
                        record_voice_over
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E5E1E4] truncate">
                        {p.name}
                        {p.is_default && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded bg-[#FF9500]/15 text-[#FF9500]">
                            DEFAULT
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#E5E1E4]/40 truncate">
                        {p.tone_keywords.join(", ") || p.description || "No description"}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditing(p)}
                      className="p-1.5 rounded-lg hover:bg-[#353437]/50 text-[#E5E1E4]/40 hover:text-[#E5E1E4] transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg hover:bg-[#ffb4ab]/10 text-[#E5E1E4]/40 hover:text-[#ffb4ab] transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </motion.div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-sm text-[#E5E1E4]/30">
                    No voice profiles yet. Create one to shape how your content sounds.
                  </div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!creating && !editing && (
          <div className="px-6 py-4 border-t border-[#353437]/50 space-y-2">
            {importError && (
              <div className="px-3 py-2 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[#ffb4ab] text-xs">
                {importError}
              </div>
            )}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCreating(true)}
                className="liquid-gradient flex-1 py-2.5 rounded-xl text-sm font-bold text-[#2d1600]"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">add</span>
                  New Profile
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#554334] text-[#E5E1E4]/70 hover:text-[#E5E1E4] hover:border-[#FF9500]/40 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  {importing ? "Parsing..." : "Import .md"}
                </span>
              </motion.button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Profile Create/Edit Form ──────────────────────────────────────────────── */

function ProfileForm({
  profile,
  prefill,
  onSave,
  onCancel,
}: {
  profile: VoiceProfileItem | null;
  prefill?: VoiceProfileParsed | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  // prefill (from markdown import) takes priority over profile (edit mode)
  const src = prefill ?? profile;
  const [name, setName] = useState(src?.name ?? "");
  const [description, setDescription] = useState(src?.description ?? "");
  const [toneInput, setToneInput] = useState(src?.tone_keywords.join(", ") ?? "");
  const [styleRules, setStyleRules] = useState(src?.style_rules ?? "");
  const [sentenceStyle, setSentenceStyle] = useState(src?.sentence_style ?? "mixed");
  const [favoritePhrases, setFavoritePhrases] = useState(
    src?.favorite_phrases.join("\n") ?? "",
  );
  const [wordsToAvoid, setWordsToAvoid] = useState(src?.words_to_avoid.join(", ") ?? "");
  const [wordsToUse, setWordsToUse] = useState(src?.words_to_use.join(", ") ?? "");
  const [writingSample, setWritingSample] = useState(src?.writing_samples[0] ?? "");
  const [isDefault, setIsDefault] = useState(profile?.is_default ?? false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const data: VoiceProfileCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      tone_keywords: toneInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      style_rules: styleRules.trim() || undefined,
      sentence_style: sentenceStyle || undefined,
      favorite_phrases: favoritePhrases
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      words_to_avoid: wordsToAvoid
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      words_to_use: wordsToUse
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      writing_samples: writingSample.trim() ? [writingSample.trim()] : [],
      is_default: isDefault,
    };

    try {
      if (profile) {
        await api.updateVoiceProfile(profile.id, data);
      } else {
        await api.createVoiceProfile(data);
      }
      onSave();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-[#131315]/60 border border-[#353437] rounded-xl px-3 py-2 text-sm text-[#E5E1E4] placeholder:text-[#E5E1E4]/20 focus:outline-none focus:border-[#FF9500]/50 focus:ring-1 focus:ring-[#FF9500]/20 transition-all";
  const labelClass = "block text-[11px] font-medium text-[#E5E1E4]/50 uppercase tracking-wider mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      <h3 className="text-sm font-semibold text-[#E5E1E4]">
        {profile ? "Edit Profile" : "New Voice Profile"}
      </h3>

      <div>
        <label className={labelClass}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Personal Newsletter Voice"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of this voice style"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Tone Keywords (comma-separated)</label>
        <input
          value={toneInput}
          onChange={(e) => setToneInput(e.target.value)}
          placeholder="warm, observational, grounded, curious"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Sentence Style</label>
        <select
          value={sentenceStyle}
          onChange={(e) => setSentenceStyle(e.target.value)}
          className={inputClass}
        >
          <option value="mixed">Mixed (varied length)</option>
          <option value="short_punchy">Short &amp; punchy</option>
          <option value="long_flowing">Long &amp; flowing</option>
          <option value="varied">Deliberately varied</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Style Rules</label>
        <textarea
          value={styleRules}
          onChange={(e) => setStyleRules(e.target.value)}
          placeholder="Describe how you write: tone, rhythm, perspective, structure..."
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div>
        <label className={labelClass}>Signature Phrases (one per line)</label>
        <textarea
          value={favoritePhrases}
          onChange={(e) => setFavoritePhrases(e.target.value)}
          placeholder={"stay mindful, stay curious\nhere's the weight of it"}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Words to Use</label>
          <input
            value={wordsToUse}
            onChange={(e) => setWordsToUse(e.target.value)}
            placeholder="notice, weight, friction"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Words to Avoid</label>
          <input
            value={wordsToAvoid}
            onChange={(e) => setWordsToAvoid(e.target.value)}
            placeholder="journey, transform, unlock"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Writing Sample</label>
        <textarea
          value={writingSample}
          onChange={(e) => setWritingSample(e.target.value)}
          placeholder="Paste a paragraph that sounds like you at your best..."
          rows={4}
          className={`${inputClass} resize-y`}
        />
        <p className="text-[10px] text-[#E5E1E4]/25 mt-1">
          This helps the AI match your natural writing voice
        </p>
      </div>

      {/* Default toggle */}
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-[#E5E1E4]/70">Set as default</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsDefault(!isDefault)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isDefault ? "bg-[#FF9500]" : "bg-[#353437]"
          }`}
        >
          <motion.span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
            animate={{ x: isDefault ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </motion.button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-[#353437] text-sm text-[#E5E1E4]/60 hover:text-[#E5E1E4] hover:border-[#554334] transition-colors"
        >
          Cancel
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="flex-1 liquid-gradient py-2.5 rounded-xl text-sm font-bold text-[#2d1600] disabled:opacity-50"
        >
          {saving ? "Saving..." : profile ? "Update" : "Create"}
        </motion.button>
      </div>
    </motion.div>
  );
}
