import api from './api';
import { ApiResponse, PaginatedResponse, ReadinessScore, ReadinessHistory, TopicAccuracy, MistakeLog } from '../types';

export const readinessService = {
  async calculate(certificationId?: string): Promise<ReadinessScore> {
    const params = certificationId ? `?certificationId=${certificationId}` : '';
    const res = await api.post<ApiResponse<ReadinessScore>>(`/readiness/calculate${params}`);
    return res.data.data;
  },

  async getLatest(certificationId?: string): Promise<ReadinessHistory | null> {
    const params = certificationId ? `?certificationId=${certificationId}` : '';
    const res = await api.get<ApiResponse<ReadinessHistory | null>>(`/readiness/latest${params}`);
    return res.data.data;
  },

  async getHistory(certificationId?: string): Promise<ReadinessHistory[]> {
    const params = certificationId ? `?certificationId=${certificationId}` : '';
    const res = await api.get<ApiResponse<ReadinessHistory[]>>(`/readiness/history${params}`);
    return res.data.data;
  },

  async getTopicAccuracy(certificationId?: string): Promise<TopicAccuracy[]> {
    const params = certificationId ? `?certificationId=${certificationId}` : '';
    const res = await api.get<ApiResponse<TopicAccuracy[]>>(`/readiness/topic-accuracy${params}`);
    return res.data.data;
  },

  async getMistakes(page = 1, limit = 20) {
    const res = await api.get<PaginatedResponse<MistakeLog>>(`/readiness/mistakes?page=${page}&limit=${limit}`);
    return res.data;
  },
};
