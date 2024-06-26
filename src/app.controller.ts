import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { getCommonHeaders } from "./core/utils/CommonHeaders";
import { IsNoApiKeyNeeded, Public } from "./modules/auth/public.decorator";
import { ConfigurationProviderService } from "./modules/common/configuration.provider.service";
import { ConfigurationsDTO } from "./modules/common/dto/ConfigurationsDTO";
import { CreditCardDTO } from "./modules/common/dto/CreditCardDTO";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";
import { LocationDTO } from "./modules/common/dto/LocationDTO";
import { LocationService } from "./modules/common/location.service";
import { CreditCardService } from "./modules/common/creditcard.service";
import { CurrencyService } from "./modules/common/currency.service";
import { SupportedBanksDTO } from "./modules/psp/dto/SupportedBanksDTO";
import { MonoService } from "./modules/mono/public/mono.service";
import { HealthCheckResponseDTO } from "./modules/common/dto/HealthCheckResponseDTO";
import { VerificationService } from "./modules/verification/verification.service";
import { HealthCheckStatus } from "./core/domain/HealthCheckTypes";
import { ALLOWED_DEPTH, HealthCheckQueryDTO } from "./modules/common/dto/HealthCheckQueryDTO";
import { WorkflowExecutor } from "./infra/temporal/workflow.executor";
import { IdentificationService } from "./modules/common/identification.service";
import { IdentificationTypeCountryDTO } from "./modules/common/dto/identification.type.country.dto";
import { CircleService } from "./modules/circle/public/circle.service";
import { ExchangeRateDTO } from "./modules/exchangerate/dto/exchangerate.dto";
import { ExchangeRateService } from "./modules/exchangerate/exchangerate.service";

@Controller("v1")
@ApiHeaders(getCommonHeaders())
export class AppController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly locationService: LocationService,
    private readonly identificationService: IdentificationService,
    private readonly creditCardService: CreditCardService,
    private readonly configurationsProviderService: ConfigurationProviderService,
    private readonly monoService: MonoService,
    private readonly verificationService: VerificationService,
    private readonly circleService: CircleService,
    private readonly workflowExecutor: WorkflowExecutor,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @IsNoApiKeyNeeded()
  @Get("health")
  @ApiOperation({ summary: "Checks if the Noba service is up and running" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Health status of the Noba service",
    type: HealthCheckResponseDTO,
  })
  @ApiTags("Health Check")
  async appHealth(@Query() query: HealthCheckQueryDTO): Promise<HealthCheckResponseDTO> {
    if (query.depth === ALLOWED_DEPTH.SHALLOW) {
      return {
        serverStatus: HealthCheckStatus.OK,
      };
    }
    const sardineHealth = await this.verificationService.getHealth();
    const circleHealth = await this.circleService.checkCircleHealth();
    const monoHealth = await this.monoService.checkMonoHealth();
    const temporalHealth = await this.workflowExecutor.getHealth();
    return {
      serverStatus: HealthCheckStatus.OK,
      sardineStatus: sardineHealth.status,
      circleStatus: circleHealth.status,
      monoStatus: monoHealth.status,
      temporalStatus: temporalHealth.status,
    };
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
    return await this.currencyService.getSupportedCryptocurrencies();
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
    return this.currencyService.getSupportedFiatCurrencies();
  }

  @Get("exchangerates")
  @ApiBearerAuth("JWT-auth")
  @ApiTags("Assets")
  @ApiOperation({ summary: "Get exchange rate between a currency pair" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExchangeRateDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiNotFoundResponse({ description: "Exchange rate not found" })
  async getExchangeRate(
    @Query("numeratorCurrency") numeratorCurrency: string,
    @Query("denominatorCurrency") denominatorCurrency: string,
  ): Promise<ExchangeRateDTO> {
    if (!numeratorCurrency) {
      throw new BadRequestException("Numerator currency is required");
    } else if (!denominatorCurrency) {
      throw new BadRequestException("Denominator currency is required");
    }

    if (numeratorCurrency.length !== 3) {
      throw new BadRequestException("Numerator currency must be a 3 letter ISO code");
    } else if (denominatorCurrency.length !== 3) {
      throw new BadRequestException("Denominator currency must be a 3 letter ISO code");
    }

    const exchangeRate = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      numeratorCurrency,
      denominatorCurrency,
    );

    if (!exchangeRate) {
      throw new NotFoundException("Exchange rate not found");
    }

    return exchangeRate;
  }

  @Public()
  @Get("banks")
  @ApiOperation({ summary: "Get list of supported banks" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns list of supported banks",
    type: [SupportedBanksDTO],
  })
  @ApiTags("Assets")
  async getSupportedBanks(): Promise<SupportedBanksDTO[]> {
    return await this.monoService.getSupportedBanks();
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
  async getSupportedCountry(@Param("countryCode") countryCode: string): Promise<LocationDTO> {
    return this.locationService.getLocationDetails(countryCode);
  }

  @Public()
  @Get("identificationtypes")
  @ApiOperation({ summary: "Returns a list of identification types" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Map of country identification types",
    type: [IdentificationTypeCountryDTO],
  })
  @ApiQuery({ name: "countryCode", type: "string", description: "Country code", required: false })
  @ApiTags("Assets")
  async getIdentificationTypes(@Query("countryCode") countryCode?: string): Promise<IdentificationTypeCountryDTO[]> {
    if (countryCode) {
      const identificationTypes = await this.identificationService.getIdentificationTypesForCountry(countryCode);
      if (identificationTypes) {
        return [identificationTypes];
      } else {
        throw new NotFoundException(`Identification types not found for country code ${countryCode}`);
      }
    }

    return this.identificationService.getIdentificationTypes();
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

  @Public()
  @Get("creditcardmetadata/:bin")
  @ApiOperation({ summary: "Returns credit card structure metadata for the provided BIN" })
  @ApiResponse({ status: HttpStatus.OK, description: "Card metadata", type: CreditCardDTO })
  @ApiTags("Assets")
  @ApiNotFoundResponse({ description: "Credit card information not found" })
  async getCreditCardBIN(@Param("bin") bin: string): Promise<CreditCardDTO> {
    const binDetails = await this.creditCardService.getBINDetails(bin);
    if (binDetails == null) {
      throw new NotFoundException("Unknown BIN");
    }
    return binDetails;
  }
}
