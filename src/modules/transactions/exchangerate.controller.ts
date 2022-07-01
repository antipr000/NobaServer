import { Controller, Get, HttpStatus, Inject, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "Get price of a crypto (leg1) in fiat (leg 2)" })
  @ApiResponse({ status: HttpStatus.OK, description: "Fiat price (leg 2) for the desired crypto currency (leg1)" })
  async priceInFiat(
    @Param("fiatCurrencyCode") fiatCurrencyCode: string,
    @Query("cryptoCurrencyCode") cryptoCurrencyCode: string,
  ): Promise<number> {
    return this.exchangeRateService.priceInFiat(cryptoCurrencyCode, fiatCurrencyCode);
  }

  @Public()
  @Get("/processingfee/:fiatCurrencyCode")
  @ApiOperation({ summary: "Get the processing fee for a crypto fiat conversion" })
  @ApiResponse({ status: HttpStatus.OK, description: "Processing fee for given crypto fiat conversion", type: ProcessingFeeDTO })
  async processingFee(
    @Param("fiatCurrencyCode") fiatCurrencyCode: string,
    @Query("fiatAmount") fiatAmount: number,
    @Query("cryptoCurrencyCode") cryptoCurrencyCode: string,
  ): Promise<ProcessingFeeDTO> {
    return this.exchangeRateService.processingFee(cryptoCurrencyCode, fiatCurrencyCode, fiatAmount);
  }
}
