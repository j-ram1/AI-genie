import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { LobbyModule } from '../lobby/lobby.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    LeaderboardModule,
    forwardRef(() => LobbyModule),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
