import { registerAs } from '@nestjs/config';

import { CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS } from '../constants';
import { IInfuraOptions } from '../interfaces/infura-options.interface';

export default registerAs(CONFIG_INFURA_OPTIONS_SERVICE_REGISTER_AS, (): IInfuraOptions => {
  return {
    url: 'https://ropsten.infura.io/v3',
    token: '56c7f9c189cf4e1eb0d450d7523a635a',
    //@see https://ropsten.etherscan.io/address/0x61Eed69c0d112C690fD6f44bB621357B89fBE67F
    startBlockNum: 11250566,
    blocksPerInterval: 50
  }
});


