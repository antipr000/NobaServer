import { Injectable } from "@nestjs/common";
import { Logger } from "winston";
import {
  ExecuteQuoteRequest,
  ConsumerAccountTransferRequest,
  ConsumerWalletTransferRequest,
  FundsAvailabilityStatus,
  FundsAvailabilityResponse,
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferStatus,
  NobaQuote,
  QuoteRequestForFixedCrypto,
  QuoteRequestForFixedFiat,
  ExecutedQuote,
  FundsAvailabilityRequest,
  ExecutedQuoteStatus,
  PollStatus,
  ConsumerWalletTransferResponse,
} from "../domain/AssetTypes";
import { AssetService } from "./asset.service";
import {
  OnChainState,
  TradeState,
  WithdrawalState,
  ZerohashNetworkFee,
  ZerohashQuote,
  ZerohashTradeResponse,
  ZerohashTransfer,
  ZerohashTransferStatus,
  ZerohashWithdrawalResponse,
} from "../domain/ZerohashTypes";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { NobaConfigs, NobaTransactionConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { Utils } from "../../../core/utils/Utils";
import { CurrencyService } from "../../../modules/common/currency.service";

@Injectable()
export abstract class DefaultAssetService implements AssetService {
  protected readonly nobaTransactionConfigs: NobaTransactionConfigs;
  constructor(
    protected readonly currencyService: CurrencyService,
    protected readonly logger: Logger,
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
    const networkFee: ZerohashNetworkFee = await this.getNetworkFeeFromLiquidityProvider(
      request.cryptoCurrency,
      request.fiatCurrency,
    );

    const totalCreditCardFeeInFiat: number = Utils.roundTo2DecimalNumber(
      request.fiatAmount * creditCardFeePercent + fixedCreditCardFeeInFiat,
    );
    const totalFee: number = networkFee.feeInFiat + totalCreditCardFeeInFiat + nobaFlatFeeInFiat;

    const fiatAmountAfterAllChargesWithoutSpread: number = request.fiatAmount - totalFee;
    const fiatAmountAfterAllChargesWithSpread: number =
      fiatAmountAfterAllChargesWithoutSpread / (1 + nobaSpreadPercent);

    const zhQuote: ZerohashQuote = await this.getQuoteFromLiquidityProviderFiatFixed(
      request.cryptoCurrency,
      request.fiatCurrency,
      fiatAmountAfterAllChargesWithSpread,
    );

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

    return {
      cryptoCurrency: request.cryptoCurrency,
      fiatCurrency: request.fiatCurrency,
      networkFeeInFiat: networkFee.feeInFiat,
      nobaFeeInFiat: nobaFlatFeeInFiat,
      processingFeeInFiat: totalCreditCardFeeInFiat,
      amountPreSpread: fiatAmountAfterAllChargesWithoutSpread,
      totalCryptoQuantity: fiatAmountAfterAllChargesWithSpread / perUnitCryptoCostWithoutSpread,
      totalFiatAmount: Utils.roundTo2DecimalNumber(request.fiatAmount),
      perUnitCryptoPriceWithSpread: perUnitCryptoCostWithSpread,
      perUnitCryptoPriceWithoutSpread: perUnitCryptoCostWithoutSpread,
      quoteID: zhQuote.quoteID,
    };
  }

  async getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<NobaQuote> {
    const nobaSpreadPercent = this.nobaTransactionConfigs.spreadPercentage;
    const nobaFlatFeeInFiat = this.nobaTransactionConfigs.flatFeeDollars;
    const creditCardFeePercent = this.nobaTransactionConfigs.dynamicCreditCardFeePercentage;
    const fixedCreditCardFeeInFiat = this.nobaTransactionConfigs.fixedCreditCardFee;

    // Get network / gas fees
    const networkFee: ZerohashNetworkFee = await this.getNetworkFeeFromLiquidityProvider(
      request.cryptoCurrency,
      request.fiatCurrency,
    );

    const zhQuote: ZerohashQuote = await this.getQuoteFromLiquidityProviderCryptoFixed(
      request.cryptoCurrency,
      request.fiatCurrency,
      request.cryptoQuantity,
    );

    const perUnitCryptoCostWithoutSpread: number = zhQuote.perUnitCryptoAssetCost;
    const perUnitCryptoCostWithSpread: number = perUnitCryptoCostWithoutSpread * (1 + nobaSpreadPercent);

    const rawFiatAmountForRequestedCryptoPreSpread = request.cryptoQuantity * perUnitCryptoCostWithSpread;

    /**
     * Credit card charges are applied on the actual amount deducted on fiat side.
     *
     * `rawFiatAmountForRequestedCryptoPostSpread` denotes the amount which Noba is incurring
     * but on top of this there will be "nobaFee", "networkFee" & "creditCardFee".
     *
     * As mentioned above, credit card charges will be applied on amount deducted (let's say X).
     *
     * X = [(X * creditCardFeePercentage) + nobaFlatFeeInFiat + networkFeeInFiat] + rawFiatAmountForRequestedCryptoPostSpread
     * => X = (....) / (1 - creditCardFeePercentage)
     */
    const fiatAmountAfterAllChargesExceptCreditCard =
      rawFiatAmountForRequestedCryptoPreSpread + nobaFlatFeeInFiat + networkFee.feeInFiat;
    const finalFiatAmount =
      (fiatAmountAfterAllChargesExceptCreditCard + fixedCreditCardFeeInFiat) / (1 - creditCardFeePercent);

    const totalCreditCardFeeInFiat = Utils.roundTo2DecimalNumber(
      finalFiatAmount - fiatAmountAfterAllChargesExceptCreditCard,
    );

    this.logger.debug(`
      CRYPTO FIXED (${request.cryptoCurrency}):\t${request.cryptoQuantity}
      POST-SPREAD (${request.fiatCurrency}):\t${rawFiatAmountForRequestedCryptoPreSpread}
      NETWORK FEE (${request.fiatCurrency}):\t${networkFee.feeInFiat}
      NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat}
      COST BEFORE CC FEE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesExceptCreditCard}
      CREDIT CARD CHARGE (${request.fiatCurrency}):\t${finalFiatAmount}
      PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat}
      NOBA COST (${request.fiatCurrency}):\t\t${perUnitCryptoCostWithSpread * request.cryptoQuantity}
      ZERO HASH FEE (${request.fiatCurrency}):\t${finalFiatAmount * 0.007}
      NOBA REVENUE (${request.fiatCurrency}):\t${
      nobaFlatFeeInFiat +
      (rawFiatAmountForRequestedCryptoPreSpread - perUnitCryptoCostWithoutSpread * request.cryptoQuantity) -
      finalFiatAmount * 0.007
    }
      `);

    return {
      cryptoCurrency: request.cryptoCurrency,
      fiatCurrency: request.fiatCurrency,
      networkFeeInFiat: networkFee.feeInFiat,
      nobaFeeInFiat: nobaFlatFeeInFiat,
      processingFeeInFiat: totalCreditCardFeeInFiat,
      amountPreSpread: rawFiatAmountForRequestedCryptoPreSpread,
      totalCryptoQuantity: request.cryptoQuantity,
      totalFiatAmount: Utils.roundTo2DecimalNumber(finalFiatAmount),
      perUnitCryptoPriceWithSpread: perUnitCryptoCostWithSpread,
      perUnitCryptoPriceWithoutSpread: perUnitCryptoCostWithoutSpread,
      quoteID: zhQuote.quoteID,
    };
  }

  abstract executeQuoteForFundsAvailability(request: ExecuteQuoteRequest): Promise<ExecutedQuote>;

  async pollExecuteQuoteForFundsAvailabilityStatus(id: string): Promise<ExecutedQuoteStatus> {
    const tradeResponse: ZerohashTradeResponse = await this.getLiquidityProviderTradeStatus(id);
    try {
      switch (tradeResponse.tradeState) {
        case TradeState.PENDING:
          return {
            status: PollStatus.PENDING,
            errorMessage: null,
            settledTimestamp: null,
          };

        case TradeState.SETTLED:
          return {
            status: PollStatus.SUCCESS,
            settledTimestamp: tradeResponse.settledTimestamp,
            errorMessage: null,
          };

        case TradeState.DEFAULTED:
          return {
            status: PollStatus.FAILURE,
            errorMessage: tradeResponse.errorMessage,
            settledTimestamp: null,
          };
      }
    } catch (err) {
      return {
        status: PollStatus.FATAL_ERROR,
        errorMessage: JSON.stringify(err),
        settledTimestamp: null,
      };
    }
  }

  abstract makeFundsAvailable(request: FundsAvailabilityRequest): Promise<FundsAvailabilityResponse>;

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
      const zhTransfer: ZerohashTransfer = await this.getLiquidityProviderTransfer(id);

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

  abstract transferAssetToConsumerAccount(request: ConsumerAccountTransferRequest): Promise<string>;

  async pollAssetTransferToConsumerStatus(id: string): Promise<ConsumerAccountTransferStatus> {
    try {
      const tradeResponse: ZerohashTradeResponse = await this.getLiquidityProviderTradeStatus(id);

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
        errorMessage: JSON.stringify(err.message),
      };
    }
  }

  // TODO(#): Make this implementation idempotent.
  abstract transferToConsumerWallet(request: ConsumerWalletTransferRequest): Promise<ConsumerWalletTransferResponse>;

  async pollConsumerWalletTransferStatus(id: string): Promise<ConsumerWalletTransferStatus> {
    try {
      const withdrawalResponse: ZerohashWithdrawalResponse = await this.getLiquidityProviderWithdrawal(id);

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
            status: PollStatus.RETRYABLE_FAILURE,
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
                errorMessage: "Transaction failed to settled on the blockchain",
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
        errorMessage: `Error checking status of withdrawal '${id}'`,
        requestedAmount: null,
        settledAmount: null,
        onChainTransactionID: null,
      };
    }
  }

  protected abstract getNetworkFeeFromLiquidityProvider(
    cryptoCurrency: string,
    fiatCurrency: string,
  ): Promise<ZerohashNetworkFee>;

  protected abstract getQuoteFromLiquidityProviderFiatFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    fiatAmount: number,
  ): Promise<ZerohashQuote>;

  protected abstract getQuoteFromLiquidityProviderCryptoFixed(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoQuantity: number,
  ): Promise<ZerohashQuote>;

  protected abstract getLiquidityProviderTradeStatus(id: string): Promise<ZerohashTradeResponse>;

  protected abstract getLiquidityProviderTransfer(id): Promise<ZerohashTransfer>;

  protected abstract getLiquidityProviderWithdrawal(id): Promise<ZerohashWithdrawalResponse>;

  getIntermediaryLeg(): string {
    throw new Error("Method not defined");
  }

  needsIntermediaryLeg(): boolean {
    return false;
  }
}
