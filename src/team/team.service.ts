import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    return this.prisma.team.create({
      data: createTeamDto,
      include: { players: { where: { deletedAt: null } } },
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        skip,
        take: limitNum,
        where: { deletedAt: null },
        include: { players: { where: { deletedAt: null } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.team.count({ where: { deletedAt: null } }),
    ]);
    return { data, total, page: pageNum, limit: limitNum };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { players: { where: { deletedAt: null } } },
    });
    if (!team || team.deletedAt !== null) {
      throw new NotFoundException('球队不存在');
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team || team.deletedAt !== null) {
      throw new NotFoundException('球队不存在');
    }
    return this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
      include: { players: { where: { deletedAt: null } } },
    });
  }

  async remove(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team || team.deletedAt !== null) {
      throw new NotFoundException('球队不存在');
    }
    
    const timestamp = Date.now();

    // 1. 级联软删除该球队名下的所有在队球员，并安全释放其学号唯一键约束以防冲突
    const teamPlayers = await this.prisma.player.findMany({
      where: { teamId: id, deletedAt: null }
    });

    for (const player of teamPlayers) {
      await this.prisma.player.update({
        where: { id: player.id },
        data: {
          deletedAt: new Date(),
          studentId: `${player.studentId}_deleted_${timestamp}`
        }
      });
    }

    // 2. 软删除该球队并释放唯一队名约束
    return this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        teamName: `${team.teamName}_deleted_${timestamp}`
      }
    });
  }

  async searchByName(name: string) {
    return this.prisma.team.findMany({
      where: { teamName: { contains: name }, deletedAt: null },
      include: { players: { where: { deletedAt: null } } },
    });
  }

  async getTeamRoster(teamId: string, seasonId?: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId }
    });
    if (!team || team.deletedAt !== null) {
      throw new NotFoundException('球队不存在');
    }

    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await this.prisma.season.findFirst({
        where: { status: 'active' }
      });
      if (!activeSeason) {
        throw new NotFoundException('当前无活跃赛季');
      }
      targetSeasonId = activeSeason.id;
    }

    const rosterRecords = await this.prisma.seasonTeamPlayer.findMany({
      where: {
        seasonId: targetSeasonId,
        teamId: teamId,
        player: {
          deletedAt: null
        }
      },
      include: {
        player: true
      }
    });

    return rosterRecords
      .map(r => r.player)
      .sort((a, b) => {
        const numA = parseInt(a.jerseyNumber, 10) || 999;
        const numB = parseInt(b.jerseyNumber, 10) || 999;
        return numA - numB;
      });
  }
}
