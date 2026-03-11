import api from './api';
import { ApiResponse, PaginatedResponse, MockTestStart, MockTestResult, MockTestResultDetail, MockTestHistoryItem } from '../types';

export const mockTestService = {
  async start(certificationId: string, questionCount = 30, topics?: string[], difficulties?: string[], mockName?: string): Promise<MockTestStart> {
    const res = await api.post<ApiResponse<MockTestStart>>('/mock-tests/start', {
      certificationId,
      questionCount,
      topics,
      difficulties,
      mockName,
    });
    return res.data.data;
  },

  async submit(
    mockTestId: string,
    answers: Array<{ questionId: string; userAnswer: string; timeSpentSec: number }>
  ): Promise<MockTestResult> {
    const res = await api.post<ApiResponse<MockTestResult>>(`/mock-tests/${mockTestId}/submit`, {
      answers,
    });
    return res.data.data;
  },

  async getResult(mockTestId: string): Promise<MockTestResultDetail> {
    const res = await api.get<ApiResponse<MockTestResultDetail>>(`/mock-tests/${mockTestId}/result`);
    return res.data.data;
  },

  async getHistory(page = 1, limit = 20) {
    const res = await api.get<PaginatedResponse<MockTestHistoryItem>>(`/mock-tests/history?page=${page}&limit=${limit}`);
    return res.data;
  },
};
