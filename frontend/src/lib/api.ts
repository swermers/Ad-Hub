const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Products
export const api = {
  // Products
  listProducts: async (): Promise<Product[]> => {
    const res = await request<Paginated<Product>>("/api/products");
    return res.items;
  },
  getProduct: (id: string) => request<Product>(`/api/products/${id}`),
  createProduct: (data: ProductCreate) =>
    request<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<ProductCreate>) =>
    request<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),

  // Ingestion
  startCrawl: (productId: string, maxPages: number = 20) =>
    request<CrawlStatus>(`/api/products/${productId}/crawl`, {
      method: "POST",
      body: JSON.stringify({ max_pages: maxPages }),
    }),
  getCrawlStatus: (productId: string, taskId: string) =>
    request<CrawlStatus>(`/api/products/${productId}/crawl-status/${taskId}`),
  listCrawledPages: (productId: string) =>
    request<CrawledPage[]>(`/api/products/${productId}/pages`),
  generateBrief: (productId: string) =>
    request<{ product_id: string; brand_brief: string | null }>(
      `/api/products/${productId}/generate-brief`,
      { method: "POST" }
    ),

  // Generation
  generateContent: (productId: string, data: GenerateRequest) =>
    request<GenerateStatus>(`/api/products/${productId}/generate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGenerateStatus: (productId: string, taskId: string) =>
    request<GenerateStatus>(
      `/api/products/${productId}/generate-status/${taskId}`
    ),

  // Content
  listContent: (params?: ContentFilter) => {
    const searchParams = new URLSearchParams();
    if (params?.product_id) searchParams.set("product_id", params.product_id);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.content_type)
      searchParams.set("content_type", params.content_type);
    const qs = searchParams.toString();
    return request<Paginated<ContentPiece>>(`/api/content${qs ? `?${qs}` : ""}`).then(
      (res) => res.items
    );
  },
  getContent: (id: string) => request<ContentPiece>(`/api/content/${id}`),
  updateContent: (id: string, data: Partial<ContentPiece>) =>
    request<ContentPiece>(`/api/content/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateContentStatus: (id: string, status: string) =>
    request<ContentPiece>(`/api/content/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteContent: (id: string) =>
    request<void>(`/api/content/${id}`, { method: "DELETE" }),
};

// Types
export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface Product {
  id: string;
  name: string;
  website_url: string | null;
  description: string;
  target_audience: string;
  pain_points: string;
  differentiators: string;
  brand_voice: string | null;
  brand_brief: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  website_url?: string;
  description?: string;
  target_audience?: string;
  pain_points?: string;
  differentiators?: string;
}

export interface CrawlStatus {
  task_id: string;
  status: string;
  pages_crawled: number;
  error: string | null;
}

export interface CrawledPage {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  page_type: string;
  crawled_at: string;
}

export interface GenerateRequest {
  content_types: string[];
  platforms: string[];
  count: number;
  funnel_stage: string;
  instructions?: string;
}

export interface GenerateStatus {
  task_id: string;
  status: string;
  pieces_generated: number;
  error: string | null;
}

export interface ContentPiece {
  id: string;
  product_id: string;
  content_type: string;
  platform: string;
  title: string | null;
  body: string;
  hook: string | null;
  cta: string | null;
  funnel_stage: string;
  status: string;
  generation_metadata: string | null;
  created_at: string;
}

export interface ContentFilter {
  product_id?: string;
  status?: string;
  platform?: string;
  content_type?: string;
}
