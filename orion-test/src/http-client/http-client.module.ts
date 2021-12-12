import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { HttpClientService } from './http-client.service';

@Module({
  imports: [HttpModule],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export default class HttpClientModule {}
