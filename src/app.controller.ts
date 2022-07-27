import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AppService } from "./app.service";
import { Public } from "./modules/auth/public.decorator";
import { ConfigurationProviderService } from "./modules/common/configuration.provider.service";
import { ConfigurationsDTO } from "./modules/common/dto/ConfigurationsDTO";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";
import { LocationDTO } from "./modules/common/dto/LocationDTO";
import { LocationService } from "./modules/common/location.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly locationService: LocationService,
    private readonly configurationsProviderService: ConfigurationProviderService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Checks if the Noba service is up and running" })
  @ApiResponse({ status: HttpStatus.OK, description: "Health status of the Noba service" })
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
    // TODO(#235): Pull from database post-MVP
    return this.appService.getSupportedCryptocurrencies();
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
    // TODO(#235): Pull from database post-MVP
    return this.appService.getSupportedFiatCurrencies();
  }

  @Public()
  @Get("countries")
  @ApiOperation({ summary: "Returns a list of all countries supported by Noba Onramp" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Location details of supported countries, optionally including subdivision data",
    type: [LocationDTO],
  })
  @ApiQuery({ name: "includeSubdivisions", type: "boolean", description: "Include subdivision data", required: false })
  @ApiTags("Assets")
  async getSupportedCountries(
    @Query("includeSubdivisions") includeSubdivisions = "false", // Making this a boolean did not work as expected - still comes through as a string.
  ): Promise<Array<LocationDTO>> {
    return this.locationService.getLocations(includeSubdivisions === "true");
  }

  @Public()
  @Get("countries/:countryCode?")
  @ApiOperation({ summary: "Returns details of a country and its subdivisions supported by Noba Onramp" })
  @ApiResponse({ status: HttpStatus.OK, description: "Location details of requested country", type: LocationDTO })
  @ApiTags("Assets")
  @ApiNotFoundResponse({ description: "Country code not found" })
  async getSupportedCountry(@Param("countryCode") countryCode?: string): Promise<LocationDTO> {
    return this.locationService.getLocationDetails(countryCode);
  }

  @Public()
  @Get("config")
  @ApiOperation({ summary: "Returns common api configurations" })
  @ApiResponse({ status: HttpStatus.OK, description: "Common api configurations", type: ConfigurationsDTO })
  @ApiTags("Assets")
  @ApiNotFoundResponse({ description: "Configurations not found" })
  async getCommonConfigurations(): Promise<ConfigurationsDTO> {
    return this.configurationsProviderService.getConfigurations();
  }
}
