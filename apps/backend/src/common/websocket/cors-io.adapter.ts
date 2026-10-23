import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

/** Socket.IO with the same allowed origins as the REST API, so cookies are only accepted from our frontends. */
export class CorsIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext, private readonly origins: string[]) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, { ...options, cors: { origin: this.origins, credentials: true } });
  }
}
