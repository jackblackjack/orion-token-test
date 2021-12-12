import { default as Web3 } from 'web3';

import { ConfigService } from '@nestjs/config';

import { CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS, WEB3_PROVIDER_ID } from '../config/constants';
import { IInfuraOptions } from '../config/interfaces/infura-options.interface';

export default {
  provide: WEB3_PROVIDER_ID,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const infuraOptions = configService.get<IInfuraOptions>(CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS);
    return new Web3(
      new Web3.providers.HttpProvider(
        `${infuraOptions?.url}/${infuraOptions?.token}`
      )
    );
  }
}
