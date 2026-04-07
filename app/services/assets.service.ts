import { api } from '@/lib/api';
import type { Asset } from '@/types';

export const assetsService = {
  async list(chatId: number): Promise<Asset[]> {
    const response = await api.get<{ assets: Asset[] }>(`/api/v1/assets/${chatId}`);
    return response.assets;
  },

  async delete(assetId: number): Promise<void> {
    await api.delete(`/api/v1/assets/${assetId}`);
  },
};
