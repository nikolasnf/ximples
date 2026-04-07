import { api } from '@/lib/api';
import type { AuthResponse, User } from '@/types';

interface AuthResponseWithBalance extends AuthResponse {
  balance: number;
}

interface MeResponse {
  user: User;
  balance: number;
}

export const authService = {
  async signup(data: { name: string; email: string; password: string; password_confirmation: string }): Promise<AuthResponseWithBalance> {
    return api.post<AuthResponseWithBalance>('/api/v1/auth/signup', data);
  },

  async login(data: { email: string; password: string }): Promise<AuthResponseWithBalance> {
    return api.post<AuthResponseWithBalance>('/api/v1/auth/login', data);
  },

  async logout(): Promise<void> {
    await api.post('/api/v1/auth/logout');
  },

  async me(): Promise<MeResponse> {
    return api.get<MeResponse>('/api/v1/auth/me');
  },
};
