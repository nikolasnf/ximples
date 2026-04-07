export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
