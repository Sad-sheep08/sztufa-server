import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private static isMigrated = false;

  async onModuleInit() {
    await this.$connect();
    await this.runStartupMigrations();
  }

  async runStartupMigrations() {
    if (PrismaService.isMigrated) {
      return;
    }
    PrismaService.isMigrated = true;

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

      // 3. 检查 News 是否为空，并注入种子新闻
      const newsCount = await this.news.count();
      if (newsCount === 0) {
        console.log('[Startup Migration] News table is empty, seeding initial WeChat news articles...');
        await this.news.createMany({
          data: [
            {
              title: '【赛事预热】第八届“校长杯”总决赛即将开战！',
              category: '赛事',
              description: '巅峰对决即将上演！两支老牌冠军队伍强势突围，成功会师总决赛，开启终极冠军争夺战！让我们共同期待这场年度足球盛宴！',
              coverImage: '/activity1.jpg',
              wechatUrl: 'https://mp.weixin.qq.com/s?__biz=MzkxMzIzOTQ4MA==&mid=2247489893&idx=1&sn=4abc5e36f42f1ec8ce5ae88e6b9cfa13&chksm=c0b8fb11c918d5815c11852db750948d93c9044c5b3a33c2b02e75b8e482a6b0a4109bac29f7&sessionid=1784201826&scene=126&clicktime=1784201838&enterid=1784201838&subscene=10000&ascene=3&fasttmpl_type=4&fasttmpl_fullversion=8348083-zh_CN-zip&fasttmpl_flag=0&realreporttime=1784201838994&devicetype=android-36&version=28004c31&nettype=WIFI&lang=zh_CN&session_us=gh_8d0a6966201e&countrycode=CN&exportkey=n_ChQIAhIQaZf9AK3uKC%2B6ca442OH%2B%2FRLxAQIE97dBBAEAAAAAAIeXIIhYkQsAAAAOpnltbLcz9gKNyK89dVj0qGV71Izvj%2Bm8fFAmu2sTc%2Ffr6pEYdr5qrhSvqjEb4XpSc481MGbhgQEFJIV5a6oPc1BVZjgSiLk5CBmVxfkFdpr8bLdpQiOrvPcwAkZGomQ2aGzGoOl%2BjCfVND775OLK%2BSiVE7uo4t%2FrNLfVLr9Xda%2B98gv4fvQ8Vr50lhvgUWYCgl6z6o9Nd8KC3p06u8FfCjXfI7ePmrpTHnPjGkAmSlmcdjS19wGf0OtrXObsbPNHx%2BDaZ4fJNKfvGnWGF%2F8Py8osdKl9fsUJizY%3D&pass_ticket=InieAWhw8D6e0PpRRWN3qVT9VLS%2BsZs1b%2FS%2BZPiNdV2%2BIG%2BoRxAtAC29k36IXtQg&wx_header=3',
              date: '2026-06-17',
              content: '',
            },
            {
              title: '【喜报】我校女子足球队省赛创历史最佳战绩！',
              category: '赛事',
              description: '在2025年广东省青少年校园足球联赛（大学组）中，我校女子足球队奋勇拼搏，首次闯进八强，最终荣获赛事一等奖，创造了自建队以来的历史最佳战绩！',
              coverImage: '/activity2.jpg',
              wechatUrl: 'https://mp.weixin.qq.com/s/PXl0z-m0Kkoc1aN8kWsPtA',
              date: '2025-12-20',
              content: '',
            }
          ]
        });
        console.log('[Startup Migration] Seeding WeChat news completed!');
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
      const season = await this.season.findUnique({
        where: { id: seasonId }
      });
      if (!season) return;
      const seasonType = season.type || 'LEAGUE';

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

      let standings: any = [];

      if (seasonType === 'CUP') {
        // 3.1 杯赛模式：分小组计算积分榜
        const groupTeams = await this.seasonGroupTeam.findMany({
          where: { seasonId },
          include: { team: true }
        });

        const groupsMap = new Map<string, Map<string, any>>();

        // 按照 groupTeams 分组注册球队
        groupTeams.forEach(gt => {
          if (!groupsMap.has(gt.groupName)) {
            groupsMap.set(gt.groupName, new Map<string, any>());
          }
          const groupStandings = groupsMap.get(gt.groupName)!;
          groupStandings.set(gt.teamId, {
            teamId: gt.teamId,
            teamName: gt.team.teamName,
            teamLogo: gt.team.teamLogo || '',
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

        // 筛选小组赛阶段且完赛的比赛进行计算
        const groupMatches = matches.filter(m => m.stage === 'GROUP');
        groupMatches.forEach(match => {
          const gName = match.groupName || 'A';
          if (!groupsMap.has(gName)) {
            groupsMap.set(gName, new Map<string, any>());
          }
          const groupStandings = groupsMap.get(gName)!;

          const ensureTeamInGroup = (teamId: string) => {
            if (!groupStandings.has(teamId)) {
              const teamInfo = dbTeamsMap.get(teamId);
              groupStandings.set(teamId, {
                teamId: teamId,
                teamName: teamInfo?.teamName || '未知球队',
                teamLogo: teamInfo?.teamLogo || '',
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0
              });
            }
          };

          ensureTeamInGroup(match.homeTeamId);
          ensureTeamInGroup(match.awayTeamId);

          const home = groupStandings.get(match.homeTeamId);
          const away = groupStandings.get(match.awayTeamId);

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

        const groupsStandings: Record<string, any[]> = {};
        groupsMap.forEach((standingMap, gName) => {
          groupsStandings[gName] = Array.from(standingMap.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });
        });

        standings = {
          type: 'CUP',
          groups: groupsStandings
        };

      } else {
        // 3.2 联赛模式：原有的单积分榜逻辑
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

        // 筛选联赛阶段的比赛
        const leagueMatches = matches.filter(m => m.stage === 'LEAGUE' || !m.stage);
        leagueMatches.forEach(match => {
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

        standings = Array.from(standingsMap.values()).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
      }

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

