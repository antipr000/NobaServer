import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import {
  ExecuteQuoteRequest,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityResponse,
  CombinedNobaQuote,
  ExecutedQuote,
  FundsAvailabilityRequest,
  ConsumerWalletTransferResponse,
  ConsumerAccountBalance,
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
import { WalletProviderService } from "./wallet.provider.service";
import {
  TransactionSubmissionException,
  TransactionSubmissionFailureExceptionText,
} from "../exceptions/TransactionSubmissionException";

@Injectable()
export class ZerohashAssetService extends DefaultAssetService implements WalletProviderService {
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

    // TODO(#): Remove this once all the clients are aware about "discount"
    if (request.discount === undefined || request.discount === null)
      request.discount = {
        fixedCreditCardFeeDiscountPercent: 0,
        networkFeeDiscountPercent: 0,
        nobaFeeDiscountPercent: 0,
        nobaSpreadDiscountPercent: 0,
        processingFeeDiscountPercent: 0,
      };

    let nobaQuote: CombinedNobaQuote;

    switch (request.fixedSide) {
      case CurrencyType.FIAT:
        nobaQuote = await this.getQuoteForSpecifiedFiatAmount({
          cryptoCurrency: request.cryptoCurrency,
          fiatAmount: Utils.roundToSpecifiedDecimalNumber(request.fiatAmount, fiatCurrency.precision),
          fiatCurrency: request.fiatCurrency,
          discount: {
            fixedCreditCardFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
            networkFeeDiscountPercent: request.discount.networkFeeDiscountPercent,
            nobaFeeDiscountPercent: request.discount.nobaFeeDiscountPercent,
            nobaSpreadDiscountPercent: request.discount.nobaSpreadDiscountPercent,
            processingFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
          },
        });
        break;

      case CurrencyType.CRYPTO:
        nobaQuote = await this.getQuoteForSpecifiedCryptoQuantity({
          cryptoCurrency: request.cryptoCurrency,
          cryptoQuantity: Utils.roundToSpecifiedDecimalNumber(request.cryptoQuantity, cryptocurrency.precision),
          fiatCurrency: request.fiatCurrency,
          discount: {
            fixedCreditCardFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
            networkFeeDiscountPercent: request.discount.networkFeeDiscountPercent,
            nobaFeeDiscountPercent: request.discount.nobaFeeDiscountPercent,
            nobaSpreadDiscountPercent: request.discount.nobaSpreadDiscountPercent,
            processingFeeDiscountPercent: request.discount.processingFeeDiscountPercent,
          },
        });
        break;

      default:
        throw new BadRequestException(`Unknown 'fixedSide' of the transaction: '${request.fixedSide}'`);
    }

    // TODO(#): Slippage calculations.

    const executedQuote: ZerohashExecutedQuote = await this.zerohashService.executeQuote(nobaQuote.quote.quoteID);
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

  async getConsumerAccountBalance(participantID: string): Promise<ConsumerAccountBalance[]> {
    const zhBalances = await this.zerohashService.getParticipantBalance(participantID);

    const consumerAccountBalances: ConsumerAccountBalance[] = [];
    zhBalances.forEach(balance => {
      consumerAccountBalances.push({
        name: balance.accountLabel,
        asset: balance.asset,
        accountID: balance.accountID,
        lastUpdate: balance.lastUpdate,
        balance: balance.balance,
        accountType: balance.accountType,
      });
    });
    return consumerAccountBalances;
  }

  // TODO(#): Make this implementation idempotent.
  async transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<ConsumerWalletTransferResponse> {
    try {
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
    } catch (e) {
      console.log(JSON.stringify(e));
      throw new TransactionSubmissionException(
        TransactionSubmissionFailureExceptionText.INVALID_WALLET,
        "Wallet address is invalid",
        JSON.stringify(e),
      );
    }
  }

  protected async getLiquidityProviderWithdrawal(id: any): Promise<ZerohashWithdrawalResponse> {
    return this.zerohashService.getWithdrawal(id);
  }
}
