import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeasonStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeAndCache(seasonId: string) {
    try {
      const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) return;

      const seasonType = season.type || 'LEAGUE';
      const seasonGender = season.name.includes('女') || season.name.includes('女子')
        ? 'FEMALE'
        : 'MALE';

      const matches = await this.prisma.match.findMany({
        where: { seasonId, deletedAt: null, status: 'finished' },
        include: { goals: true, events: true },
      });

      const seasonPlayers = await this.prisma.seasonTeamPlayer.findMany({
        where: { seasonId },
        include: { team: true },
      });

      const teamsMap = new Map<string, { id: string; teamName: string; teamLogo: string }>();
      seasonPlayers.forEach(seasonPlayer => {
        if (
          seasonPlayer.team
          && !teamsMap.has(seasonPlayer.teamId)
          && seasonPlayer.team.gender === seasonGender
        ) {
          teamsMap.set(seasonPlayer.teamId, {
            id: seasonPlayer.teamId,
            teamName: seasonPlayer.team.teamName,
            teamLogo: seasonPlayer.team.teamLogo || '',
          });
        }
      });

      const allTeams = await this.prisma.team.findMany();
      const databaseTeams = new Map(allTeams.map(team => [team.id, team]));

      matches.forEach(match => {
        const addTeamIfValid = (teamId: string) => {
          if (teamsMap.has(teamId)) return;
          const team = databaseTeams.get(teamId);
          if (team && team.gender === seasonGender) {
            teamsMap.set(teamId, {
              id: team.id,
              teamName: team.teamName,
              teamLogo: team.teamLogo || '',
            });
          }
        };
        addTeamIfValid(match.homeTeamId);
        addTeamIfValid(match.awayTeamId);
      });

      const standings = seasonType === 'CUP'
        ? await this.calculateCupStandings(seasonId, seasonGender, matches, databaseTeams)
        : this.calculateLeagueStandings(matches, teamsMap);
      const stats = await this.calculatePlayerStats(matches, databaseTeams);

      await this.prisma.season.update({
        where: { id: seasonId },
        data: { standingsCache: standings, statsCache: stats },
      });
      console.log(`[Cache Update] Standings & stats pre-computed successfully for season ${seasonId}`);
    } catch (error) {
      console.error(`[Cache Update] Failed to compute/cache standings for season ${seasonId}:`, error);
    }
  }

  private calculateLeagueStandings(matches: any[], teams: Map<string, any>) {
    const standings = new Map<string, any>();
    teams.forEach(team => {
      standings.set(team.id, this.createStanding(team.id, team.teamName, team.teamLogo));
    });

    matches
      .filter(match => match.stage === 'LEAGUE' || !match.stage)
      .forEach(match => this.applyMatchResult(
        standings.get(match.homeTeamId),
        standings.get(match.awayTeamId),
        match,
      ));

    return Array.from(standings.values()).sort(this.compareStandings);
  }

  private async calculateCupStandings(
    seasonId: string,
    seasonGender: string,
    matches: any[],
    databaseTeams: Map<string, any>,
  ) {
    const groupTeams = await this.prisma.seasonGroupTeam.findMany({
      where: { seasonId },
      include: { team: true },
    });
    const groups = new Map<string, Map<string, any>>();

    groupTeams.forEach(groupTeam => {
      if (!groupTeam.team || groupTeam.team.gender !== seasonGender) return;
      if (!groups.has(groupTeam.groupName)) groups.set(groupTeam.groupName, new Map());
      groups.get(groupTeam.groupName)!.set(
        groupTeam.teamId,
        this.createStanding(
          groupTeam.teamId,
          groupTeam.team.teamName,
          groupTeam.team.teamLogo || '',
        ),
      );
    });

    matches.filter(match => match.stage === 'GROUP').forEach(match => {
      const groupName = match.groupName || 'A';
      if (!groups.has(groupName)) groups.set(groupName, new Map());
      const groupStandings = groups.get(groupName)!;

      const ensureTeam = (teamId: string) => {
        if (groupStandings.has(teamId)) return;
        const team = databaseTeams.get(teamId);
        if (!team || team.gender !== seasonGender) return;
        groupStandings.set(
          teamId,
          this.createStanding(teamId, team.teamName || '未知球队', team.teamLogo || ''),
        );
      };
      ensureTeam(match.homeTeamId);
      ensureTeam(match.awayTeamId);
      this.applyMatchResult(
        groupStandings.get(match.homeTeamId),
        groupStandings.get(match.awayTeamId),
        match,
      );
    });

    const groupResults: Record<string, any[]> = {};
    groups.forEach((groupStandings, groupName) => {
      groupResults[groupName] = Array.from(groupStandings.values()).sort(this.compareStandings);
    });
    return { type: 'CUP', groups: groupResults };
  }

  private async calculatePlayerStats(matches: any[], databaseTeams: Map<string, any>) {
    const scorers = new Map<string, any>();
    const assists = new Map<string, any>();
    const cards = new Map<string, any>();
    const players = await this.prisma.player.findMany({ include: { team: true } });
    const playersMap = new Map(players.map(player => [player.id, player]));

    const getPlayerTeamInfo = (
      playerId: string | null,
      playerName: string,
      jerseyNumber: string,
      teamType: string,
      match: any,
    ) => {
      const player = playerId ? playersMap.get(playerId) : null;
      if (player) {
        return {
          name: player.name,
          jersey: player.jerseyNumber,
          teamName: player.team.teamName,
          teamLogo: player.team.teamLogo || '',
        };
      }
      const teamId = teamType === 'home' ? match.homeTeamId : match.awayTeamId;
      const team = databaseTeams.get(teamId);
      return {
        name: playerName,
        jersey: jerseyNumber,
        teamName: team?.teamName || '',
        teamLogo: team?.teamLogo || '',
      };
    };

    matches.forEach(match => {
      match.goals.forEach(goal => {
        let cleanName = goal.playerName;
        if (cleanName.endsWith(' (点球)')) {
          cleanName = cleanName.substring(0, cleanName.length - 5);
        } else if (cleanName.endsWith(' (乌龙)')) {
          return;
        }

        const key = goal.playerId || `${cleanName}_${goal.jerseyNumber}`;
        const teamInfo = getPlayerTeamInfo(
          goal.playerId,
          cleanName,
          goal.jerseyNumber,
          goal.teamType,
          match,
        );
        const record = scorers.get(key) || {
          playerId: goal.playerId || '',
          playerName: teamInfo.name,
          jerseyNumber: teamInfo.jersey,
          teamName: teamInfo.teamName,
          teamLogo: teamInfo.teamLogo,
          goals: 0,
        };
        record.goals += 1;
        scorers.set(key, record);
      });

      match.events.forEach(event => {
        const teamInfo = getPlayerTeamInfo(
          event.playerId,
          event.playerName || '',
          event.jerseyNumber || '',
          event.teamType,
          match,
        );

        if (['yellow_card', 'red_card', 'yellow_to_red'].includes(event.eventType)) {
          const key = event.playerId || `${teamInfo.name}_${teamInfo.jersey}`;
          const record = cards.get(key) || {
            playerId: event.playerId || '',
            playerName: teamInfo.name,
            jerseyNumber: teamInfo.jersey,
            teamName: teamInfo.teamName,
            teamLogo: teamInfo.teamLogo,
            yellowCards: 0,
            redCards: 0,
          };
          if (event.eventType === 'yellow_card') record.yellowCards += 1;
          if (event.eventType === 'red_card' || event.eventType === 'yellow_to_red') {
            record.redCards += 1;
          }
          cards.set(key, record);
        }

        if (event.assistPlayerName) {
          const assistTeamInfo = getPlayerTeamInfo(
            event.assistPlayerId,
            event.assistPlayerName,
            event.assistJerseyNumber || '',
            event.teamType,
            match,
          );
          const key = event.assistPlayerId || `${assistTeamInfo.name}_${assistTeamInfo.jersey}`;
          const record = assists.get(key) || {
            playerId: event.assistPlayerId || '',
            playerName: assistTeamInfo.name,
            jerseyNumber: assistTeamInfo.jersey,
            teamName: assistTeamInfo.teamName,
            teamLogo: assistTeamInfo.teamLogo,
            assists: 0,
          };
          record.assists += 1;
          assists.set(key, record);
        }
      });
    });

    return {
      scorers: Array.from(scorers.values()).sort((a, b) => b.goals - a.goals),
      assists: Array.from(assists.values()).sort((a, b) => b.assists - a.assists),
      cards: Array.from(cards.values()).sort((a, b) => {
        if (b.redCards !== a.redCards) return b.redCards - a.redCards;
        return b.yellowCards - a.yellowCards;
      }),
    };
  }

  private createStanding(teamId: string, teamName: string, teamLogo: string) {
    return {
      teamId,
      teamName,
      teamLogo,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  }

  private applyMatchResult(home: any, away: any, match: any) {
    if (!home || !away) return;
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  private compareStandings(a: any, b: any) {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  }
}
