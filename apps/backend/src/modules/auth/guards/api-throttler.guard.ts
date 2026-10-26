import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectThrottlerOptions, InjectThrottlerStorage, ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import type { Request } from 'express';
import { extractAccessToken } from '../strategies/jwt.strategy';
import { TokenService } from '../token.service';

/**
 * The API-wide rate limit, applied to every route (tighter limits come from @Throttle, @SkipThrottle opts out).
 * Signed-in requests are counted per person, from a verified access token, so everyone behind one office
 * proxy or NAT still gets their own allowance. Anonymous requests (sign-in, password reset, invitations)
 * are counted per client IP, which is only the real client when TRUST_PROXY matches the proxy hops in front of the API.
 */
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly tokens: TokenService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(request: Request): Promise<string> {
    const token = extractAccessToken(request);
    if (token) {
      try {
        return `user:${this.tokens.verify(token, 'access').sub}`;
      } catch {
        // An expired or forged token is no identity; fall back to the address.
      }
    }
    return `ip:${request.ip ?? 'unknown'}`;
  }
}
