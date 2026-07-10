import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { SeasonService } from './season.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/v1/seasons')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Get()
  async getSeasons() {
    return this.seasonService.getSeasons();
  }

  @Get('active')
  async getActiveSeason() {
    return this.seasonService.getActiveSeason();
  }

  @Get(':id/standings')
  async getSeasonStandings(@Param('id') id: string) {
    return this.seasonService.getSeasonStandings(id);
  }

  @Get(':id/stats')
  async getSeasonStats(@Param('id') id: string) {
    return this.seasonService.getSeasonStats(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('archive')
  async archiveSeason(@Body('name') name: string, @Request() req: any) {
    const username = req.user?.username || 'admin';
    return this.seasonService.archiveAndCreateNewSeason(name, username);
  }
}
