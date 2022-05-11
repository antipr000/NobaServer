import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

export function getWinstonModule() {
  const winstonFormat = winston.format.combine(
    //somewhere magic happens and z time gets converted back to local time so 
    // need to add something to prevent that conversion
    winston.format.timestamp({ format: () => (new Date().toISOString()) + " " }),
    nestWinstonModuleUtilities.format.nestLike("NobaServer")
  );

  return WinstonModule.forRoot({
    transports: [
      new winston.transports.File({ filename: 'noba_server.log', level: 'debug' }),
      new winston.transports.Console({
        format: winstonFormat
      }),
    ],
  })
}