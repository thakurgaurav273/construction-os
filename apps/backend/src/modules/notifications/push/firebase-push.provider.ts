import { Injectable, Logger } from '@nestjs/common';
import { PushProvider, PushPayload, PushSendResult } from './push-provider.interface';

@Injectable()
export class FirebasePushProvider implements PushProvider {
  private readonly logger = new Logger(FirebasePushProvider.name);

  async sendToTokens(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    // Firebase not configured - log and skip
    this.logger.log(`[push fallback] would send "${payload.title}" to ${tokens.length} token(s)`);
    return { invalidTokens: [] };
  }
}