import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AuthModule } from './auth/auth.module';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';
import { ObservabilityModule } from './observability/observability.module';
import { pinoLoggerConfig } from './observability/pino-logger.config';
import { RequestIdMiddleware } from './observability/request-id.middleware';
import { MetricsMiddleware } from './observability/metrics.middleware';

@Module({
  imports: [
    LeaderboardModule,
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(pinoLoggerConfig),
    ObservabilityModule,
    PrismaModule,
    AuthModule,
    LobbyModule,
    GameModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, MetricsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
