import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/players')
@ApiTags('球员')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: '创建球员' })
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playerService.create(createPlayerDto);
  }

  @Get()
  @ApiOperation({ summary: '获取球员列表' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('teamId') teamId?: string,
  ) {
    return this.playerService.findAll(teamId, page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: '按名称搜索球员' })
  search(@Query('name') name: string) {
    return this.playerService.searchByName(name);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个球员' })
  findOne(@Param('id') id: string) {
    return this.playerService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: '更新球员信息' })
  update(@Param('id') id: string, @Body() updatePlayerDto: UpdatePlayerDto) {
    return this.playerService.update(id, updatePlayerDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: '删除球员' })
  remove(@Param('id') id: string) {
    return this.playerService.remove(id);
  }
}
