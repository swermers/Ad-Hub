"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type ContentPiece } from "@/lib/api";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getContent(id)
      .then((c) => {
        setPiece(c);
        setEditBody(c.body);
        setEditTitle(c.title || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!piece) return;
    setSaving(true);
    try {
      const updated = await api.updateContent(piece.id, {
        title: editTitle,
        body: editBody,
      });
      setPiece(updated);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!piece) return;
    try {
      const updated = await api.updateContentStatus(piece.id, status);
      setPiece(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleCopy = () => {
    if (!piece) return;
    navigator.clipboard.writeText(piece.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!piece || !confirm("Delete this content?")) return;
    await api.deleteContent(piece.id);
    router.push("/content");
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!piece) return <div className="text-red-500">Content not found</div>;

  let metadata: Record<string, unknown> | null = null;
  if (piece.generation_metadata) {
    try {
      metadata = JSON.parse(piece.generation_metadata);
    } catch {
      metadata = null;
    }
  }

  const platformLabel: Record<string, string> = {
    twitter: "Twitter / X",
    linkedin: "LinkedIn",
    meta: "Meta / Facebook",
    google: "Google Ads",
    general: "General",
  };

  const typeLabel: Record<string, string> = {
    social_post: "Social Post",
    ad_copy: "Ad Copy",
    email: "Email",
    blog_draft: "Blog Draft",
  };

  const funnelColors: Record<string, string> = {
    awareness: "bg-blue-50 text-blue-700 border-blue-200",
    consideration: "bg-amber-50 text-amber-700 border-amber-200",
    conversion: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/content")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        <span>&larr;</span> Back to Content Queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {piece.title || "Untitled Content"}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {typeLabel[piece.content_type] || piece.content_type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {platformLabel[piece.platform] || piece.platform}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${funnelColors[piece.funnel_stage] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
              {piece.funnel_stage.charAt(0).toUpperCase() + piece.funnel_stage.slice(1)}
            </span>
          </div>
        </div>
        <StatusBadge status={piece.status} />
      </div>

      {/* Hook callout */}
      {piece.hook && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Hook</p>
          <p className="text-sm font-medium text-indigo-900">{piece.hook}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        {editing ? (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
              {piece.body}
            </div>
          </div>
        )}

        {/* CTA callout inside card */}
        {piece.cta && !editing && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Call to Action</p>
            <p className="text-sm font-medium text-gray-900">{piece.cta}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6">
        {piece.status === "draft" && (
          <>
            <button
              onClick={() => handleStatusChange("approved")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("rejected")}
              className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {piece.status === "approved" && (
          <button
            onClick={() => handleStatusChange("draft")}
            className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Move to Draft
          </button>
        )}
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Generation info - clean, not raw JSON */}
      {metadata && (
        <div className="text-xs text-gray-400 flex items-center gap-3">
          <span>
            Generated by {String(metadata.model || "AI").replace(/-\d+$/, "")}
          </span>
          <span>&middot;</span>
          <span>{piece.funnel_stage} stage</span>
          {metadata.output_tokens != null && (
            <>
              <span>&middot;</span>
              <span>{Number(metadata.output_tokens)} tokens</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string }> = {
    draft: { bg: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
    approved: { bg: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-400" },
    posted: { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
    rejected: { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
  };
  const c = config[status] || { bg: "bg-gray-50 text-gray-700 border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
