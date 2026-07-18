import { Module } from '@nestjs/common';
import { SeasonService } from './season.service';
import { SeasonController } from './season.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [SeasonService],
  controllers: [SeasonController],
  exports: [SeasonService],
})
export class SeasonModule {}
