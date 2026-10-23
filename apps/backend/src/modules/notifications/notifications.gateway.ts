import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { AUTH_COOKIES } from '../auth/auth.constants';
import { readCookieFromHeader } from '../auth/auth-cookies';

/** One room per member per organization, so someone in two organizations only hears about the one they're in. */
function roomFor(organizationId: string, userId: string): string {
  return `org:${organizationId}:user:${userId}`;
}

/** Live delivery of new notifications. Allowed origins come from the CORS-aware adapter set up in main.ts. */
@Injectable()
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly tokens: TokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    // Browsers send the access cookie with the handshake; other clients can pass the token explicitly.
    const token = readCookieFromHeader(client.handshake.headers.cookie, AUTH_COOKIES.access) ?? client.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.tokens.verify(token, 'access');
      await client.join(roomFor(payload.organizationId, payload.sub));
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(organizationId: string, userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not ready; skipping live delivery');
      return;
    }
    this.server.to(roomFor(organizationId, userId)).emit(event, payload);
  }
}
