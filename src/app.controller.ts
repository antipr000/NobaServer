import { Controller, Get ,Inject} from '@nestjs/common';
import { AppService } from './app.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Public } from './modules/auth/public.decorator';

@Controller()
export class AppController {

  constructor(private readonly appService: AppService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger ) {}
  
  @Public()
  @Get('health')
  appHealth(): string {
    return "Running!"; //Todo implement advance health check like here like db connectivity etc.?  
  }

  @Public()
  @Get('cryptocurrencies')
  supportedCryptocurrencies(): string {
    // This is list of all crypto we support for on ramp
    return "ethereum, terrausd, terra-luna";
  }

}
