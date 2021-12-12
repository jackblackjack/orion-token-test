import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import AddrHistoryEntity from './@common/entities/addr-history.entity';
import AddrEntity from './@common/entities/addr.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceModule } from './binance/binance.module';
import configLoader from './config/load-all';
import { EthModule } from './eth/eth.module';
import * as ormconfig from './ormconfig';

@Module({
  imports: [
    ConfigModule.forRoot({
      encoding: 'utf-8',
      load: configLoader,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(ormconfig),
    TypeOrmModule.forFeature([
      AddrEntity,
      AddrHistoryEntity,
    ]),
    EthModule,
    BinanceModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule {}
