import { api } from '@/lib/api';
import type { LoginResponse } from '@sitepilot/types';

export const authApi = {
  login: async (data: any): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },
};
