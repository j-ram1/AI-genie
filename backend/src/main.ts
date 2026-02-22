import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';

type RateBucket = { count: number; resetAt: number };

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Genie API')
    .setDescription('API documentation for AI Genie backend services')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api-docs/openapi.json',
  });

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients and same-origin calls without Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'), false);
    },
  });

  const bodyLimit = process.env.REQUEST_BODY_LIMIT ?? '100kb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
  });

  const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const maxRequests = parsePositiveInt(process.env.RATE_LIMIT_MAX, 120);
  const rateBuckets = new Map<string, RateBucket>();

  app.use((req, res, next) => {
    const now = Date.now();
    const ipKey = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = rateBuckets.get(ipKey);

    if (!bucket || now >= bucket.resetAt) {
      rateBuckets.set(ipKey, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
      rateBuckets.set(ipKey, bucket);
    }

    const active = rateBuckets.get(ipKey)!;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, maxRequests - active.count)),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.floor(active.resetAt / 1000)),
    );

    if (active.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((active.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests, please try again later.',
      });
    }

    // Opportunistic cleanup keeps map bounded without timers.
    if (Math.random() < 0.01) {
      for (const [key, value] of rateBuckets.entries()) {
        if (now >= value.resetAt) rateBuckets.delete(key);
      }
    }

    return next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap(); // NOSONAR
