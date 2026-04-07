export interface Task {
  id: number;
  chat_id: number;
  tenant_id: string;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  created_at: string;
}
