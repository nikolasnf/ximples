import { api } from '@/lib/api';

export const passwordService = {
  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post<{ success: boolean; message: string }>('/api/v1/password/forgot', { email });
  },

  async resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    return api.post<{ success: boolean; message: string }>('/api/v1/password/reset', data);
  },
};
