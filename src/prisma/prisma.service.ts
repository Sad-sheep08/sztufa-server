import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.runStartupMigrations();
  }

  async runStartupMigrations() {
    try {
      const rosterCount = await this.seasonTeamPlayer.count();
      if (rosterCount === 0) {
        console.log('[Startup Migration] SeasonTeamPlayer is empty, migrating roster data...');
        // 1. 获取所有赛季和所有球员
        const seasons = await this.season.findMany();
        const allPlayers = await this.player.findMany();

        // 2. 将所有已有球员登记注册进系统中的所有赛季名册中
        // （由于系统之前没有 SeasonTeamPlayer，所有当前活跃的球员在以往赛季也默认在队）
        for (const season of seasons) {
          console.log(`[Startup Migration] Registering players to season: ${season.name}`);
          for (const player of allPlayers) {
            await this.seasonTeamPlayer.upsert({
              where: {
                seasonId_playerId: {
                  seasonId: season.id,
                  playerId: player.id
                }
              },
              create: {
                seasonId: season.id,
                teamId: player.teamId,
                playerId: player.id
              },
              update: {}
            }).catch(err => {
              console.error(`[Startup Migration] Failed to register player ${player.name} to season ${season.name}:`, err.message);
            });
          }
        }
        console.log('[Startup Migration] SeasonTeamPlayer migration completed!');
      }

      // 启动时重算所有赛季的缓存数据以确保缓存为热数据
      console.log('[Startup Migration] Pre-computing standings and stats caches for all seasons...');
      const seasons = await this.season.findMany();
      for (const season of seasons) {
        await this.computeAndCacheSeasonStats(season.id);
      }
      console.log('[Startup Migration] Standings and stats pre-computation completed!');

    } catch (err) {
      console.error('[Startup Migration] Error during startup migration:', err);
    }
  }

  async computeAndCacheSeasonStats(seasonId: string) {
    try {
      // 1. 获取该赛季所有未被删除且已完赛的比赛
      const matches = await this.match.findMany({
        where: {
          seasonId,
          deletedAt: null,
          status: 'finished'
        },
        include: {
          goals: true,
          events: true
        }
      });

      // 2. 动态提取本赛季的球队列表，防止因后续赛季软删除导致历史赛季积分榜显示丢失
      const seasonPlayers = await this.seasonTeamPlayer.findMany({
        where: { seasonId },
        include: { team: true }
      });

      const teamsMap = new Map<string, { id: string; teamName: string; teamLogo: string }>();
      seasonPlayers.forEach(sp => {
        if (sp.team && !teamsMap.has(sp.teamId)) {
          teamsMap.set(sp.teamId, {
            id: sp.teamId,
            teamName: sp.team.teamName,
            teamLogo: sp.team.teamLogo || ''
          });
        }
      });

      // 从比赛里进行补充解析以保全数据
      const allTeams = await this.team.findMany();
      const dbTeamsMap = new Map(allTeams.map(t => [t.id, t]));

      matches.forEach(m => {
        if (!teamsMap.has(m.homeTeamId)) {
          const t = dbTeamsMap.get(m.homeTeamId);
          if (t) {
            teamsMap.set(m.homeTeamId, {
              id: t.id,
              teamName: t.teamName,
              teamLogo: t.teamLogo || ''
            });
          }
        }
        if (!teamsMap.has(m.awayTeamId)) {
          const t = dbTeamsMap.get(m.awayTeamId);
          if (t) {
            teamsMap.set(m.awayTeamId, {
              id: t.id,
              teamName: t.teamName,
              teamLogo: t.teamLogo || ''
            });
          }
        }
      });

      // 初始化积分榜 Map
      const standingsMap = new Map<string, any>();
      teamsMap.forEach(team => {
        standingsMap.set(team.id, {
          teamId: team.id,
          teamName: team.teamName,
          teamLogo: team.teamLogo,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        });
      });

      // 计算积分榜
      matches.forEach(match => {
        const home = standingsMap.get(match.homeTeamId);
        const away = standingsMap.get(match.awayTeamId);
        if (home && away) {
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
      });

      const standings = Array.from(standingsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      // 3. 计算球员数据榜 (进球/助攻/黄红牌)
      const playerScorers = new Map<string, any>();
      const playerAssists = new Map<string, any>();
      const playerCards = new Map<string, any>();

      const players = await this.player.findMany({ include: { team: true } });
      const playersMap = new Map(players.map(p => [p.id, p]));

      const getPlayerTeamInfo = (playerId: string | null, playerName: string, jerseyNumber: string, teamType: string, match: any) => {
        let name = playerName;
        let jersey = jerseyNumber;
        let teamName = '';
        let teamLogo = '';
        
        const p = playerId ? playersMap.get(playerId) : null;
        if (p) {
          name = p.name;
          jersey = p.jerseyNumber;
          teamName = p.team.teamName;
          teamLogo = p.team.teamLogo || '';
        } else {
          const teamId = teamType === 'home' ? match.homeTeamId : match.awayTeamId;
          const t = dbTeamsMap.get(teamId);
          if (t) {
            teamName = t.teamName;
            teamLogo = t.teamLogo || '';
          }
        }
        return { name, jersey, teamName, teamLogo };
      };

      matches.forEach(match => {
        // 进球榜
        match.goals.forEach(goal => {
          let cleanName = goal.playerName;
          if (cleanName.endsWith(' (点球)')) {
            cleanName = cleanName.substring(0, cleanName.length - 5);
          } else if (cleanName.endsWith(' (乌龙)')) {
            return; // 乌龙球不计入个人得分榜
          }

          const key = goal.playerId || `${cleanName}_${goal.jerseyNumber}`;
          const teamInfo = getPlayerTeamInfo(goal.playerId, cleanName, goal.jerseyNumber, goal.teamType, match);
          
          const record = playerScorers.get(key) || {
            playerId: goal.playerId || '',
            playerName: teamInfo.name,
            jerseyNumber: teamInfo.jersey,
            teamName: teamInfo.teamName,
            teamLogo: teamInfo.teamLogo,
            goals: 0
          };
          record.goals += 1;
          playerScorers.set(key, record);
        });

        // 助攻与红黄牌事件
        match.events.forEach(event => {
          const teamInfo = getPlayerTeamInfo(event.playerId, event.playerName || '', event.jerseyNumber || '', event.teamType, match);
          
          if (event.eventType === 'yellow_card' || event.eventType === 'red_card' || event.eventType === 'yellow_to_red') {
            const key = event.playerId || `${teamInfo.name}_${teamInfo.jersey}`;
            const record = playerCards.get(key) || {
              playerId: event.playerId || '',
              playerName: teamInfo.name,
              jerseyNumber: teamInfo.jersey,
              teamName: teamInfo.teamName,
              teamLogo: teamInfo.teamLogo,
              yellowCards: 0,
              redCards: 0
            };
            if (event.eventType === 'yellow_card') record.yellowCards += 1;
            if (event.eventType === 'red_card' || event.eventType === 'yellow_to_red') record.redCards += 1;
            playerCards.set(key, record);
          }

          if (event.assistPlayerName) {
            const assistTeamInfo = getPlayerTeamInfo(event.assistPlayerId, event.assistPlayerName, event.assistJerseyNumber || '', event.teamType, match);
            const key = event.assistPlayerId || `${assistTeamInfo.name}_${assistTeamInfo.jersey}`;
            const record = playerAssists.get(key) || {
              playerId: event.assistPlayerId || '',
              playerName: assistTeamInfo.name,
              jerseyNumber: assistTeamInfo.jersey,
              teamName: assistTeamInfo.teamName,
              teamLogo: assistTeamInfo.teamLogo,
              assists: 0
            };
            record.assists += 1;
            playerAssists.set(key, record);
          }
        });
      });

      const scorers = Array.from(playerScorers.values()).sort((a, b) => b.goals - a.goals);
      const assists = Array.from(playerAssists.values()).sort((a, b) => b.assists - a.assists);
      const cards = Array.from(playerCards.values()).sort((a, b) => {
        if (b.redCards !== a.redCards) return b.redCards - a.redCards;
        return b.yellowCards - a.yellowCards;
      });

      // 4. 更新赛季字段缓存
      await this.season.update({
        where: { id: seasonId },
        data: {
          standingsCache: standings,
          statsCache: { scorers, assists, cards }
        }
      });
      console.log(`[Cache Update] Standings & stats pre-computed successfully for season ${seasonId}`);
    } catch (error) {
      console.error(`[Cache Update] Failed to compute/cache standings for season ${seasonId}:`, error);
    }
  }
}

