import { api } from '@/lib/api';
import type { LoginResponse } from '@sitepilot/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export type RegisterResponse = LoginResponse;

export interface InvitationPreview {
  email: string;
  role: string;
  organizationName: string;
  invitedByName: string;
  expiresAt: string;
  /** The invited email already has an account, so the person confirms with their existing password. */
  hasAccount: boolean;
}

export interface AcceptInvitationPayload {
  name?: string;
  password: string;
}

export interface UpdateOrganizationPayload {
  address?: string;
  gstNumber?: string;
  currency?: string;
  timezone?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const authApi = {
  register: async (data: RegisterPayload): Promise<RegisterResponse> => {
    const response = await api.post<ApiEnvelope<RegisterResponse>>('/auth/register', data);
    return response.data.data;
  },

  login: async (data: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', data);
    return response.data.data;
  },

  /** Ends the session on the server and clears the session cookies. */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<string> => {
    const response = await api.post<ApiEnvelope<null>>('/auth/forgot-password', { email });
    return response.data.message;
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },

  getInvitation: async (token: string): Promise<InvitationPreview> => {
    const response = await api.get<ApiEnvelope<InvitationPreview>>(`/invitations/${encodeURIComponent(token)}`);
    return response.data.data;
  },

  acceptInvitation: async (token: string, data: AcceptInvitationPayload): Promise<LoginResponse> => {
    const response = await api.post<ApiEnvelope<LoginResponse>>(`/invitations/${encodeURIComponent(token)}/accept`, data);
    return response.data.data;
  },

  updateOrganization: async (data: UpdateOrganizationPayload) => {
    const response = await api.patch('/settings/organization', data);
    return response.data.data;
  },
};
