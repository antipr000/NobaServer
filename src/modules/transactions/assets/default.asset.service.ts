import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import { AppService } from "../../../app.service";
import {
  FundsAvailabilityRequest,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityStatus,
  PollStatus,
  FundsAvailabilityResponse,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferStatus,
  NobaQuote,
  QuoteRequestForFixedCrypto,
  QuoteRequestForFixedFiat,
} from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";
import { ZeroHashService } from "../zerohash.service";
import { AssetService } from "./asset.service";
import { CurrencyType } from "../../common/domain/Types";
import {
  ExecutedQuote,
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeResponse,
  ZerohashTradeRquest,
  ZerohashTransfer,
  ZerohashTransferStatus,
  ZerohashWithdrawalResponse,
} from "../domain/ZerohashTypes";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { NobaConfigs, NobaTransactionConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";

@Injectable()
export class DefaultAssetService implements AssetService {
  private readonly nobaTransactionConfigs: NobaTransactionConfigs;

  constructor(
    private readonly appService: AppService,
    private readonly zerohashService: ZeroHashService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    configService: CustomConfigService,
  ) {
    this.nobaTransactionConfigs = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction;
  }

  async getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<NobaQuote> {
    const nobaSpreadPercent = this.nobaTransactionConfigs.spreadPercentage;
    const nobaFlatFeeInFiat = this.nobaTransactionConfigs.flatFeeDollars;
    const creditCardFeePercent = this.nobaTransactionConfigs.dynamicCreditCardFeePercentage;
    const fixedCreditCardFeeInFiat = this.nobaTransactionConfigs.fixedCreditCardFee;

    // Get network / gas fees
    const networkFee: ZerohashNetworkFee = await this.zerohashService.estimateNetworkFee(
      request.cryptoCurrency,
      request.fiatCurrency,
    );
    this.logger.debug(networkFee);

    // TODO(#306): It says percentage, but not actually calculating percentage.
    const totalCreditCardFeeInFiat: number = request.fiatAmount * creditCardFeePercent + fixedCreditCardFeeInFiat;
    const totalFee: number = networkFee.feeInFiat + totalCreditCardFeeInFiat + nobaFlatFeeInFiat;

    const fiatAmountAfterAllChargesWithoutSpread: number = request.fiatAmount - totalFee;
    const fiatAmountAfterAllChargesWithSpread: number =
      fiatAmountAfterAllChargesWithoutSpread / (1 + nobaSpreadPercent);

    console.log(
      nobaSpreadPercent,
      fiatAmountAfterAllChargesWithSpread,
      fiatAmountAfterAllChargesWithoutSpread,
      request,
      networkFee,
    );

    const zhQuote: ZerohashQuote = await this.zerohashService.requestQuoteForFixedFiatCurrency(
      request.cryptoCurrency,
      request.fiatCurrency,
      fiatAmountAfterAllChargesWithSpread,
    );
    this.logger.debug(zhQuote);

    const perUnitCryptoCostWithoutSpread: number = zhQuote.perUnitCryptoAssetCost;
    const perUnitCryptoCostWithSpread: number = perUnitCryptoCostWithoutSpread * (1 + nobaSpreadPercent);

    this.logger.debug(`
      FIAT FIXED (${request.fiatCurrency}):\t\t${request.fiatAmount}
      NETWORK FEE (${request.fiatCurrency}):\t${networkFee.feeInFiat}
      PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat}
      NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat}
      PRE-SPREAD (${request.fiatCurrency}):\t\t${fiatAmountAfterAllChargesWithoutSpread}
      QUOTE PRICE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithSpread}      
      ESTIMATED CRYPTO (${request.cryptoCurrency}):\t${
      fiatAmountAfterAllChargesWithSpread / perUnitCryptoCostWithoutSpread
    }
      SPREAD REVENUE (${request.fiatCurrency}):\t${
      fiatAmountAfterAllChargesWithoutSpread - fiatAmountAfterAllChargesWithSpread
    }
      ZERO HASH FEE (${request.fiatCurrency}):\t${request.fiatAmount * 0.007}
      NOBA REVENUE (${request.fiatCurrency}):\t${
      fiatAmountAfterAllChargesWithoutSpread -
      fiatAmountAfterAllChargesWithSpread +
      nobaFlatFeeInFiat -
      request.fiatAmount * 0.007
    }
    `);

    // const transactionQuote: TransactionQuoteDTO = {
    //   quotedAmount: fiatAmountAfterAllChargesWithSpread / perUnitCryptoCostWithoutSpread,
    //   exchangeRate: perUnitCryptoCostWithSpread,
    // };
    return {
      cryptoCurrency: request.cryptoCurrency,
      fiatCurrency: request.fiatCurrency,
      networkFeeInFiat: networkFee.feeInFiat,
      nobaFeeInFiat: nobaFlatFeeInFiat,
      processingFeeInFiat: totalCreditCardFeeInFiat,

      totalCryptoQuantity: fiatAmountAfterAllChargesWithSpread / perUnitCryptoCostWithoutSpread,
      totalFiatAmount: request.fiatAmount,
      perUnitCryptoPrice: perUnitCryptoCostWithSpread,
      quoteID: zhQuote.quoteID,
    };
  }

  async getQuoteByForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote> {
    throw new Error("Method not implemented.");
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
  async makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse> {
    const supportedCryptocurrencies = await this.appService.getSupportedCryptocurrencies();
    if (supportedCryptocurrencies.filter(curr => curr.ticker === request.cryptoCurrency).length == 0) {
      throw new BadRequestError({
        messageForClient: `Unsupported cryptocurrency: ${request.cryptoCurrency}`,
      });
    }

    const supportedFiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (supportedFiatCurrencies.filter(curr => curr.ticker === request.fiatCurrency).length == 0) {
      throw new Error(`${request.fiatCurrency} is not supported by ZHLS`);
    }

    // Snce we've already calculated fees & spread based on a true fixed side, we will always pass FIAT here
    const executedQuote: ExecutedQuote = await this.zerohashService.requestAndExecuteQuote(
      request.cryptoCurrency,
      request.fiatCurrency,
      request.fiatAmount,
      CurrencyType.FIAT,
    );

    // TODO(#) Check slippage.

    const assetTransferId: string = await this.zerohashService.transferAssetsToNoba(
      request.cryptoCurrency,
      executedQuote.cryptoReceived,
    );

    this.logger.debug(`AssetTransferId: ${assetTransferId}`);
    return {
      id: assetTransferId,
      tradePrice: executedQuote.tradePrice,
    };
  }

  /**
   * Polls the status for the funds available requests sent using `makeFundsAvailable()`.
   * This function is stateless and idempotent. Hence, can be called parallelly for same ID.
   *
   * @param id: ID returned from the `makeFundsAvailable()` function.
   * @returns
   *   - If status = SUCCESS, returns unique ID for the specific account update in 'settledId'
   *   - If status = PENDING, all other fields will be null.
   *   - If status = FAILURE, the transfer request failed because of an expected reason & can be retried.
   *   - If status = FATAL_ERROR, unexpected error, 'errorMessage' contains the reason.
   */
  async pollFundsAvailableStatus(id: string): Promise<FundsAvailabilityStatus> {
    try {
      const zhTransfer: ZerohashTransfer = await this.zerohashService.getTransfer(id);

      switch (zhTransfer.status) {
        case ZerohashTransferStatus.APPROVED:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            settledId: null,
          };

        case ZerohashTransferStatus.PENDING:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            settledId: null,
          };

        case ZerohashTransferStatus.SETTLED:
          return {
            status: PollStatus.SUCCESS,
            errorMessage: null,
            settledId: zhTransfer.movementID,
          };

        case ZerohashTransferStatus.REJECTED:
          return {
            status: PollStatus.FATAL_ERROR,
            errorMessage: `Liquidity transfer to Noba was rejected for transferId '${id}'`,
            settledId: null,
          };

        case ZerohashTransferStatus.CANCELLED:
          return {
            status: PollStatus.FAILURE,
            errorMessage: `Liquidity transfer to Noba was cancelled for transferId '${id}'`,
            settledId: null,
          };

        default:
          throw Error(`Unexpected Zerohash Transfer status: ${zhTransfer.status}`);
      }
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return {
        status: PollStatus.FATAL_ERROR,
        errorMessage: `Liquidity transfer failed for '${id}': ${err.message}`,
        settledId: null,
      };
    }
  }

  async transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string> {
    // Gets or creates participant code
    const consumerParticipantCode: string = await this.zerohashService.getParticipantCode(
      request.consumer,
      request.transactionCreationTimestamp,
    );

    // TODO(#310) Confirm that the traded values comes out correctly
    const tradeRequest: ZerohashTradeRquest = {
      boughtAssetID: request.cryptoCurrency,
      soldAssetId: request.fiatCurrency,

      tradeAmount: request.totalCryptoAmount,
      tradePrice: request.cryptoAssetTradePrice,

      buyerParticipantCode: consumerParticipantCode,
      sellerParticipantCode: this.zerohashService.getNobaPlatformCode(),

      idempotencyID: request.transactionID,
      requestorEmail: request.consumer.email,
    };
    const tradeResponse: ZerohashTradeResponse = await this.zerohashService.executeTrade(tradeRequest);

    return tradeResponse.tradeID;
  }

  async pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus> {
    const tradeResponse: ZerohashTradeResponse = await this.zerohashService.checkTradeStatus(id);

    try {
      switch (tradeResponse.tradeState) {
        case TradeState.PENDING:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
          };

        case TradeState.SETTLED:
          return {
            status: PollStatus.SUCCESS,
            errorMessage: null,
          };

        case TradeState.DEFAULTED:
          return {
            status: PollStatus.FAILURE,
            errorMessage: tradeResponse.errorMessage,
          };
      }
    } catch (err) {
      return {
        status: PollStatus.FATAL_ERROR,
        errorMessage: JSON.stringify(err),
      };
    }
  }

  // TODO(#): Make this implementation idempotent.
  async transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<string> {
    const withdrawalId: string = await this.zerohashService.requestWithdrawal(
      request.walletAddress,
      request.amount,
      request.assetId,
      request.consumer.zhParticipantCode,
      this.zerohashService.getNobaPlatformCode(),
    );

    return withdrawalId;
  }

  async pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus> {
    const withdrawalResponse: ZerohashWithdrawalResponse = await this.zerohashService.getWithdrawal(id);

    try {
      switch (withdrawalResponse.withdrawalStatus) {
        case WithdrawalState.PENDING:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            requestedAmount: null,
            settledAmount: null,
            onChainTransactionID: null,
          };

        case WithdrawalState.APPROVED:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            requestedAmount: null,
            settledAmount: null,
            onChainTransactionID: null,
          };

        // TODO(#): Check with ZH if this error can be retried.
        case WithdrawalState.REJECTED:
          return {
            status: PollStatus.FAILURE,
            errorMessage: "Withdrawal request rejected.",
            requestedAmount: null,
            settledAmount: null,
            onChainTransactionID: null,
          };

        case WithdrawalState.SETTLED:
          switch (withdrawalResponse.onChainStatus) {
            case OnChainState.PENDING:
              return {
                status: PollStatus.PENDING,
                errorMessage: null,
                requestedAmount: null,
                settledAmount: null,
                onChainTransactionID: null,
              };

            case OnChainState.CONFIRMED:
              return {
                status: PollStatus.SUCCESS,
                errorMessage: null,
                requestedAmount: withdrawalResponse.requestedAmount,
                settledAmount: withdrawalResponse.settledAmount,
                onChainTransactionID: withdrawalResponse.onChainTransactionID,
              };

            case OnChainState.ERROR:
              return {
                status: PollStatus.FAILURE,
                errorMessage: "Transaction was failed to settled on the Blockchain n/w.",
                requestedAmount: null,
                settledAmount: null,
                onChainTransactionID: null,
              };
          }
      }
    } catch (err) {
      this.logger.error(`Get withdrawal failed for ID '${id}'.`);
      this.logger.error(JSON.stringify(err));

      return {
        status: PollStatus.PENDING,
        errorMessage: null,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      };
    }
  }
}
