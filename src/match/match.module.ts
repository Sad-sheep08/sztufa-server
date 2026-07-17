import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { PlayerCardSyncService } from './player-card-sync.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MatchController],
  providers: [MatchService, PlayerCardSyncService, PrismaService],
  exports: [PlayerCardSyncService],
})
export class MatchModule {}
