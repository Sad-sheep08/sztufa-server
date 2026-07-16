import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [NewsController],
  providers: [NewsService, PrismaService],
  exports: [NewsService],
})
export class NewsModule {}
