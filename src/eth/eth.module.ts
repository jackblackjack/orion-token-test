import { Module } from '@nestjs/common';

import { EthService } from './eth.service';
import Web3Provider from './web3.provider';

@Module({
  providers: [
    EthService,
    Web3Provider,
  ],
  exports: [EthService, Web3Provider]
})
export class EthModule {}
