import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds =
        Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const routePath = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.path;
      this.metrics.observeHttp({
        method: req.method,
        route: routePath || 'unknown',
        status: res.statusCode,
        durationSeconds,
      });
    });

    next();
  }
}

