import type { User } from './index';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
