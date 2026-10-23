import { Injectable, Logger } from '@nestjs/common';
import { readCookieFromHeader } from '../auth/auth-cookies';
import { TokenService } from '../auth/token.service';
import { AUTH_COOKIES } from '../auth/auth.constants';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly tokens: TokenService) {}

  handleConnection(client: Socket) {
    // Browsers send the access cookie with the handshake; other clients can pass the token explicitly.
    const token = readCookieFromHeader(client.handshake.headers.cookie, AUTH_COOKIES.access) ?? client.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      client.disconnect();
      return;
    }

    try {
      const payload = this.tokens.verify(token, 'access');
      client.data.userId = payload.sub;
      if (!this.userSockets.has(payload.sub)) this.userSockets.set(payload.sub, new Set());
      this.userSockets.get(payload.sub)!.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (userId) this.userSockets.get(userId)?.delete(client.id);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return;
    for (const id of socketIds) {
      this.server.to(id).emit(event, payload);
    }
  }
}