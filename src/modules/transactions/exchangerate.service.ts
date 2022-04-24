import { Injectable } from '@nestjs/common';
import * as CoinGecko from 'coingecko-api';


@Injectable()
export class ExchangeRateService {

    private readonly coinGeckoClient = new CoinGecko();

    async priceInFiat( cryptoCurrency: string, fiatCurrency: string): Promise<number> {
        //TODO cache result for few ms or so? so that if multiple requests come in for same crypto currency, we don't have to make multiple calls to coinGecko
        const price_data = await this.coinGeckoClient.simple.price({
            ids: [cryptoCurrency],
            vs_currencies: [fiatCurrency],
        });
        return price_data.data[cryptoCurrency][fiatCurrency];;
    }

    async processingFee(cryptoCurrency: string, fiatCurrency: string, fiatAmount: number): Promise<number> {
        /**
         * Hardcoding this to 5% of amount
         * TODO: Add proper conversion here
         */
        return (5.0 * fiatAmount) / 100.0;
    }
}