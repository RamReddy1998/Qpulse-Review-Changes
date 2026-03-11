import api from './api';
import { ApiResponse, Question, AiExplanation, AiHint } from '../types';

export const practiceService = {
  async getQuestions(certificationId: string, count = 1, excludeIds: string[] = []): Promise<Question[]> {
    const params = new URLSearchParams();
    params.set('count', String(count));
    if (excludeIds.length > 0) params.set('excludeIds', excludeIds.join(','));

    const res = await api.get<ApiResponse<Question[]>>(
      `/practice/questions/${certificationId}?${params.toString()}`
    );
    return res.data.data;
  },

  async getFilteredQuestions(certificationId: string, filters: { topic?: string; difficulty?: string; limit?: number }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    if (filters.limit) params.set('limit', String(filters.limit));

    const res = await api.get<ApiResponse<Question[]>>(
      `/practice/questions/${certificationId}/filtered?${params.toString()}`
    );
    return res.data.data;
  },

  async getFilterCount(certificationId: string, filters: { topic?: string | string[]; difficulty?: string | string[] }): Promise<number> {
    const params = new URLSearchParams();
    if (filters.topic) {
      if (Array.isArray(filters.topic)) {
        filters.topic.forEach(t => params.append('topic', t));
      } else {
        params.set('topic', filters.topic);
      }
    }
    if (filters.difficulty) {
      if (Array.isArray(filters.difficulty)) {
        filters.difficulty.forEach(d => params.append('difficulty', d));
      } else {
        params.set('difficulty', filters.difficulty);
      }
    }

    const res = await api.get<ApiResponse<number>>(
      `/practice/questions/${certificationId}/count?${params.toString()}`
    );
    return res.data.data;
  },

  async getDifficulties(certificationId: string): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(`/practice/difficulties/${certificationId}`);
    return res.data.data;
  },

  async getQuestionById(questionId: string): Promise<Question> {
    const res = await api.get<ApiResponse<Question>>(`/practice/question/${questionId}`);
    return res.data.data;
  },

  async getHint(questionId: string): Promise<AiHint> {
    const res = await api.get<ApiResponse<AiHint>>(`/practice/hint/${questionId}`);
    return res.data.data;
  },

  async submitAnswer(questionId: string, userAnswer: string, timeSpentSec: number) {
    const res = await api.post<ApiResponse<{ isCorrect: boolean; correctAnswer: string; userAnswer: string }>>(
      '/practice/submit',
      { questionId, userAnswer, timeSpentSec }
    );
    return res.data.data;
  },

  async getExplanation(questionId: string, userAnswer?: string): Promise<AiExplanation> {
    const params = userAnswer ? `?userAnswer=${userAnswer}` : '';
    const res = await api.get<ApiResponse<AiExplanation>>(`/practice/explanation/${questionId}${params}`);
    return res.data.data;
  },

  async getTopics(certificationId: string): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(`/practice/topics/${certificationId}`);
    return res.data.data;
  },

  async getQuestionByOffset(certificationId: string, offset: number, filters?: { topic?: string, difficulty?: string }): Promise<Question> {
    const params = new URLSearchParams({ offset: offset.toString() });
    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);

    const res = await api.get<ApiResponse<Question>>(
      `/practice/questions/${certificationId}/offset?${params.toString()}`
    );
    return res.data.data;
  },

  async getTotalCount(certificationId: string): Promise<number> {
    const res = await api.get<ApiResponse<number>>(`/practice/questions/${certificationId}/total`);
    return res.data.data;
  },
};
