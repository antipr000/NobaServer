import { Controller, Get, HttpStatus, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "./app.service";
import { Public } from "./modules/auth/public.decorator";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Checks if the service is up and running" })
  @ApiResponse({ status: HttpStatus.OK, description: "Status OK" })
  @ApiTags("Health Check")
  appHealth(): string {
    return "We're up and running. How are you?"; //Todo implement advance health check like here like db connectivity etc.?
  }

  @Public()
  @Get("cryptocurrencies")
  @ApiOperation({ summary: "Returns a list of all cryptocurrencies supported by Noba Onramp" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [CurrencyDTO],
    description: "List of all supported cryptocurrencies",
  })
  @ApiTags("Assets")
  async supportedCryptocurrencies(): Promise<CurrencyDTO[]> {
    // TODO: Pull from database post-MVP
    return JSON.parse(
      "[\
      {'name': 'Ethereum', 'ticker': 'ETH', 'iconPath': 'https://cryptologos.cc/logos/ethereum-eth-logo.png'},\
      {'name': 'Terra USD', 'ticker': 'LUNA1-USD', 'iconPath': 'https://icodrops.com/wp-content/uploads/2018/08/Terra-Logo.jpg'},\
      {'name': 'Terra Luna', 'ticker': 'LUNA', 'iconPath': 'https://cryptologos.cc/logos/terra-luna-luna-logo.png?v=022'}]",
    );

    //return 'ethereum, terrausd, terra-luna";
  }

  @Public()
  @Get("fiatcurrencies")
  @ApiOperation({ summary: "Returns a list of all fiat currencies supported by Noba Onramp" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [CurrencyDTO],
    description: "List of all supported fiat currencies",
  })
  @ApiTags("Assets")
  async supportedFiatCurrencies(): Promise<CurrencyDTO[]> {
    // TODO: Pull from database post-MVP
    return JSON.parse(
      "[{'name': 'US Dollar', 'ticker': 'USD', 'iconPath': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/United-states_flag_icon_round.svg/1024px-United-states_flag_icon_round.svg.png'}]",
    );
  }
}
