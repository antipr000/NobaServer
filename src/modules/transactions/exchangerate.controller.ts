import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as CoinGecko from 'coingecko-api';



//TODO fetch exchange rates on client side? or at least add rate limitation from single ip to prevent mis-use of price api provider on our behalf??
@Controller("exchangerates")
export class ExchangeRateController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  private readonly coinGeckoClient = new CoinGecko();

  constructor(private readonly configService: ConfigService) {
    
  }

 
  @Get("/usd/:cryptoCurrency")
  @ApiParam({name: 'cryptoCurrency', required: true})
  @ApiResponse({status:HttpStatus.OK, type: Number})
  async priceInUSD(@Param('cryptoCurrency') cryptoCurrencyCode ): Promise<number>{
        const price_data = await this.coinGeckoClient.simple.price({
            ids: [cryptoCurrencyCode],
            vs_currencies: ['usd'],
        });

        return price_data.data[cryptoCurrencyCode]["usd"];
  }

  @Get("/priceinfiat/:crypto_currency_code/:fiat_currency_code")
  @ApiResponse({status:HttpStatus.OK})
  async priceInFiat(@Param('crypto_currency_code') cryptoCurrencyCode : string, @Param('fiat_currency_code') fiatCurrencyCode: string ): Promise<string>{
    throw new Error("Not implemented");
  }
}