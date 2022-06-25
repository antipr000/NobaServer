import * as winston from "winston";
import { utilities as nestWinstonModuleUtilities, WinstonModule } from "nest-winston";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SERVER_LOG_FILE_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "./AppConfigModule";

export function getWinstonModule() {
  return WinstonModule.forRootAsync({
    imports: [ConfigModule],
    inject: [CustomConfigService],
    useFactory: async (configService: CustomConfigService) => {
      const logFilePath = configService.get<string>(SERVER_LOG_FILE_PATH);

      const winstonFormat = winston.format.combine(
        //somewhere magic happens and z time gets converted back to local time so
        // need to add something to prevent that conversion
        winston.format.timestamp({
          format: () => new Date().toISOString() + " ",
        }),
        nestWinstonModuleUtilities.format.nestLike("NobaServer"),
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
