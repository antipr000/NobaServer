import { ConfigModule } from '@nestjs/config';
import loadAppConfigs from '../../config/AppConfigurations';

export function getAppConfigModule() { //https://docs.nestjs.com/techniques/configuration
  return ConfigModule.forRoot({
    ignoreEnvFile: true, //we don't use .env, .env.local etc. in this project and we rely that props should either come from yaml files or env variables
    load: [loadAppConfigs], //load configurations from yaml files
    isGlobal: true, //marking as global so won't have to import in each module separately
  });
}
