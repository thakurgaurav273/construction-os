import type { Organization, User } from './index';

export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * What login and registration return. Session tokens are never in the body; the API sets them as
 * HttpOnly cookies that page scripts can't read.
 */
export interface LoginResponse {
  user: User;
  organization: Organization | null;
}
