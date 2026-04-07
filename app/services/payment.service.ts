import { api } from '@/lib/api';

export const paymentService = {
  async createCheckout(packageId: number): Promise<{ checkout_url: string; session_id: string }> {
    const response = await api.post<{ success: boolean; data: { checkout_url: string; session_id: string } }>(
      '/api/v1/tokens/purchase',
      { package_id: packageId }
    );
    return response.data;
  },
};
