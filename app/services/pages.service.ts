import type { PublicPage, PageRecord, PageExportResult, PageTheme, PageDocument } from '@/types/page';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.ximples.com.br';

/**
 * Public pages service (no auth required, used in SSR).
 */
export const pagesService = {
  async getBySlug(slug: string): Promise<PublicPage> {
    const response = await fetch(`${API_URL}/api/v1/public/pages/${slug}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Página não encontrada' : 'Erro ao carregar página');
    }

    const data = await response.json();
    return data.data;
  },
};

/**
 * Authenticated pages API service (uses apiClient with Bearer token).
 */
export const pagesApiService = {
  async list(filters?: { status?: string; type?: string }): Promise<PageRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ success: boolean; data: PageRecord[] }>(`/api/v1/pages${query}`);
    return res.data;
  },

  async get(id: number): Promise<PageRecord> {
    const res = await api.get<{ success: boolean; data: PageRecord }>(`/api/v1/pages/${id}`);
    return res.data;
  },

  async create(data: {
    title: string;
    slug?: string;
    type?: string;
    status?: string;
    meta_title?: string;
    meta_description?: string;
    theme_json?: PageTheme;
    content_json?: PageDocument;
  }): Promise<PageRecord> {
    const res = await api.post<{ success: boolean; data: PageRecord }>('/api/v1/pages', data);
    return res.data;
  },

  async update(id: number, data: Partial<{
    title: string;
    slug: string;
    type: string;
    status: string;
    meta_title: string;
    meta_description: string;
    theme_json: PageTheme;
    content_json: PageDocument;
  }>): Promise<PageRecord> {
    const res = await api.put<{ success: boolean; data: PageRecord }>(`/api/v1/pages/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/pages/${id}`);
  },

  async publish(id: number): Promise<PageRecord> {
    const res = await api.post<{ success: boolean; data: PageRecord }>(`/api/v1/pages/${id}/publish`);
    return res.data;
  },

  async export(id: number): Promise<PageExportResult> {
    const res = await api.post<{ success: boolean; data: PageExportResult }>(`/api/v1/pages/${id}/export`);
    return res.data;
  },

  async createFromTemplate(body: { template_id: number; title?: string; overrides?: Record<string, unknown> }): Promise<PageRecord> {
    const res = await api.post<{ success: boolean; data: PageRecord }>('/api/v1/pages/from-template', body);
    return res.data;
  },
};
