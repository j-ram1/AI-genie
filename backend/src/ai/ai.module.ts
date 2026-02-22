import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AiQuestionService } from './ai.question.service';
import { AiGenieService } from './ai.genie.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [AiQuestionService, AiGenieService],
  exports: [AiQuestionService, AiGenieService],
})
export class AiModule {}
