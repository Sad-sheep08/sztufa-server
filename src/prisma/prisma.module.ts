import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeasonStatisticsService } from './season-statistics.service';
import { StartupMigrationService } from './startup-migration.service';

@Global()
@Module({
  providers: [PrismaService, SeasonStatisticsService, StartupMigrationService],
  exports: [PrismaService, SeasonStatisticsService],
})
export class PrismaModule {}
