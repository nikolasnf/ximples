export interface Asset {
  id: number;
  chat_id: number;
  tenant_id: string;
  type: 'landing' | 'email' | 'whatsapp' | 'crm' | 'page' | 'copy';
  name: string;
  content: Record<string, unknown> | null;
  status: string;
  created_at: string;
  page?: { id: number; slug: string } | null;
}
