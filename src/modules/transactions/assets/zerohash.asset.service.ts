import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import {
  ExecuteQuoteRequest,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityResponse,
  NobaQuote,
  ExecutedQuote,
  FundsAvailabilityRequest,
  ConsumerWalletTransferResponse,
} from "../domain/AssetTypes";
import { ZeroHashService } from "../zerohash.service";
import {
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeResponse,
  ZerohashTradeRequest,
  ZerohashTransfer,
  ZerohashWithdrawalResponse,
  ZerohashTransferResponse,
  ZerohashExecutedQuote,
} from "../domain/ZerohashTypes";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { NobaConfigs, NobaTransactionConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CurrencyType } from "../../../modules/common/domain/Types";
import { Utils } from "../../../core/utils/Utils";
import { CurrencyService } from "../../../modules/common/currency.service";
import { DefaultAssetService } from "./default.asset.service";

@Injectable()
export class ZerohashAssetService extends DefaultAssetService {
  protected readonly nobaTransactionConfigs: NobaTransactionConfigs;

  constructor(
    currencyService: CurrencyService,
    protected readonly zerohashService: ZeroHashService,
    configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
  ) {
    super(currencyService, logger, configService);
    this.nobaTransactionConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction;
  }

  protected getNetworkFeeFromLiquidityProvider(
    cryptoCurrency: string,
    fiatCurrency: string,
  ): Promise<ZerohashNetworkFee> {
    return this.zerohashService.estimateNetworkFee(cryptoCurrency, fiatCurrency);
  }

  protected async getQuoteFromLiquidityProviderFiatFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    fiatAmount: number,
  ): Promise<ZerohashQuote> {
    return await this.zerohashService.requestQuoteForFixedFiatCurrency(cryptoCurrency, fiatCurrency, fiatAmount);
  }

  protected async getQuoteFromLiquidityProviderCryptoFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoQuantity: number,
  ): Promise<ZerohashQuote> {
    return await this.zerohashService.requestQuoteForDesiredCryptoQuantity(
      cryptoCurrency,
      fiatCurrency,
      cryptoQuantity,
    );
  }

  /**
   * Make the requested fund available for transfer to consumer wallet.
   *
   * @param request: Fiat and Crypto Asset details to be exchanged.
   * @returns
   *   - If succeed, returns the ID which can be polled for completion using `pollFundsAvailableStatus` function.
   *   - If failed, throws the error.
   *
   * TODO(#): Make it idempotent by using 'transactionId'.
   * TODO(#): Fails gracefully with proper error messages.
   */
  async executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote> {
    const cryptocurrency = await this.currencyService.getCryptocurrency(request.cryptoCurrency);
    if (cryptocurrency == null) {
      throw new BadRequestError({
        messageForClient: `Unsupported cryptocurrency: ${request.cryptoCurrency}`,
      });
    }

    const fiatCurrency = await this.currencyService.getFiatCurrency(request.fiatCurrency);
    if (fiatCurrency == null) {
      throw new BadRequestError({
        messageForClient: `Unsupported fiat currency: ${request.fiatCurrency}`,
      });
    }

    // Snce we've already calculated fees & spread based on a true fixed side, we will always pass FIAT here
    let nobaQuote: NobaQuote;

    switch (request.fixedSide) {
      case CurrencyType.FIAT:
        nobaQuote = await this.getQuoteForSpecifiedFiatAmount({
          cryptoCurrency: request.cryptoCurrency,
          fiatAmount: Utils.roundToSpecifiedDecimalNumber(request.fiatAmount, fiatCurrency.precision),
          fiatCurrency: request.fiatCurrency,
        });

        break;

      case CurrencyType.CRYPTO:
        nobaQuote = await this.getQuoteForSpecifiedCryptoQuantity({
          cryptoCurrency: request.cryptoCurrency,
          cryptoQuantity: Utils.roundToSpecifiedDecimalNumber(request.cryptoQuantity, cryptocurrency.precision),
          fiatCurrency: request.fiatCurrency,
        });
        break;

      default:
        throw new BadRequestException(`Unknown 'fixedSide' of the transaction: '${request.fixedSide}'`);
    }

    // TODO(#): Slippage calculations.

    const executedQuote: ZerohashExecutedQuote = await this.zerohashService.executeQuote(nobaQuote.quoteID);
    return {
      quote: nobaQuote,
      tradeID: executedQuote.tradeID,
      tradePrice: executedQuote.tradePrice,
      cryptoReceived: executedQuote.cryptoReceived,
    };
  }

  async makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    const assetTransfer: ZerohashTransferResponse = await this.zerohashService.transferAssetsToNoba(
      request.cryptocurrency,
      request.cryptoAmount,
    );

    return {
      transferID: assetTransfer.transferID,
      transferredCrypto: assetTransfer.cryptoAmount,
      cryptocurrency: assetTransfer.cryptocurrency,
    };
  }

  protected async getLiquidityProviderTransfer(id: any): Promise<ZerohashTransfer> {
    return await this.zerohashService.getTransfer(id);
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

  // TODO(#): Make this implementation idempotent.
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

  protected async getLiquidityProviderWithdrawal(id: any): Promise<ZerohashWithdrawalResponse> {
    return this.zerohashService.getWithdrawal(id);
  }
}