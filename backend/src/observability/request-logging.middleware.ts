import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: RequestWithId, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const { method } = req;
    const path = req.originalUrl ?? req.url;
    const requestId = req.requestId ?? 'unknown';

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const routePath = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : path;

      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          request_id: requestId,
          method,
          path,
          route: routePath,
          status_code: res.statusCode,
          duration_ms: Math.round(durationMs * 100) / 100,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    next();
  }
}

