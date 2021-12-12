import { registerAs } from '@nestjs/config';

import { CONFIG_ENV_OPTIONS_REGISTER_AS } from '../constants';
import { IEnvOptions } from '../interfaces/env-options.interface';

export default registerAs(CONFIG_ENV_OPTIONS_REGISTER_AS, (): IEnvOptions => {
  return {
    port: 3000,
    timeZone: 'UTC'
  };
});
