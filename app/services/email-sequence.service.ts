import { api } from '@/lib/api';

export interface DispatchResult {
  message: string;
  dispatch_id: string;
  total_emails: number;
  contacts: number;
  steps: number;
  token_cost: number;
}

export interface EmailSendRecord {
  id: number;
  asset_id: number;
  contact_id: number;
  contact_email: string;
  contact_name: string | null;
  step_sequence: number;
  subject_rendered: string;
  body_rendered: string;
  delay_hours: number;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  brevo_message_id: string | null;
  error_message: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  dispatch_id: string;
  created_at: string;
}

export interface SequenceStats {
  stats: {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    skipped: number;
    opened: number;
    clicked: number;
    last_sent_at: string | null;
  };
  steps: Array<{
    step_sequence: number;
    total: number;
    sent: number;
    failed: number;
    pending: number;
    opened: number;
    clicked: number;
  }>;
  dispatches: Array<{
    dispatch_id: string;
    list_id: number | null;
    total: number;
    sent: number;
    failed: number;
    dispatched_at: string;
    last_sent_at: string | null;
  }>;
}

export interface PaginatedSends {
  data: EmailSendRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const emailSequenceService = {
  async dispatch(assetId: number, listId: number): Promise<DispatchResult> {
    return api.post<DispatchResult>(`/api/v1/email-sequences/${assetId}/dispatch`, {
      list_id: listId,
    });
  },

  async getStats(assetId: number): Promise<SequenceStats> {
    return api.get<SequenceStats>(`/api/v1/email-sequences/${assetId}/stats`);
  },

  async getSends(
    assetId: number,
    params?: { dispatch_id?: string; status?: string; step?: number; page?: number; per_page?: number },
  ): Promise<PaginatedSends> {
    const searchParams = new URLSearchParams();
    if (params?.dispatch_id) searchParams.set('dispatch_id', params.dispatch_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.step !== undefined) searchParams.set('step', String(params.step));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.per_page) searchParams.set('per_page', String(params.per_page));
    const qs = searchParams.toString();
    return api.get<PaginatedSends>(`/api/v1/email-sequences/${assetId}/sends${qs ? `?${qs}` : ''}`);
  },
};
