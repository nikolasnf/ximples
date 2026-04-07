import { api } from '@/lib/api';
import type { Chat } from '@/types';

export interface ChatSendResponse {
  success: boolean;
  chat: Chat;
  token_cost?: number;
  current_balance?: number;
}

export const chatService = {
  async list(): Promise<Chat[]> {
    const response = await api.get<{ chats: Chat[] }>('/api/v1/chat');
    return response.chats;
  },

  async get(id: number): Promise<Chat> {
    const response = await api.get<{ chat: Chat }>(`/api/v1/chat/${id}`);
    return response.chat;
  },

  async send(data: { chat_id?: number; message: string; template_id?: number }): Promise<ChatSendResponse> {
    return api.post<ChatSendResponse>('/api/v1/chat/send', data);
  },

  async update(id: number, title: string): Promise<Chat> {
    const response = await api.put<{ success: boolean; chat: Chat }>(`/api/v1/chat/${id}`, { title });
    return response.chat;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/api/v1/chat/${id}`);
  },
};
