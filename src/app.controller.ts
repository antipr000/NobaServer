import { CACHE_MANAGER, Controller, Get, HttpStatus, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "./app.service";
import { Public } from "./modules/auth/public.decorator";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";
import { parse } from "csv";
import { createReadStream } from "fs";
import * as path from "path";
import { Cache, CachingConfig } from "cache-manager";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const results = new Array<CurrencyDTO>();
    const parser = parse({ delimiter: ",", columns: true });
    createReadStream(path.resolve(__dirname, "./config/supported_tokens.csv"))
      .pipe(parser)
      .on("data", data => {
        const name = `${data["Name"]}`.trim();
        const symbol = `${data["Symbol (Prod)"]}`.trim();
        const liq = `${data["Liquidity**"]}`.trim();

        // Include only records for which ZH provides liquidity services (Liquidity=Yes)
        // Exclude XRP
        if (liq === "Yes" && symbol !== "XRP") {
          // TODO: Move this path to config
          results.push({ name: `${name}`, ticker: `${symbol}`, iconPath: `https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/${symbol.toLowerCase()}.svg` });
        }
      })
      .on("end", () => {
        logger.debug(`Loaded cryptocurrencies: ${results}`);

        // Per docs ttl: 0 should never expire the data, but it seems to expire after first access
        // Setting to 1 year instead.
        cacheManager.set("cryptocurrencies", results, { ttl: 60 * 60 * 24 * 365 });
      });
  }

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
  async supportedCryptocurrencies(): Promise<Array<CurrencyDTO>> {
    // TODO: Pull from database post-MVP
    return await this.cacheManager.get("cryptocurrencies");
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
    return [
      {
        name: "US Dollar",
        ticker: "USD",
        iconPath:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/United-states_flag_icon_round.svg/1024px-United-states_flag_icon_round.svg.png",
      },
    ];
  }
}
