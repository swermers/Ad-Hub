"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website_url: "",
    description: "",
    target_audience: "",
    pain_points: "",
    differentiators: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const product = await api.createProduct(form);
      router.push(`/products/${product.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create product");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Product</h1>
      <p className="text-gray-500 mb-8">
        Enter your product details. You can crawl the website and generate a
        brand brief after creating.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field
          label="Product Name"
          required
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="e.g., Newsletter Curator"
        />
        <Field
          label="Website URL"
          value={form.website_url}
          onChange={(v) => setForm({ ...form, website_url: v })}
          placeholder="https://example.com"
        />
        <TextArea
          label="Description"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          placeholder="Brief description of your product"
        />
        <TextArea
          label="Target Audience"
          value={form.target_audience}
          onChange={(v) => setForm({ ...form, target_audience: v })}
          placeholder="Who is this product for?"
        />
        <TextArea
          label="Pain Points"
          value={form.pain_points}
          onChange={(v) => setForm({ ...form, pain_points: v })}
          placeholder="What problems does this solve?"
        />
        <TextArea
          label="Differentiators"
          value={form.differentiators}
          onChange={(v) => setForm({ ...form, differentiators: v })}
          placeholder="What makes this different from alternatives?"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.name}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
