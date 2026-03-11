import api from './api';
import { ApiResponse, User, Role } from '../types';

export const authService = {
  async register(username: string, password: string, role: Role): Promise<User> {
    const res = await api.post<ApiResponse<User>>('/auth/register', { username, password, role });
    return res.data.data;
  },

  async login(username: string, password: string, role: Role): Promise<User> {
    const res = await api.post<ApiResponse<User>>('/auth/login', { username, password, role });
    return res.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refresh(): Promise<void> {
    await api.post('/auth/refresh');
  },

  async getProfile(): Promise<User> {
    const res = await api.get<ApiResponse<User>>('/auth/profile');
    return res.data.data;
  },
};
