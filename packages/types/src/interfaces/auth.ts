import type { Organization, User } from './index';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  organization: Organization | null;
  accessToken: string;
  refreshToken: string;
}
