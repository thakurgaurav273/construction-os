import { api } from '@/lib/api';
import type { LoginResponse } from '@sitepilot/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export type RegisterResponse = LoginResponse;

export interface UpdateOrganizationPayload {
  address?: string;
  gstNumber?: string;
  currency?: string;
  timezone?: string;
}

function unwrap<T>(response: { data: { data: T } | T }): T {
  const body = response.data as any;
  return 'data' in body && 'success' in body ? body.data : body;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data);
    return unwrap(response);
  },

  login: async (data: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return unwrap(response);
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return unwrap(response);
  },

  updateOrganization: async (data: UpdateOrganizationPayload) => {
    const response = await api.patch('/auth/organization', data);
    return unwrap(response);
  },
};
