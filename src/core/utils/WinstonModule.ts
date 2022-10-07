import winston from "winston";
import { WinstonModule } from "nest-winston";
import { SERVER_LOG_FILE_PATH, isLocalDevEnvironment } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "./AppConfigModule";

import { Format } from "logform";
import { inspect } from "util";
import safeStringify from "fast-safe-stringify";

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
        // nestWinstonModuleUtilities.format.nestLike("NobaServer", { colors: isLocalDevEnvironment() }), //TODO https://github.com/gremo/nest-winston/pull/582/files
        nestLike("NobaServer", { colors: isLocalDevEnvironment(), prettyPrint: false }),
      );

      return {
        transports: [
          new winston.transports.Console({
            format: winstonFormat,
            level: process.env["WINSTON_LOG_LEVEL"] ?? "info",
          }),
        ],
      };
    },
  });
}

// this below can be removed once this pull request is merged https://github.com/gremo/nest-winston/pull/582/files and we have updated version of nest-winston
const clc = {
  bold: (text: string) => `\x1B[1m${text}\x1B[0m`,
  green: (text: string) => `\x1B[32m${text}\x1B[39m`,
  yellow: (text: string) => `\x1B[33m${text}\x1B[39m`,
  red: (text: string) => `\x1B[31m${text}\x1B[39m`,
  magentaBright: (text: string) => `\x1B[95m${text}\x1B[39m`,
  cyanBright: (text: string) => `\x1B[96m${text}\x1B[39m`,
};

const nestLikeColorScheme: Record<string, (text: string) => string> = {
  info: clc.green,
  error: clc.red,
  warn: clc.yellow,
  debug: clc.magentaBright,
  verbose: clc.cyanBright,
};

const nestLike = (
  appName = "NestWinston",
  options = {
    colors: !process.env.NO_COLOR,
    prettyPrint: false,
  },
): Format =>
  winston.format.printf(({ context, level, timestamp, message, ms, ...meta }) => {
    if ("undefined" !== typeof timestamp) {
      // Only format the timestamp to a locale representation if it's ISO 8601 format. Any format
      // that is not a valid date string will throw, just ignore it (it will be printed as-is).
      try {
        if (timestamp === new Date(timestamp).toISOString()) {
          timestamp = new Date(timestamp).toLocaleString();
        }
      } catch (error) {
        // eslint-disable-next-line no-empty
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const color = (options.colors && nestLikeColorScheme[level]) || ((text: string): string => text);
    const yellow = options.colors ? clc.yellow : (text: string): string => text;

    const stringifiedMeta = safeStringify(meta);
    const formattedMeta = options.prettyPrint
      ? inspect(JSON.parse(stringifiedMeta), { colors: options.colors, depth: null })
      : stringifiedMeta;

    return (
      `${color(`[${appName}]`)} ` +
      `${yellow(level.charAt(0).toUpperCase() + level.slice(1))}\t` +
      ("undefined" !== typeof timestamp ? `${timestamp} ` : "") +
      ("undefined" !== typeof context ? `${yellow("[" + context + "]")} ` : "") +
      `${color(message)} - ` +
      `${formattedMeta}` +
      ("undefined" !== typeof ms ? ` ${yellow(ms)}` : "")
    );
  });

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
