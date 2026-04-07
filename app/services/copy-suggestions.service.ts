import { api } from '@/lib/api';

export type CopySourceType = 'campaign' | 'page' | 'experiment';
export type CopySuggestionType =
  | 'headline'
  | 'subheadline'
  | 'cta'
  | 'message_opening'
  | 'body'
  | 'full_message';
export type CopySuggestionStatus = 'generated' | 'applied' | 'dismissed';

export interface CopySuggestion {
  id: number;
  source_type: CopySourceType;
  source_id: number;
  suggestion_type: CopySuggestionType;
  original_copy: string;
  suggested_copy: string;
  summary: string | null;
  reasoning: string[];
  performance: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  status: CopySuggestionStatus;
  applied_at: string | null;
  applied_field: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface GenerateCopyPayload {
  source_type: CopySourceType;
  source_id: number;
  suggestion_type: CopySuggestionType;
  extras?: {
    product?: string;
    audience?: string;
    goal?: string;
    tone?: string;
  };
}

export const copySuggestionsService = {
  async generate(payload: GenerateCopyPayload): Promise<CopySuggestion> {
    const res = await api.post<{ success: boolean; data: CopySuggestion }>(
      '/api/v1/copy-suggestions/generate',
      payload,
    );
    return res.data;
  },

  async list(params: {
    source_type?: CopySourceType;
    source_id?: number;
    status?: CopySuggestionStatus;
    limit?: number;
  } = {}): Promise<CopySuggestion[]> {
    const qs = new URLSearchParams();
    if (params.source_type) qs.set('source_type', params.source_type);
    if (params.source_id) qs.set('source_id', String(params.source_id));
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await api.get<{ success: boolean; data: CopySuggestion[] }>(
      `/api/v1/copy-suggestions${query}`,
    );
    return res.data;
  },

  async get(id: number): Promise<CopySuggestion> {
    const res = await api.get<{ success: boolean; data: CopySuggestion }>(
      `/api/v1/copy-suggestions/${id}`,
    );
    return res.data;
  },

  async apply(id: number): Promise<CopySuggestion> {
    const res = await api.post<{ success: boolean; data: CopySuggestion }>(
      `/api/v1/copy-suggestions/${id}/apply`,
    );
    return res.data;
  },

  async dismiss(id: number): Promise<CopySuggestion> {
    const res = await api.post<{ success: boolean; data: CopySuggestion }>(
      `/api/v1/copy-suggestions/${id}/dismiss`,
    );
    return res.data;
  },
};

export const COPY_SUGGESTION_TYPE_LABELS: Record<CopySuggestionType, string> = {
  headline: 'Headline',
  subheadline: 'Subheadline',
  cta: 'Botão CTA',
  message_opening: 'Abertura da mensagem',
  body: 'Corpo',
  full_message: 'Mensagem completa',
};
