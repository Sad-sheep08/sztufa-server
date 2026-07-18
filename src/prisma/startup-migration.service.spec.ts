import { describe, expect, it, jest } from '@jest/globals';
import { StartupMigrationService } from './startup-migration.service';

describe('StartupMigrationService', () => {
  it('已有名单和新闻时只预计算全部赛季缓存', async () => {
    const rosterCount: any = jest.fn();
    const newsCount: any = jest.fn();
    const findSeasons: any = jest.fn();
    const computeAndCache: any = jest.fn();
    rosterCount.mockResolvedValue(1);
    newsCount.mockResolvedValue(1);
    findSeasons.mockResolvedValue([{ id: 'season-1' }, { id: 'season-2' }]);
    computeAndCache.mockResolvedValue(undefined);
    const prisma: any = {
      seasonTeamPlayer: { count: rosterCount },
      news: { count: newsCount },
      season: { findMany: findSeasons },
    };
    const seasonStatistics: any = { computeAndCache };

    await new StartupMigrationService(prisma, seasonStatistics).run();

    expect(seasonStatistics.computeAndCache).toHaveBeenNthCalledWith(1, 'season-1');
    expect(seasonStatistics.computeAndCache).toHaveBeenNthCalledWith(2, 'season-2');
  });
});
