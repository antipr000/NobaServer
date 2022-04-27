import { Controller, Get, Inject, Param, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiResponse } from '@nestjs/swagger';
import { ExchangeRateService } from './exchangerate.service';
import { ApiBearerAuth } from '@nestjs/swagger';



//TODO fetch exchange rates on client side? or at least add rate limitation from single ip to prevent mis-use of price api provider on our behalf??
@Controller("exchangerates")
@ApiBearerAuth()
export class ExchangeRateController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;
  
  constructor(private readonly exchangeRateService: ExchangeRateService) {
    
  }

  @Get("/priceinfiat/:crypto_currency_code/:fiat_currency_code")
  @ApiResponse({ status: HttpStatus.OK, description: "Get the fiat price (leg 2) for the desired crypto currency (leg1)" })
  async priceInFiat(@Param('crypto_currency_code') cryptoCurrencyCode : string, @Param('fiat_currency_code') fiatCurrencyCode: string ): Promise<number>{
    return this.exchangeRateService.priceInFiat(cryptoCurrencyCode, fiatCurrencyCode);
  }

  @Get("/processingfee/:crypto_currency_code/:fiat_currency_code/:fiat_amount")
  @ApiResponse({ status: HttpStatus.OK })
  async processingFee(
    @Param('crypto_currency_code') cryptoCurrencyCode : string, 
    @Param('fiat_currency_code') fiatCurrencyCode: string,
    @Param('fiat_amount') fiatAmount: number): Promise<number> {
      return this.exchangeRateService.processingFee(cryptoCurrencyCode, fiatCurrencyCode, fiatAmount);
  }
}
