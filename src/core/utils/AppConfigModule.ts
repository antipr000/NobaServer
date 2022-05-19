import { ConfigModule } from '@nestjs/config';
import loadAppConfigs from '../../config/AppConfigurations';

export async function getAppConfigModule() { //https://docs.nestjs.com/techniques/configuration
  const appConfigurations = await loadAppConfigs();

  return ConfigModule.forRoot({
    ignoreEnvFile: true, //we don't use .env, .env.local etc. in this project and we rely that props should either come from yaml files or env variables
    load: [() => appConfigurations], //load configurations from yaml files
    isGlobal: true, //marking as global so won't have to import in each module separately
  });


}
