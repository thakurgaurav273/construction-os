import { api } from '@/lib/api';
import type { LoginResponse } from '@sitepilot/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface RegisterResponse extends LoginResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
  };
}

export interface UpdateOrganizationPayload {
  address?: string;
  gstNumber?: string;
  currency?: string;
  timezone?: string;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  updateOrganization: async (data: UpdateOrganizationPayload) => {
    const response = await api.patch('/auth/organization', data);
    return response.data;
  },
};
