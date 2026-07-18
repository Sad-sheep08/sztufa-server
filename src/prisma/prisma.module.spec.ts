import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from '@jest/globals';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';
import { SeasonStatisticsService } from './season-statistics.service';

@Injectable()
class PrismaConsumer {
  constructor(
    readonly prisma: PrismaService,
    readonly seasonStatistics: SeasonStatisticsService,
  ) {}
}

@Module({
  imports: [PrismaModule],
  providers: [PrismaConsumer],
})
class ConsumerModule {}

describe('PrismaModule', () => {
  it('向业务模块统一提供数据库客户端和赛季统计服务', async () => {
    const prisma = {};
    const moduleRef = await Test.createTestingModule({ imports: [ConsumerModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    const consumer = moduleRef.get(PrismaConsumer);
    expect(consumer.prisma).toBe(prisma);
    expect(consumer.seasonStatistics).toBeInstanceOf(SeasonStatisticsService);
    await moduleRef.close();
  });
});
