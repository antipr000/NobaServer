import { ConfigModule } from "@nestjs/config";
import loadAppConfigs from "../../config/AppConfigurations";

// https://docs.nestjs.com/techniques/configuration

export async function getAppConfigModule() {
  return ConfigModule.forRoot({
    /**
     * ".env", ".env.local" is not used in this project.
     * All th configurations comes from YAML files or ENV variables.
     */
    ignoreEnvFile: true,

    // load configurations from yaml files
    load: [async () => loadAppConfigs()],

    // Marking as global avoid to import the Configs in each module separately
    isGlobal: true,
  });
}
