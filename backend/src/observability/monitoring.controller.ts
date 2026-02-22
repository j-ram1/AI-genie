import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Controller()
export class MonitoringController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('health')
  async health() {
    const startedAt = Date.now();
    let dbStatus: 'up' | 'down' = 'up';

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      dbStatus = 'down';
    }

    const status = dbStatus === 'up' ? 'ok' : 'degraded';
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
      checks: {
        database: dbStatus,
      },
      response_ms: Date.now() - startedAt,
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metricsSnapshot() {
    return this.metrics.renderPrometheusMetrics();
  }
}

