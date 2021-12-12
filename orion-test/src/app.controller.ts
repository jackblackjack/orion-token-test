import { Body, Controller, Get, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AddAddrDto } from './@common/dto/add-addr.dto';
import { GetBalanceDto } from './@common/dto/get-balance.dto';
import AddrHistoryEntity from './@common/entities/addr-history.entity';
import AddrEntity from './@common/entities/addr.entity';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    ) {}

  @Post('add')
  @ApiBearerAuth()
  @UseGuards()
  @ApiBearerAuth('JWT-auth')
  async addAddr(@Body(new ValidationPipe()) addrDto: AddAddrDto): Promise<AddrEntity> {
    try {
      return this.appService.addAddr(addrDto);
    } catch(error) {
      throw error;
    }
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards()
  @ApiBearerAuth('JWT-auth')
  async getStats(@Query(new ValidationPipe({ transform: true })) query: GetBalanceDto): Promise<AddrHistoryEntity[]> {
    try {
      return this.appService.getStats(query);
    } catch(error) {
      throw error;
    }
  }
}
