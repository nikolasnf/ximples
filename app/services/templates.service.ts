import { api } from '@/lib/api';
import type { PageDocument, PageRecord, PageTemplate, PageTheme } from '@/types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TemplatePreviewResult {
  html: string;
  document: PageDocument;
  theme: PageTheme;
  template: { id: number; name: string; slug: string };
}

export interface TemplatePreviewBody {
  template_id: number;
  overrides?: {
    sections?: Record<string, unknown> | unknown[];
    theme?: Partial<PageTheme>;
    title?: string;
    meta_title?: string;
    meta_description?: string;
  };
}

export interface CreateFromTemplateBody {
  template_id: number;
  title?: string;
  overrides?: TemplatePreviewBody['overrides'];
}

export const templatesService = {
  async list(category?: string): Promise<PageTemplate[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await api.get<ApiEnvelope<PageTemplate[]>>(`/api/v1/templates${qs}`);
    return res.data;
  },

  async get(idOrSlug: number | string): Promise<PageTemplate> {
    const res = await api.get<ApiEnvelope<PageTemplate>>(`/api/v1/templates/${idOrSlug}`);
    return res.data;
  },

  async preview(body: TemplatePreviewBody): Promise<TemplatePreviewResult> {
    const res = await api.post<ApiEnvelope<TemplatePreviewResult>>('/api/v1/pages/preview', body);
    return res.data;
  },

  async createFromTemplate(body: CreateFromTemplateBody): Promise<PageRecord> {
    const res = await api.post<ApiEnvelope<PageRecord>>('/api/v1/pages/from-template', body);
    return res.data;
  },
};
