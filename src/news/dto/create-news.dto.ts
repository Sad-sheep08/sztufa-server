import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateNewsDto {
  @ApiProperty({ description: '新闻标题', example: '比赛预热' })
  @IsString()
  title: string;

  @ApiProperty({ description: '新闻简介', example: '绿茵争霸，燃爆夏日！' })
  @IsString()
  description: string;

  @ApiProperty({ description: '分类', example: '赛事' })
  @IsString()
  category: string;

  @ApiProperty({ description: '封面图 URL', required: false })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ description: '微信链接', example: 'https://mp.weixin.qq.com/...' })
  @IsString()
  wechatUrl: string;

  @ApiProperty({ description: '日期', example: '2026-07-16' })
  @IsString()
  date: string;
}
