import * as winston from "winston";
import { utilities as nestWinstonModuleUtilities, WinstonModule } from "nest-winston";
import { SERVER_LOG_FILE_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "./AppConfigModule";
import { isLocalDevEnvironment } from "../../config/ConfigurationUtils";

export function getWinstonModule() {
  return WinstonModule.forRootAsync({
    imports: [],
    inject: [CustomConfigService],
    useFactory: async (configService: CustomConfigService) => {
      const logFilePath = configService.get<string>(SERVER_LOG_FILE_PATH);

      const winstonFormat = winston.format.combine(
        //somewhere magic happens and z time gets converted back to local time so
        // need to add something to prevent that conversion
        winston.format.timestamp({
          format: () => new Date().toISOString() + " ",
        }),
        nestWinstonModuleUtilities.format.nestLike("NobaServer", { colors: isLocalDevEnvironment() }),
      );

      return {
        transports: [
          new winston.transports.File({
            filename: logFilePath,
            level: "debug",
          }),
          new winston.transports.Console({
            format: winstonFormat,
          }),
        ],
      };
    },
  });
}

/**
 * A 'WinstonModule' used for logging only to Console.
 * This module is supposed to be used in unit-tests.
 *
 * The original 'WinstonModule' can be much richer & might have
 * functionality which a test wouldn't want. A simple example could
 * be - In real production setup, you may want your `WinstonModule`
 * to write your logs to some external systems as well
 * (eg - a file, CloudWatch, etc).
 * But a test wouldn't need all these log transfers because -
 *   - It will require your tests to know the production secrets
 *      like AWS Secrets for transferring logs to CloudWatch.
 *   - Tests would be connecting to external dependencies & hence can be flaky.
 *      For example:
 *        -  If AWS secrets are configured correctly in local env
 *           but in github actions, these secrets have improper values.
 *        - If the external dependencies is down, the tests would fail.
 *   - Runtime of the tests will increase as it is connecting to external
 *      dependencies.
 */
export function getTestWinstonModule() {
  return WinstonModule.forRoot({
    transports: [new winston.transports.Console()],
  });
}
