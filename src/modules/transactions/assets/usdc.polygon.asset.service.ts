import { Injectable } from "@nestjs/common";
import {
  ExecuteQuoteRequest,
  FundsAvailabilityStatus,
  FundsAvailabilityResponse,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
  NobaQuote,
  FundsAvailabilityRequest,
  ExecutedQuote,
  ExecutedQuoteStatus,
  TRADE_TYPE_FIXED,
} from "../domain/AssetTypes";
import { DefaultAssetService } from "./default.asset.service";
import { ZerohashQuote } from "../domain/ZerohashTypes";

@Injectable()
export class USDCPolygonAssetService extends DefaultAssetService {
  // Overrides superclass method
  protected async getQuoteFromLiquidityProviderFiatFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    fiatAmount: number,
  ): Promise<ZerohashQuote> {
    return {
      cryptoCurrency: cryptoCurrency,
      expireTimestamp: new Date().getTime() + 360000,
      fiatCurrency: fiatCurrency,
      perUnitCryptoAssetCost: 1,
      quoteID: TRADE_TYPE_FIXED,
    };
  }

  // Overrides superclass method
  protected async getQuoteFromLiquidityProviderCryptoFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoQuantity: number,
  ): Promise<ZerohashQuote> {
    return {
      cryptoCurrency: cryptoCurrency,
      // Expires in 5 minutes - technically never expires because it's always 1 but set a reasonable time anyway
      expireTimestamp: new Date().getTime() + 360000,
      fiatCurrency: fiatCurrency,
      perUnitCryptoAssetCost: 1,
      quoteID: TRADE_TYPE_FIXED,
    };
  }

  async getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote> {
    return await super.getQuoteForSpecifiedFiatAmount(request);
  }

  async getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote> {
    return await super.getQuoteForSpecifiedCryptoQuantity(request);
  }

  async executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote> {
    return {
      tradeID: TRADE_TYPE_FIXED,
      tradePrice: 1,
      cryptoReceived: request.cryptoQuantity,
      quote: null,
    };
  }

  pollExecuteQuoteForFundsAvailabilityStatus(id: string): Promise<ExecutedQuoteStatus> {
    throw new Error("Method not implemented.");
  }

  makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    throw new Error("Method not implemented.");
  }
  pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus> {
    throw new Error("Method not implemented.");
  }

  // Other interface methods flow through to superclass
}
