import { api } from '@/lib/api';
import type { User } from '@/types';

export const profileService = {
  async get(): Promise<{ user: User; balance: number }> {
    const response = await api.get<{ success: boolean; data: { user: User; balance: number } }>('/api/v1/profile');
    return response.data;
  },

  async update(data: { name?: string; email?: string }): Promise<User> {
    const response = await api.put<{ success: boolean; data: { user: User }; message: string }>('/api/v1/profile', data);
    return response.data.user;
  },

  async updatePassword(data: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
    await api.put('/api/v1/profile/password', data);
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/api/v1/profile', { password });
  },
};
