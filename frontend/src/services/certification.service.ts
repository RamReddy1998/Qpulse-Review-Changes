import api from './api';
import { ApiResponse, Certification } from '../types';

export const certificationService = {
  async getAll(): Promise<Certification[]> {
    const res = await api.get<ApiResponse<Certification[]>>('/certifications');
    return res.data.data;
  },

  async getById(id: string): Promise<Certification> {
    const res = await api.get<ApiResponse<Certification>>(`/certifications/${id}`);
    return res.data.data;
  },

  async getTopics(id: string): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(`/certifications/${id}/topics`);
    return res.data.data;
  },

  async getDifficulties(id: string): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(`/certifications/${id}/difficulties`);
    return res.data.data;
  },
};
