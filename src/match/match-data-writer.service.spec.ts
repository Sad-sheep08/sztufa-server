import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { MatchDataWriterService } from './match-data-writer.service';

describe('MatchDataWriterService', () => {
  it('deduplicates lineups and validates team ownership', async () => {
    const tx: any = {
      player: {
        findMany: jest.fn<() => Promise<any[]>>().mockResolvedValue([
          { id: 'player-1', name: 'Player', teamId: 'home-team' },
        ]),
      },
      matchLineup: { createMany: jest.fn() },
    };
    const service = new MatchDataWriterService();

    await service.writeLineups(tx, 'match-1', 'home-team', 'away-team', [
      { playerId: 'player-1', teamType: 'home', lineupType: 'starting' },
      { playerId: 'player-1', teamType: 'home', lineupType: 'substitute' },
    ]);

    expect(tx.matchLineup.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ playerId: 'player-1', lineupType: 'substitute' })],
    });
  });

  it('rejects a player assigned to the wrong team', async () => {
    const tx: any = {
      player: {
        findMany: jest.fn<() => Promise<any[]>>().mockResolvedValue([
          { id: 'player-1', name: 'Player', teamId: 'away-team' },
        ]),
      },
      matchLineup: { createMany: jest.fn() },
    };
    const service = new MatchDataWriterService();

    await expect(
      service.writeLineups(tx, 'match-1', 'home-team', 'away-team', [
        { playerId: 'player-1', teamType: 'home', lineupType: 'starting' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prefers event goals and converts own-goal ownership', async () => {
    const tx: any = { goal: { createMany: jest.fn() } };
    const service = new MatchDataWriterService();

    await service.writeGoals(
      tx,
      'match-1',
      [
        {
          eventType: 'own_goal',
          playerName: 'Player',
          teamType: 'home',
          eventTime: '10',
        },
      ],
      [{ playerName: 'Legacy goal' }],
    );

    expect(tx.goal.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ playerName: 'Player (乌龙)', teamType: 'away' })],
    });
  });
});
