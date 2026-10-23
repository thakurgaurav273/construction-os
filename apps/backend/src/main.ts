import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorsIoAdapter } from './common/websocket/cors-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');

  // CORS_ORIGINS allows several browser origins (preview deploys, custom domains).
  // FRONTEND_URL stays the single canonical URL used to build links in emails.
  const configuredOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = configuredOrigins.length > 0 ? configuredOrigins : [frontendUrl];

  // Behind a reverse proxy, rate limits must key on the client's IP rather than the proxy's.
  // Set TRUST_PROXY to the number of proxy hops; leave it unset when clients connect directly.
  const trustedProxyHops = Number(config.get<string>('TRUST_PROXY') ?? 0);
  if (trustedProxyHops > 0) app.set('trust proxy', trustedProxyHops);

  app.use(helmet());
  app.use(cookieParser(config.get<string>('COOKIE_SECRET')));

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useWebSocketAdapter(new CorsIoAdapter(app, corsOrigins));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SitePilot API')
    .setDescription('Construction ERP API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 5174);
  await app.listen(port);

  console.warn(`SitePilot API running on http://localhost:${port}/api`);
}

bootstrap();
