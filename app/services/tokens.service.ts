import { api } from '@/lib/api';
import type { TokenBalance, TokenTransaction, TokenPackage, TokenEstimate, PaginatedResponse } from '@/types';

export const tokensService = {
  async getBalance(): Promise<number> {
    const response = await api.get<{ success: boolean; data: TokenBalance }>('/api/v1/tokens/balance');
    return response.data.balance;
  },

  async getTransactions(page = 1): Promise<PaginatedResponse<TokenTransaction>> {
    const response = await api.get<{ success: boolean; data: PaginatedResponse<TokenTransaction> }>(
      `/api/v1/tokens/transactions?page=${page}`
    );
    return response.data;
  },

  async getPackages(): Promise<TokenPackage[]> {
    const response = await api.get<{ success: boolean; data: TokenPackage[] }>('/api/v1/tokens/packages');
    return response.data;
  },

  async estimate(message: string): Promise<TokenEstimate> {
    const response = await api.post<{ success: boolean; data: TokenEstimate }>('/api/v1/chat/estimate', { message });
    return response.data;
  },
};
