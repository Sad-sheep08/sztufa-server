import { describe, expect, it, jest } from '@jest/globals';
import { MatchService } from './match.service';

describe('MatchService.update', () => {
  const originalMatch = {
    id: 'match-1',
    homeTeamId: 'home-old',
    awayTeamId: 'away-old',
    homeScore: 1,
    awayScore: 0,
    location: 'old-field',
    matchDate: new Date('2026-07-01T10:00:00.000Z'),
    status: 'finished',
    seasonId: 'season-1',
    deletedAt: null,
    homeTeam: { teamName: 'Home' },
    awayTeam: { teamName: 'Away' },
    events: [
      {
        playerId: 'player-old',
        subPlayerId: null,
        assistPlayerId: null,
      },
    ],
  };

  const createService = () => {
    const prisma: any = {
      match: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      team: { findUnique: jest.fn() },
      player: { findMany: jest.fn() },
      matchLineup: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      matchEvent: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      goal: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      computeAndCacheSeasonStats: jest.fn(),
    };
    prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => unknown) => callback(prisma));

    const auditLogService: any = { log: jest.fn() };
    const playerCardSyncService: any = {
      syncMatchPlayers: jest.fn(),
      syncPlayerCards: jest.fn(),
    };

    return {
      service: new MatchService(prisma, auditLogService, playerCardSyncService),
      prisma,
      playerCardSyncService,
    };
  };

  it('preserves events and goals when a partial update omits them', async () => {
    const { service, prisma, playerCardSyncService } = createService();
    const updatedMatch = { ...originalMatch, location: 'new-field' };
    prisma.match.findUnique
      .mockResolvedValueOnce(originalMatch)
      .mockResolvedValueOnce(updatedMatch)
      .mockResolvedValueOnce(updatedMatch);
    prisma.match.update.mockResolvedValue(updatedMatch);

    await service.update('match-1', { location: 'new-field' }, 'admin');

    expect(prisma.matchEvent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.goal.deleteMany).not.toHaveBeenCalled();
    expect(playerCardSyncService.syncMatchPlayers).toHaveBeenCalledWith(
      'match-1',
      'home-old',
      'away-old',
      'finished',
      originalMatch.events,
      prisma,
    );
  });

  it('validates replacement lineups against the new teams', async () => {
    const { service, prisma } = createService();
    const updatedMatch = {
      ...originalMatch,
      homeTeamId: 'home-new',
      awayTeamId: 'away-new',
    };
    prisma.match.findUnique
      .mockResolvedValueOnce(originalMatch)
      .mockResolvedValueOnce(updatedMatch)
      .mockResolvedValueOnce(updatedMatch);
    prisma.match.update.mockResolvedValue(updatedMatch);
    prisma.team.findUnique
      .mockResolvedValueOnce({ id: 'home-new' })
      .mockResolvedValueOnce({ id: 'away-new' });
    prisma.player.findMany.mockResolvedValue([
      { id: 'home-player', name: 'Home player', teamId: 'home-new' },
      { id: 'away-player', name: 'Away player', teamId: 'away-new' },
    ]);

    await service.update(
      'match-1',
      {
        homeTeamId: 'home-new',
        awayTeamId: 'away-new',
        lineups: [
          { playerId: 'home-player', teamType: 'home', lineupType: 'starting' },
          { playerId: 'away-player', teamType: 'away', lineupType: 'starting' },
        ],
      },
      'admin',
    );

    expect(prisma.matchLineup.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ playerId: 'home-player', teamType: 'home' }),
        expect.objectContaining({ playerId: 'away-player', teamType: 'away' }),
      ]),
    });
  });
});
