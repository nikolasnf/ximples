import { api } from '@/lib/api';
import type { Asset } from '@/types';

export const assetsService = {
  async list(chatId: number): Promise<Asset[]> {
    const response = await api.get<{ assets: Asset[] }>(`/api/v1/assets/${chatId}`);
    return response.assets;
  },

  async get(assetId: number): Promise<Asset> {
    const response = await api.get<{ asset: Asset }>(`/api/v1/assets/show/${assetId}`);
    return response.asset;
  },

  async update(assetId: number, data: { name?: string; content?: Record<string, unknown> }): Promise<Asset> {
    const response = await api.put<{ asset: Asset }>(`/api/v1/assets/${assetId}`, data);
    return response.asset;
  },

  async delete(assetId: number): Promise<void> {
    await api.delete(`/api/v1/assets/${assetId}`);
  },
};
