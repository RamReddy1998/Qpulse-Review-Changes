import api from './api';
import { ApiResponse, PaginatedResponse, AdminDashboard, LearnerAnalytics, Batch, User, BatchParticipantAnalytics, UploadResult, Question } from '../types';

export const adminService = {
  async getDashboard(): Promise<AdminDashboard> {
    const res = await api.get<ApiResponse<AdminDashboard>>('/admin/dashboard');
    return res.data.data;
  },

  async getLearners(page = 1, limit = 20) {
    const res = await api.get<PaginatedResponse<User>>(`/admin/learners?page=${page}&limit=${limit}`);
    return res.data;
  },

  async getLearnerAnalytics(userId: string): Promise<LearnerAnalytics> {
    const res = await api.get<ApiResponse<LearnerAnalytics>>(`/admin/learners/${userId}/analytics`);
    return res.data.data;
  },

  async createBatch(batchName: string, certificationId: string, startTime?: string, endTime?: string): Promise<Batch> {
    const res = await api.post<ApiResponse<Batch>>('/admin/batches', { batchName, certificationId, startTime, endTime });
    return res.data.data;
  },

  async getBatches(page = 1, limit = 20) {
    const res = await api.get<PaginatedResponse<Batch>>(`/admin/batches?page=${page}&limit=${limit}`);
    return res.data;
  },

  async updateBatch(batchId: string, data: Partial<Batch>): Promise<Batch> {
    const res = await api.put<ApiResponse<Batch>>(`/admin/batches/${batchId}`, data);
    return res.data.data;
  },

  async deleteBatch(batchId: string): Promise<{ success: boolean }> {
    const res = await api.delete<ApiResponse<{ success: boolean }>>(`/admin/batches/${batchId}`);
    return res.data.data;
  },

  async getBatchDetails(batchId: string): Promise<Batch> {
    const res = await api.get<ApiResponse<Batch>>(`/admin/batches/${batchId}`);
    return res.data.data;
  },

  async getBatchParticipantsAnalytics(batchId: string, page = 1, limit = 20) {
    const res = await api.get<ApiResponse<{ data: BatchParticipantAnalytics[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>>(
      `/admin/batches/${batchId}/analytics?page=${page}&limit=${limit}`
    );
    return res.data.data;
  },

  async addParticipant(batchId: string, username: string) {
    const res = await api.post<ApiResponse<{ message: string }>>(`/admin/batches/${batchId}/participants`, {
      username,
    });
    return res.data.data;
  },

  async removeParticipant(batchId: string, userId: string) {
    const res = await api.delete<ApiResponse<{ message: string }>>(
      `/admin/batches/${batchId}/participants/${userId}`
    );
    return res.data.data;
  },

  async getWeaknessQuestions(topic: string, certificationId?: string) {
    const res = await api.get<ApiResponse<any[]>>('/admin/weakness/questions', {
      params: { topic, certificationId },
    });
    return res.data.data;
  },

  async uploadQuestions(certificationId: string, questions: any[]) {
    const res = await api.post<ApiResponse<UploadResult>>(`/admin/questions/${certificationId}/upload`, { questions });
    return res.data.data;
  },

  async uploadQuestionsNew(certificationName: string, questions: any[]) {
    const res = await api.post<ApiResponse<UploadResult>>(`/admin/questions/upload-new`, { certificationName, questions });
    return res.data.data;
  },

  async getQuestionsByCertification(certificationId: string, page = 1, limit = 50) {
    const res = await api.get<PaginatedResponse<Question>>(`/admin/certifications/${certificationId}/questions?page=${page}&limit=${limit}`);
    return res.data;
  },

  async updateQuestion(questionId: string, data: Partial<Question>) {
    const res = await api.put<ApiResponse<Question>>(`/admin/questions/${questionId}`, data);
    return res.data.data;
  },

  async deleteQuestion(questionId: string) {
    const res = await api.delete<ApiResponse<{ success: boolean }>>(`/admin/questions/${questionId}`);
    return res.data.data;
  },

  async deleteCertification(certificationId: string) {
    const res = await api.delete<ApiResponse<{ success: boolean }>>(`/admin/certifications/${certificationId}`);
    return res.data.data;
  },
  async aiExtractQuestions(file: File): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<any[]>>('/admin/questions/ai-extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },
};
