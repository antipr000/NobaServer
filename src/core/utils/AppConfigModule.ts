import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigModuleOptions, ConfigService } from "@nestjs/config";
import loadAppConfigs from "../../config/AppConfigurations";

// https://docs.nestjs.com/techniques/configuration

export async function getAppConfigModule() {
  const configModuleOptions = async (): Promise<ConfigModuleOptions> => {
    console.log('Loading all the configs .... configModuleOptions is executed ...');
    const configs = await loadAppConfigs();
    console.log('LOADED all the configs .... configModuleOptions is executed ...');
    return {
      /**
       * ".env", ".env.local" is not used in this project.
       * All th configurations comes from YAML files or ENV variables.
       */
      ignoreEnvFile: true,

      // load configurations from yaml files
      load: [() => configs],

      // Marking as global avoid to import the Configs in each module separately
      isGlobal: true,
    }
  };

  return ConfigModule.forRoot(await configModuleOptions());
}


export class CustomConfigService extends ConfigService {
  constructor(configs) {
    super(configs)
  }
}

const getConfigService = async () => {
  console.log('Loading all the configs ...');
  const configs = await loadAppConfigs();
  console.log('LOADED all the configs!');
  return new CustomConfigService(configs);
}

@Global()
@Module({
  controllers: [],
  providers: [
    {
      provide: CustomConfigService,
      useFactory: getConfigService
    }
  ],
  exports: [CustomConfigService]
})
export class CustomConfigModule { }


@Module({})
export class DynamicCustomConfigModule {
  static async registerAsync(): Promise<DynamicModule> {
    return {
      module: DynamicCustomConfigModule,
      providers: [
        {
          provide: CustomConfigService,
          useFactory: getConfigService
        }
      ],
      exports: [CustomConfigService],
      global: true
    };
  }
}