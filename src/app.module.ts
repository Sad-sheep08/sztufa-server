import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { PlayerModule } from './player/player.module';
import { MatchModule } from './match/match.module';
import { ImportModule } from './import/import.module';
import { UploadModule } from './upload/upload.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TeamModule,
    PlayerModule,
    MatchModule,
    ImportModule,
    UploadModule,
    AuditLogModule,
    BackupModule,
  ],
})
export class AppModule {}
