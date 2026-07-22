import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { isTeamGenderCompatibleWithSeason } from '../common/season-gender';

interface PlayerData {
  name: string;
  studentId: string;
  jerseyNumber: string;
  photo: string | null;
  id: string;
}

interface TeamData {
  id: string;
  teamName: string;
  teamDoctor: string;
  headCoach: string;
  teamLeader: string;
  coachPhone: string;
  leaderPhone: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  teamLogo: string;
  homeJersey: string;
  awayJersey: string;
  gender?: 'MALE' | 'FEMALE';
  players: PlayerData[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ item: string; reason: string }>;
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  async importFromJson(filePath: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const absolutePath = path.resolve(filePath);
      const data = fs.readFileSync(absolutePath, 'utf-8');
      const teamData: TeamData = JSON.parse(data);

      await this.prisma.$transaction(async (tx) => {
        const existingTeam = await tx.team.findUnique({
          where: { teamName: teamData.teamName },
        });

        let teamId: string;

        if (existingTeam) {
          const updatedTeam = await tx.team.update({
            where: { id: existingTeam.id },
            data: {
              teamDoctor: teamData.teamDoctor,
              headCoach: teamData.headCoach,
              teamLeader: teamData.teamLeader,
              coachPhone: teamData.coachPhone,
              leaderPhone: teamData.leaderPhone,
              homeJerseyColor: teamData.homeJerseyColor,
              awayJerseyColor: teamData.awayJerseyColor,
              teamLogo: teamData.teamLogo,
              homeJersey: teamData.homeJersey,
              awayJersey: teamData.awayJersey,
              gender: teamData.gender || existingTeam.gender,
            },
          });
          teamId = updatedTeam.id;
          result.success++;
        } else {
          const newTeam = await tx.team.create({
            data: {
              id: teamData.id,
              teamName: teamData.teamName,
              teamDoctor: teamData.teamDoctor,
              headCoach: teamData.headCoach,
              teamLeader: teamData.teamLeader,
              coachPhone: teamData.coachPhone,
              leaderPhone: teamData.leaderPhone,
              homeJerseyColor: teamData.homeJerseyColor,
              awayJerseyColor: teamData.awayJerseyColor,
              teamLogo: teamData.teamLogo,
              homeJersey: teamData.homeJersey,
              awayJersey: teamData.awayJersey,
              gender: teamData.gender || 'MALE',
            },
          });
          teamId = newTeam.id;
          result.success++;
        }

        const activeSeasons = await tx.season.findMany({
          where: { status: 'active' },
        });

        const team = await tx.team.findUniqueOrThrow({
          where: { id: teamId },
          select: { gender: true },
        });

        for (const player of teamData.players) {
          try {
            const existingPlayer = await tx.player.findUnique({
              where: { studentId: player.studentId },
            });

            let finalPlayerId: string;

            if (existingPlayer) {
              const updated = await tx.player.update({
                where: { id: existingPlayer.id },
                data: {
                  name: player.name,
                  jerseyNumber: player.jerseyNumber,
                  photo: player.photo,
                  teamId,
                  deletedAt: null, // 如果之前被软删除了，导入时恢复
                },
              });
              finalPlayerId = updated.id;
            } else {
              const created = await tx.player.create({
                data: {
                  id: player.id,
                  name: player.name,
                  studentId: player.studentId,
                  jerseyNumber: player.jerseyNumber,
                  photo: player.photo,
                  teamId,
                },
              });
              finalPlayerId = created.id;
            }

            // 同步绑定到当前活跃赛季的名册表
            for (const activeSeason of activeSeasons) {
              if (!isTeamGenderCompatibleWithSeason(activeSeason.name, team.gender)) {
                await tx.seasonTeamPlayer.deleteMany({
                  where: { seasonId: activeSeason.id, playerId: finalPlayerId },
                });
                continue;
              }
              await tx.seasonTeamPlayer.upsert({
                where: {
                  seasonId_playerId: {
                    seasonId: activeSeason.id,
                    playerId: finalPlayerId,
                  },
                },
                create: {
                  seasonId: activeSeason.id,
                  teamId,
                  playerId: finalPlayerId,
                },
                update: {
                  teamId,
                },
              });
            }

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              item: `球员 ${player.name} (${player.studentId})`,
              reason: error.message,
            });
          }
        }
      });
    } catch (error) {
      result.failed++;
      result.errors.push({
        item: '文件导入',
        reason: error.message,
      });
    }

    return result;
  }
}
