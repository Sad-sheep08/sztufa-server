import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsDateString, IsArray, ValidateNested, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMatchDto {
  @ApiProperty({ description: '主队ID' })
  @IsString()
  homeTeamId: string;

  @ApiProperty({ description: '客队ID' })
  @IsString()
  awayTeamId: string;

  @ApiProperty({ description: '主队比分', example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(0, { message: '主队比分不能为负数' })
  homeScore?: number;

  @ApiProperty({ description: '客队比分', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0, { message: '客队比分不能为负数' })
  awayScore?: number;

  @ApiProperty({ description: '比赛日期时间', example: '2024-01-15T14:00:00' })
  @IsDateString()
  matchDate: string;

  @ApiProperty({ description: '比赛地点', example: '学校足球场' })
  @IsString()
  location: string;

  @ApiProperty({ description: '比赛状态', example: 'scheduled', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '进球列表', required: false })
  @IsOptional()
  goals?: any[];

  @ApiProperty({ description: '事件列表', required: false })
  @IsOptional()
  events?: any[];

  @ApiProperty({ description: '全场最佳球员ID', required: false })
  @IsOptional()
  @IsString()
  mvpPlayerId?: string;

  @ApiProperty({ description: '全场最佳球员姓名', required: false })
  @IsOptional()
  @IsString()
  mvpPlayerName?: string;

  @ApiProperty({ description: '赛季ID', required: false })
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiProperty({ description: '比赛阶段', example: 'LEAGUE', required: false })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiProperty({ description: '小组名称', example: 'A', required: false })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiProperty({ description: '淘汰赛轮次', example: 'R16', required: false })
  @IsOptional()
  @IsString()
  knockoutRound?: string;

  @ApiProperty({ description: '淘汰赛序号', example: 1, required: false })
  @IsOptional()
  @IsInt()
  knockoutMatchIndex?: number;

  @ApiProperty({ description: '比赛阵容列表', required: false, type: 'array' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchLineupDto)
  lineups?: MatchLineupDto[];
}

export class MatchLineupDto {
  @ApiProperty({ description: '球员ID' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: '归属方', example: 'home' })
  @IsString()
  @IsIn(['home', 'away'])
  teamType: 'home' | 'away';

  @ApiProperty({ description: '阵容类型', example: 'starting' })
  @IsString()
  @IsIn(['starting', 'substitute'])
  lineupType: 'starting' | 'substitute';
}
