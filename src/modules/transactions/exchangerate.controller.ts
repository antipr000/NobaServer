import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Public } from "../auth/public.decorator";
import { ExchangeRateService } from "./exchangerate.service";
import { ProcessingFeeDTO } from "./dto/ProcessingFeeDTO";

//TODO fetch exchange rates on client side? or at least add rate limitation from single ip to prevent mis-use of price api provider on our behalf??
@Controller("exchangerates")
@ApiTags("Assets")
export class ExchangeRateController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Public()
  @Get("/priceinfiat/:fiatCurrencyCode")
  @ApiOperation({ summary: "Gets price of a crypto (leg1) in fiat (leg 2)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Fiat price (leg 2) for the desired crypto currency (leg1)",
  })
  @ApiBadRequestResponse({ description: "Invalid currency code (fiat or crypto)" })
  @ApiServiceUnavailableResponse({ description: "Unable to connect to underlying service provider" })
  async priceInFiat(
    @Param("fiatCurrencyCode") fiatCurrencyCode: string,
    @Query("cryptoCurrencyCode") cryptoCurrencyCode: string,
  ): Promise<number> {
    return this.exchangeRateService.priceInFiat(cryptoCurrencyCode, fiatCurrencyCode);
  }

  @Public()
  @Get("/processingfee/:fiatCurrencyCode")
  @ApiOperation({ summary: "Gets the processing fee for a crypto fiat conversion" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Processing fee for given crypto fiat conversion",
    type: ProcessingFeeDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid currency code (fiat or crypto)" })
  @ApiServiceUnavailableResponse({ description: "Unable to connect to underlying service provider" })
  async processingFee(
    @Param("fiatCurrencyCode") fiatCurrencyCode: string,
    @Query("fiatAmount") fiatAmount: number,
    @Query("cryptoCurrencyCode") cryptoCurrencyCode: string,
  ): Promise<ProcessingFeeDTO> {
    return this.exchangeRateService.processingFee(cryptoCurrencyCode, fiatCurrencyCode, fiatAmount);
  }
}
