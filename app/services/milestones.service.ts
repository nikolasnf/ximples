import { api } from '@/lib/api';
import type { Milestone } from '@/types';

export const milestonesService = {
  async list(chatId: number): Promise<Milestone[]> {
    const response = await api.get<{ milestones: Milestone[] }>(`/api/v1/milestones/${chatId}`);
    return response.milestones;
  },
};
