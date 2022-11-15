import { Inject, Injectable } from "@nestjs/common";
import {
  ExecuteQuoteRequest,
  FundsAvailabilityResponse,
  QuoteRequestForFixedFiat,
  QuoteRequestForFixedCrypto,
  FundsAvailabilityRequest,
  ExecutedQuote,
  ExecutedQuoteStatus,
  TRADE_TYPE_FIXED,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  ConsumerWalletTransferResponse,
  FundsAvailabilityStatus,
  CombinedNobaQuote,
} from "../domain/AssetTypes";
import { DefaultAssetService } from "./default.asset.service";
import {
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeRequest,
  ZerohashTradeResponse,
  ZerohashTransfer,
  ZerohashWithdrawalResponse,
} from "../domain/ZerohashTypes";
import { CurrencyService } from "../../../modules/common/currency.service";
import { ZeroHashService } from "../zerohash.service";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class USDCPolygonAssetService extends DefaultAssetService {
  constructor(
    currencyService: CurrencyService,
    protected readonly zerohashService: ZeroHashService,
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    configService: CustomConfigService,
  ) {
    super(currencyService, logger, configService);
  }

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

  protected getNetworkFeeFromLiquidityProvider(
    cryptoCurrency: string,
    fiatCurrency: string,
  ): Promise<ZerohashNetworkFee> {
    return this.zerohashService.estimateNetworkFee(cryptoCurrency, fiatCurrency);
  }

  async getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<CombinedNobaQuote> {
    return await super.getQuoteForSpecifiedFiatAmount(request);
  }

  async getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<CombinedNobaQuote> {
    return await super.getQuoteForSpecifiedCryptoQuantity(request);
  }

  async executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote> {
    // TODO(#): Remove this once all the clients are aware about "discount"
    if (request.discount === undefined || request.discount === null) {
      request.discount = {
        fixedCreditCardFeeDiscountPercent: 0,
        networkFeeDiscountPercent: 0,
        nobaFeeDiscountPercent: 0,
        nobaSpreadDiscountPercent: 0,
        processingFeeDiscountPercent: 0,
      };
    }

    const nobaQuote = await this.getQuoteForSpecifiedFiatAmount({
      cryptoCurrency: request.cryptoCurrency,
      fiatAmount: Utils.roundTo2DecimalNumber(request.fiatAmount),
      fiatCurrency: request.fiatCurrency,
      transactionType: request.transactionType,
      discount: {
        fixedCreditCardFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
        networkFeeDiscountPercent: request.discount.networkFeeDiscountPercent,
        nobaFeeDiscountPercent: request.discount.nobaFeeDiscountPercent,
        nobaSpreadDiscountPercent: request.discount.nobaSpreadDiscountPercent,
        processingFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
      },
    });

    return {
      tradeID: TRADE_TYPE_FIXED,
      tradePrice: 1,
      cryptoReceived: request.cryptoQuantity,
      quote: nobaQuote,
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

  protected getLiquidityProviderTransfer(id: any): Promise<ZerohashTransfer> {
    throw new Error("Method not implemented.");
  }

  async transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string> {
    // Gets or creates participant code
    const consumerParticipantCode: string = await this.zerohashService.getParticipantCode(
      request.consumer,
      request.transactionCreationTimestamp,
    );

    // TODO(#310) Confirm that the traded values comes out correctly
    const tradeRequest: ZerohashTradeRequest = {
      boughtAssetID: request.cryptoCurrency,
      soldAssetID: request.fiatCurrency,

      buyAmount: request.totalCryptoAmount,
      tradePrice: request.cryptoAssetTradePrice,

      sellAmount: request.fiatAmountPreSpread,
      totalFiatAmount: request.totalFiatAmount,

      buyerParticipantCode: consumerParticipantCode,
      sellerParticipantCode: this.zerohashService.getNobaPlatformCode(),

      idempotencyID: request.transactionID,
      requestorEmail: request.consumer.email,
    };

    const tradeResponse: ZerohashTradeResponse = await this.zerohashService.executeTrade(tradeRequest);

    return tradeResponse.tradeID;
  }

  protected getLiquidityProviderTradeStatus(id: string): Promise<ZerohashTradeResponse> {
    return this.zerohashService.checkTradeStatus(id);
  }

  async transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<ConsumerWalletTransferResponse> {
    const withdrawalId: string = await this.zerohashService.requestWithdrawal(
      request.walletAddress,
      request.amount,
      request.assetId,
      request.consumer.zhParticipantCode,
      this.zerohashService.getNobaPlatformCode(),
      request.smartContractData,
    );

    return {
      liquidityProviderTransactionId: withdrawalId,
    };
  }

  protected getLiquidityProviderWithdrawal(id: any): Promise<ZerohashWithdrawalResponse> {
    return this.zerohashService.getWithdrawal(id);
  }
}
