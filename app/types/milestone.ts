export interface Milestone {
  id: number;
  chat_id: number;
  tenant_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'done';
  progress: number;
  created_at: string;
}
