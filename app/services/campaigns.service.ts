import { api } from '@/lib/api';
import type { Contact } from './contacts.service';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
export type CampaignContactStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface Campaign {
  id: number;
  user_id: number;
  list_id: number | null;
  landing_page_id: number | null;
  name: string;
  type: 'whatsapp';
  status: CampaignStatus;
  message_template: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  list?: { id: number; name: string } | null;
  landing_page?: { id: number; title: string; slug: string } | null;
}

export interface CampaignLog {
  id: number;
  campaign_id: number;
  contact_id: number;
  status: CampaignContactStatus;
  sent_at: string | null;
  error_message: string | null;
  rendered_message: string | null;
  contact?: Pick<Contact, 'id' | 'name' | 'phone' | 'email'>;
}

export interface CampaignLogsResponse {
  data: CampaignLog[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    campaign: {
      id: number;
      status: CampaignStatus;
      total_contacts: number;
      sent_count: number;
      failed_count: number;
    };
  };
}

export const campaignsService = {
  async list(): Promise<Campaign[]> {
    const res = await api.get<{ success: boolean; data: Campaign[] }>('/api/v1/campaigns');
    return res.data;
  },

  async get(id: number): Promise<Campaign> {
    const res = await api.get<{ success: boolean; data: Campaign }>(`/api/v1/campaigns/${id}`);
    return res.data;
  },

  async create(data: {
    name: string;
    list_id: number;
    message_template: string;
    landing_page_id?: number;
    scheduled_at?: string;
  }): Promise<Campaign> {
    const res = await api.post<{ success: boolean; data: Campaign }>('/api/v1/campaigns', data);
    return res.data;
  },

  async update(
    id: number,
    data: Partial<{ name: string; list_id: number; message_template: string; landing_page_id: number | null; scheduled_at: string | null }>,
  ): Promise<Campaign> {
    const res = await api.put<{ success: boolean; data: Campaign }>(`/api/v1/campaigns/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/campaigns/${id}`);
  },

  async send(id: number): Promise<Campaign> {
    const res = await api.post<{ success: boolean; data: Campaign }>(`/api/v1/campaigns/${id}/send`);
    return res.data;
  },

  async logs(id: number, params: { status?: CampaignContactStatus; per_page?: number } = {}): Promise<CampaignLogsResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.per_page) qs.set('per_page', String(params.per_page));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await api.get<{ success: boolean } & CampaignLogsResponse>(`/api/v1/campaigns/${id}/logs${query}`);
    return { data: res.data, meta: res.meta };
  },
};

/**
 * Render a message template client-side for preview purposes.
 * Supports {{name}}, {{phone}}, {{email}}, {{link}}.
 */
export function renderMessagePreview(
  template: string,
  ctx: { name?: string; phone?: string; email?: string; link?: string },
): string {
  return template
    .replace(/\{\{name\}\}/g, ctx.name ?? '')
    .replace(/\{\{phone\}\}/g, ctx.phone ?? '')
    .replace(/\{\{email\}\}/g, ctx.email ?? '')
    .replace(/\{\{link\}\}/g, ctx.link ?? '');
}
