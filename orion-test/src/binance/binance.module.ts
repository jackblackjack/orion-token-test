import { Module } from '@nestjs/common';

import HttpClientModule from '../http-client/http-client.module';
import { BinanceService } from './binance.service';

@Module({
  imports:[HttpClientModule],
  providers: [BinanceService],
  exports: [BinanceService],
})
export class BinanceModule {}
