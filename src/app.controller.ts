import { Controller, Get, HttpStatus, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "./app.service";
import { Public } from "./modules/auth/public.decorator";

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
  @ApiOperation({ summary: "Returns a list of all cryptocurrencies whose on-ramp we support" })
  @ApiResponse({ status: HttpStatus.OK, description: "List of all supported cryptocurrencies" })
  @ApiTags("Assets")
  supportedCryptocurrencies(): string {
    // This is list of all crypto we support for on ramp
    return "ethereum, terrausd, terra-luna";
  }
}
