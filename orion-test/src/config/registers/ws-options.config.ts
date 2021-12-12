import { registerAs } from '@nestjs/config';

import { CONFIG_WS_OPTIONS_REGISTER_AS } from '../constants';
import { IWsOptions } from '../interfaces/ws-options.interface';

export default registerAs(CONFIG_WS_OPTIONS_REGISTER_AS, (): IWsOptions => {
  return {
    connectionTimeout: (1000 * 60),
    maxRetries: 20,
    debug: false,
  };
});
