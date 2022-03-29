import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

export function getWinstonModule(){
    return WinstonModule.forRoot({ 
      transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              // winston.format(info => {
              //   info.appName = "NobaServer"
              //   return info;
              // })(),
              
              winston.format.timestamp({format:()=> (new Date().toISOString())+" "}), //somewhere magic happens and z time gets converted back to local time so need to add something to prevent that conversion
              nestWinstonModuleUtilities.format.nestLike("NobaServer"),
              //winston.format.json()
            ),
          }),
       // other transports...
       ],
    })
  }