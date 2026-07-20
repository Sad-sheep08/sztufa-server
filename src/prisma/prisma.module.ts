import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeasonStatisticsService } from './season-statistics.service';
import { LeagueStandingsCalculator } from './league-standings.calculator';
import { CupStandingsCalculator } from './cup-standings.calculator';
import { PlayerStatisticsCalculator } from './player-statistics.calculator';
import { StartupMigrationService } from './startup-migration.service';

@Global()
@Module({
  providers: [
    PrismaService,
    LeagueStandingsCalculator,
    CupStandingsCalculator,
    PlayerStatisticsCalculator,
    SeasonStatisticsService,
    StartupMigrationService,
  ],
  exports: [PrismaService, SeasonStatisticsService],
})
export class PrismaModule {}
