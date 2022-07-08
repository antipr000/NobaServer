import { DynamicModule, Global, Injectable, Module } from "@nestjs/common";
import { ConfigModule, ConfigModuleOptions, ConfigService } from "@nestjs/config";
import loadAppConfigs from "../../config/AppConfigurations";

// https://docs.nestjs.com/techniques/configuration

/**
 * Returns `ConfigModule` which in-turn will be used to configure
 *  the `ConfigService` (@nestjs/config) automatically.
 */
export async function getAppConfigModule() {
  const configModuleOptions = async (): Promise<ConfigModuleOptions> => {
    console.log("Loading all the configs .... configModuleOptions is executed ...");
    const configs = await loadAppConfigs();
    console.log("LOADED all the configs .... configModuleOptions is executed ...");
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
    };
  };

  return ConfigModule.forRoot(await configModuleOptions());
}

@Injectable()
export class CustomConfigService extends ConfigService {
  constructor(configs) {
    super(configs);
  }
}

const getConfigService = async () => {
  console.log("Loading all the configs ...");
  const configs = await loadAppConfigs();
  console.log("LOADED all the configs!");
  return new CustomConfigService(configs);
};

/**
 * Nest `ConfigModule` is currently asynchronous i.e. whatever is written
 *    in the function would be executed as soon as it is encountered
 *    (not when the APP loads app.module.ts).
 *
 * But not all the configs are synchronously available. For example -
 *    Configs which needs to be fetched from AWS_SECRETS_MANAGER which
 *    is a n/w call & hence asynchronous.
 * So, to load all these configs, you need to load all the configs
 *    dynamically. Not when the module provider function is executed rather,
 *    when the 'APP' will load the corresponding module (here app.module.ts).
 *
 * As `ConfigModule` currently doesn't have `forRootAsync` version,
 *    this default `ConfigModule` can't be used to load the `ConfigService`.
 * Hence, a new module is required, which will load the configuration
 *    & initialise the `ConfigService` asynchronously. Hence `CustomConfigModule`.
 *
 * Why `CustomConfigModule` provides & exports `CustomConfigService`
 * instead of raw `ConfigService`?
 *
 * As mentioned above, `ConfigService` is loaded internally by nest using `ConfigModule`.
 * Hence, the different services where `ConfigService` is required to be imported,
 *    `ConfigModule` was imported.
 * But now if `CustomConfigModule` provides `ConfigService`, different modules
 *    are not able to figure out that the `ConfigService` is imported by `CustomConfigModule`.
 *
 * Hence, CustomConfigService which is simply extending `ConfigService`.
 */
@Global()
@Module({
  controllers: [],
  providers: [
    {
      provide: CustomConfigService,
      useFactory: getConfigService,
    },
  ],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}

/**
 * This module is testing counterpart of `CustomConfigModule`.
 * `CustomConfigModule` is doing a lot of things like
 *      - Reading the YAML files & loading all the configurations.
 *      - Contacting AWS SECRETS MANAGER for the required credentials.
 *      - etc ...
 * but all these things are not required in test environments as most
 * of the time, test environments are controlled and all the external
 * dependencies are mocked dynamically.
 *
 * Hence `TestConfigModule` which will DYNAMICALLY provides `CustomConfigService`
 * with the specified environment varaibles as configs.
 */
@Module({})
export class TestConfigModule {
  static async registerAsync(envVariables: Record<string, any>): Promise<DynamicModule> {
    return {
      module: TestConfigModule,
      providers: [
        {
          provide: CustomConfigService,
          useFactory: () => new CustomConfigService(envVariables),
        },
      ],
      exports: [CustomConfigService],
      global: true,
    };
  }
}
