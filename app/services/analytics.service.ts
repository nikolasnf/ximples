import { api } from '@/lib/api';

export interface FunnelStep {
  label: string;
  value: number;
}

export interface OverviewAnalytics {
  range: { from: string; to: string };
  totals: { sent: number; clicks: number; visits: number; conversions: number };
  unique: { clickers: number; visitors: number; converters: number };
  rates: { ctr: number; visit_rate: number; conversion_rate: number };
  funnel: FunnelStep[];
}

export interface CampaignAnalyticsContactRow {
  contact_id: number;
  contact: { id: number; name: string | null; phone: string; email: string | null } | null;
  send_status: 'pending' | 'sent' | 'failed' | 'skipped';
  sent_at: string | null;
  clicked: boolean;
  visited: boolean;
  converted: boolean;
  error: string | null;
}

export interface CampaignAnalytics {
  campaign: {
    id: number;
    name: string;
    status: string;
    total_contacts: number;
    sent_count: number;
    failed_count: number;
    started_at: string | null;
    completed_at: string | null;
  };
  totals: { sent: number; clicks: number; visits: number; conversions: number };
  unique: { clickers: number; visitors: number; converters: number };
  rates: { ctr: number; conversion_rate: number };
  funnel: FunnelStep[];
  contacts: CampaignAnalyticsContactRow[];
}

export const analyticsService = {
  async overview(params: { from?: string; to?: string } = {}): Promise<OverviewAnalytics> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await api.get<{ success: boolean; data: OverviewAnalytics }>(
      `/api/v1/analytics/overview${query}`,
    );
    return res.data;
  },

  async campaign(id: number): Promise<CampaignAnalytics> {
    const res = await api.get<{ success: boolean; data: CampaignAnalytics }>(
      `/api/v1/analytics/campaign/${id}`,
    );
    return res.data;
  },
};
