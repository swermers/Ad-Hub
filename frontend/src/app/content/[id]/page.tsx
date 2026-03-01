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

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {piece.title || "Untitled Content"}
          </h1>
          <p className="text-gray-500 mt-1">
            {piece.content_type} &middot; {piece.platform} &middot;{" "}
            {piece.funnel_stage}
          </p>
        </div>
        <StatusBadge status={piece.status} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        {piece.status === "draft" && (
          <>
            <button
              onClick={() => handleStatusChange("approved")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleStatusChange("rejected")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Reject
            </button>
          </>
        )}
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          {editing ? "Cancel Edit" : "Edit"}
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
        >
          Delete
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
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
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {piece.body}
          </div>
        )}
      </div>

      {/* Hook & CTA */}
      {(piece.hook || piece.cta) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            {piece.hook && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Hook</p>
                <p className="text-sm text-gray-900">{piece.hook}</p>
              </div>
            )}
            {piece.cta && (
              <div>
                <p className="text-sm text-gray-500 mb-1">CTA</p>
                <p className="text-sm text-gray-900">{piece.cta}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Generation Metadata
          </h3>
          <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-x-auto">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    posted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
