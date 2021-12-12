import { registerAs } from '@nestjs/config';

import { CONFIG_BINANCE_OPTIONS_SERVICE_REGISTER_AS } from '../constants';
import { IBinanceOptions } from '../interfaces/binance-options.interface';

export default registerAs(CONFIG_BINANCE_OPTIONS_SERVICE_REGISTER_AS, (): IBinanceOptions => {
  return {
    httpBaseUrl: 'https://api.binance.com/api/v3',
    wssBaseUrl: 'wss://stream.binance.com:9443/ws',
  }
});
