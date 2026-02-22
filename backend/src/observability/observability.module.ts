import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}

