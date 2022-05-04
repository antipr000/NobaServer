import { Controller, Get, HttpStatus, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Public } from '../auth/public.decorator';
import { ExchangeRateService } from './exchangerate.service';



//TODO fetch exchange rates on client side? or at least add rate limitation from single ip to prevent mis-use of price api provider on our behalf??
@Controller("exchangerates")
@ApiBearerAuth()
export class ExchangeRateController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;
  
  constructor(private readonly exchangeRateService: ExchangeRateService) {
    
  }

  @Get("/priceinfiat/:crypto_currency_code/:fiat_currency_code")
  @ApiOperation({ summary: 'Get price of a crypto (leg1) in fiat (leg 2)' })
  @ApiResponse({ status: HttpStatus.OK, description: "Fiat price (leg 2) for the desired crypto currency (leg1)" })
  async priceInFiat(@Param('crypto_currency_code') cryptoCurrencyCode : string, @Param('fiat_currency_code') fiatCurrencyCode: string ): Promise<number>{
    return this.exchangeRateService.priceInFiat(cryptoCurrencyCode, fiatCurrencyCode);
  }

  @Get("/processingfee/:crypto_currency_code/:fiat_currency_code/:fiat_amount")
  @ApiOperation({ summary: 'Get the processing fee for a crypto fiat conversion' })
  @ApiResponse({ status: HttpStatus.OK, description: "Processing fee for given crypto fiat conversion" })
  async processingFee(
    @Param('crypto_currency_code') cryptoCurrencyCode : string, 
    @Param('fiat_currency_code') fiatCurrencyCode: string,
    @Param('fiat_amount') fiatAmount: number): Promise<number> {
      return this.exchangeRateService.processingFee(cryptoCurrencyCode, fiatCurrencyCode, fiatAmount);
  }
}
