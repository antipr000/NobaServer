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
  DiscountedAmount,
  NonDiscountedNobaQuote,
  CombinedNobaQuote,
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
import { getDiscountedAmount } from "./AssetServiceHelper";

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

  async getQuoteForSpecifiedFiatAmount(request: QuoteRequestForFixedFiat): Promise<CombinedNobaQuote> {
    // TODO(#): Remove this once all the clients are aware about "discount"
    if (request.discount === undefined || request.discount === null) request.discount = {} as any;

    const nobaSpreadPercent = getDiscountedAmount(
      this.nobaTransactionConfigs.spreadPercentage,
      request.discount.nobaSpreadDiscountPercent,
    );
    const nobaFlatFeeInFiat = getDiscountedAmount(
      this.nobaTransactionConfigs.flatFeeDollars,
      request.discount.nobaFeeDiscountPercent,
    );
    const creditCardFeePercent = getDiscountedAmount(
      this.nobaTransactionConfigs.dynamicCreditCardFeePercentage,
      request.discount.processingFeeDiscountPercent,
    );
    const fixedCreditCardFeeInFiat = getDiscountedAmount(
      this.nobaTransactionConfigs.fixedCreditCardFee,
      request.discount.fixedCreditCardFeeDiscountPercent,
    );

    // Get network / gas fees
    const networkFeeEstimate: ZerohashNetworkFee = await this.getNetworkFeeFromLiquidityProvider(
      request.cryptoCurrency,
      request.fiatCurrency,
    );

    const networkFee = getDiscountedAmount(networkFeeEstimate.feeInFiat, request.discount.networkFeeDiscountPercent);

    const totalCreditCardFeeInFiat: DiscountedAmount = {
      value: Utils.roundTo2DecimalNumber(
        request.fiatAmount * creditCardFeePercent.value + fixedCreditCardFeeInFiat.value,
      ),
      discountedValue: Utils.roundTo2DecimalNumber(
        request.fiatAmount * creditCardFeePercent.discountedValue + fixedCreditCardFeeInFiat.discountedValue,
      ),
    };

    const totalFee: DiscountedAmount = {
      value: networkFee.value + totalCreditCardFeeInFiat.value + nobaFlatFeeInFiat.value,
      discountedValue:
        networkFee.discountedValue + totalCreditCardFeeInFiat.discountedValue + nobaFlatFeeInFiat.discountedValue,
    };

    const fiatAmountAfterAllChargesWithoutSpread: DiscountedAmount = {
      value: request.fiatAmount - totalFee.value,
      discountedValue: request.fiatAmount - totalFee.discountedValue,
    };

    const fiatAmountAfterAllChargesWithSpread: DiscountedAmount = {
      value: Utils.roundTo2DecimalNumber(fiatAmountAfterAllChargesWithoutSpread.value / (1 + nobaSpreadPercent.value)),
      discountedValue: Utils.roundTo2DecimalNumber(
        fiatAmountAfterAllChargesWithoutSpread.discountedValue / (1 + nobaSpreadPercent.discountedValue),
      ),
    };

    // For Fiat fixed, the total amount the customer will ever pay is the amount they entered.
    // So we SUBTRACT fees from that amount and quote how much crypto we can buy with that REDUCED amount of fiat (fiatAmountAfterAllChargesWithSpread).
    // This amount that we quote is how much Noba ends up paying for the crypto, whereas the customer pays Noba
    // the full amount requested. Noba's gross profit is the difference between these two values.
    const zhQuoteWithDiscount: ZerohashQuote = await this.getQuoteFromLiquidityProviderFiatFixed(
      request.cryptoCurrency,
      request.fiatCurrency,
      fiatAmountAfterAllChargesWithSpread.discountedValue,
    );

    const perUnitCryptoCostWithoutSpread: DiscountedAmount = {
      // Intentionally using the same zhQuote for both because the non-discounted value really doesn't matter for anything
      value: zhQuoteWithDiscount.perUnitCryptoAssetCost,
      discountedValue: zhQuoteWithDiscount.perUnitCryptoAssetCost,
    };

    const perUnitCryptoCostWithSpread: DiscountedAmount = {
      value: perUnitCryptoCostWithoutSpread.value * (1 + nobaSpreadPercent.value),
      discountedValue: perUnitCryptoCostWithoutSpread.discountedValue * (1 + nobaSpreadPercent.discountedValue),
    };

    const discountedTotalCryptoQuantity: number = await this.roundToProperDecimalsForCryptocurrency(
      request.cryptoCurrency,
      fiatAmountAfterAllChargesWithSpread.discountedValue / perUnitCryptoCostWithoutSpread.discountedValue,
    );
    const nonDiscountedtotalCryptoQuantity: number = await this.roundToProperDecimalsForCryptocurrency(
      request.cryptoCurrency,
      fiatAmountAfterAllChargesWithSpread.value / perUnitCryptoCostWithoutSpread.value,
    );

    const nonDiscountedNobaQuote: NonDiscountedNobaQuote = {
      fiatCurrency: request.fiatCurrency,
      networkFeeInFiat: networkFee.value,
      nobaFeeInFiat: nobaFlatFeeInFiat.value,
      processingFeeInFiat: totalCreditCardFeeInFiat.value,
      amountPreSpread: fiatAmountAfterAllChargesWithoutSpread.value,
      quotedFiatAmount: fiatAmountAfterAllChargesWithSpread.value,
      totalFiatAmount: Utils.roundTo2DecimalNumber(request.fiatAmount),
      perUnitCryptoPriceWithSpread: Utils.roundTo2DecimalNumber(perUnitCryptoCostWithSpread.value),
      perUnitCryptoPriceWithoutSpread: Utils.roundTo2DecimalNumber(perUnitCryptoCostWithoutSpread.value),
    };

    const discountedNobaQuote: NobaQuote = {
      cryptoCurrency: request.cryptoCurrency,
      fiatCurrency: request.fiatCurrency,
      networkFeeInFiat: networkFee.discountedValue,
      nobaFeeInFiat: nobaFlatFeeInFiat.discountedValue,
      processingFeeInFiat: totalCreditCardFeeInFiat.discountedValue,
      amountPreSpread: fiatAmountAfterAllChargesWithoutSpread.discountedValue,
      totalCryptoQuantity: discountedTotalCryptoQuantity,
      quotedFiatAmount: fiatAmountAfterAllChargesWithSpread.discountedValue,
      totalFiatAmount: Utils.roundTo2DecimalNumber(request.fiatAmount),
      perUnitCryptoPriceWithSpread: Utils.roundTo2DecimalNumber(perUnitCryptoCostWithSpread.discountedValue),
      perUnitCryptoPriceWithoutSpread: Utils.roundTo2DecimalNumber(perUnitCryptoCostWithoutSpread.discountedValue),
      quoteID: zhQuoteWithDiscount.quoteID,
    };

    this.logger.debug(`
      FIAT FIXED (${request.fiatCurrency}):\t\t${request.fiatAmount}
      NETWORK FEE (${request.fiatCurrency}):\t${networkFee.value}
      PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat.value}
      NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat.value}
      PRE-SPREAD (${request.fiatCurrency}):\t\t${fiatAmountAfterAllChargesWithoutSpread.value}
      QUOTE PRICE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithSpread.value}
      ESTIMATED CRYPTO (${request.cryptoCurrency}):\t${nonDiscountedtotalCryptoQuantity}
      SPREAD REVENUE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithoutSpread.value - fiatAmountAfterAllChargesWithSpread.value
      }
      ZERO HASH FEE (${request.fiatCurrency}):\t${request.fiatAmount * 0.007}
      NOBA REVENUE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithoutSpread.value -
      fiatAmountAfterAllChargesWithSpread.value +
      nobaFlatFeeInFiat.value -
      request.fiatAmount * 0.007
      }
    `);

    this.logger.debug(`
    FIAT FIXED (${request.fiatCurrency}):\t\t${request.fiatAmount}
    NETWORK FEE (${request.fiatCurrency}):\t${networkFee.discountedValue}
    PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat.discountedValue}
    NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat.discountedValue}
    PRE-SPREAD (${request.fiatCurrency}):\t\t${fiatAmountAfterAllChargesWithoutSpread.discountedValue}
    QUOTE PRICE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithSpread.discountedValue}
    ESTIMATED CRYPTO (${request.cryptoCurrency}):\t${discountedTotalCryptoQuantity}
    SPREAD REVENUE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithoutSpread.discountedValue - fiatAmountAfterAllChargesWithSpread.discountedValue
      }
    ZERO HASH FEE (${request.fiatCurrency}):\t${request.fiatAmount * 0.007}
    NOBA REVENUE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesWithoutSpread.discountedValue -
      fiatAmountAfterAllChargesWithSpread.discountedValue +
      nobaFlatFeeInFiat.discountedValue -
      request.fiatAmount * 0.007
      }
  `);

    return {
      quote: discountedNobaQuote,
      nonDiscountedQuote: nonDiscountedNobaQuote,
      discountsGiven: {
        networkFeeDiscount: (networkFee.value - networkFee.discountedValue),
        nobaFeeDiscount: (nobaFlatFeeInFiat.value - nobaFlatFeeInFiat.discountedValue),
        // dynamic credit card fees.
        processingFeeDiscount: ((totalCreditCardFeeInFiat.value - fixedCreditCardFeeInFiat.value) - (totalCreditCardFeeInFiat.discountedValue - fixedCreditCardFeeInFiat.discountedValue)),
        // fixed credit card fees.
        creditCardFeeDiscount: fixedCreditCardFeeInFiat.value - fixedCreditCardFeeInFiat.discountedValue,
        spreadDiscount: (fiatAmountAfterAllChargesWithoutSpread.value - fiatAmountAfterAllChargesWithSpread.value) - (fiatAmountAfterAllChargesWithoutSpread.discountedValue - fiatAmountAfterAllChargesWithSpread.discountedValue),
      },
    };
  }

  async roundToProperDecimalsForCryptocurrency(cryptocurrency: string, cryptoAmount: number): Promise<number> {
    const currencyDTO = await this.currencyService.getCryptocurrency(cryptocurrency);
    if (currencyDTO == null) {
      throw new Error(`Unknown cryptocurrency: ${cryptocurrency}`);
    }
    return Utils.roundToSpecifiedDecimalNumber(cryptoAmount, currencyDTO.precision);
  }

  async getQuoteForSpecifiedCryptoQuantity(request: QuoteRequestForFixedCrypto): Promise<CombinedNobaQuote> {
    // const nobaSpreadPercent = this.nobaTransactionConfigs.spreadPercentage;
    // const nobaFlatFeeInFiat = this.nobaTransactionConfigs.flatFeeDollars;
    // const creditCardFeePercent = this.nobaTransactionConfigs.dynamicCreditCardFeePercentage;
    // const fixedCreditCardFeeInFiat = this.nobaTransactionConfigs.fixedCreditCardFee;

    // TODO(#): Remove this once all the clients are aware about "discount"
    if (request.discount === undefined || request.discount === null) request.discount = {} as any;

    const nobaSpreadPercent = getDiscountedAmount(
      this.nobaTransactionConfigs.spreadPercentage,
      request.discount.nobaSpreadDiscountPercent,
    );
    const nobaFlatFeeInFiat = getDiscountedAmount(
      this.nobaTransactionConfigs.flatFeeDollars,
      request.discount.nobaFeeDiscountPercent,
    );
    const dynamicCreditCardFeePercent = getDiscountedAmount(
      this.nobaTransactionConfigs.dynamicCreditCardFeePercentage,
      request.discount.processingFeeDiscountPercent,
    );
    const fixedCreditCardFeeInFiat = getDiscountedAmount(
      this.nobaTransactionConfigs.fixedCreditCardFee,
      request.discount.fixedCreditCardFeeDiscountPercent,
    );

    // Get network / gas fees
    const networkFeeEstimate: ZerohashNetworkFee = await this.getNetworkFeeFromLiquidityProvider(
      request.cryptoCurrency,
      request.fiatCurrency,
    );
    const networkFee: DiscountedAmount = getDiscountedAmount(
      networkFeeEstimate.feeInFiat,
      request.discount.networkFeeDiscountPercent,
    );

    const zhQuote: ZerohashQuote = await this.getQuoteFromLiquidityProviderCryptoFixed(
      request.cryptoCurrency,
      request.fiatCurrency,
      request.cryptoQuantity,
    );

    const perUnitCryptoCostWithoutSpread: number = zhQuote.perUnitCryptoAssetCost;
    const perUnitCryptoCostWithSpread: DiscountedAmount = {
      discountedValue: perUnitCryptoCostWithoutSpread * (1 + nobaSpreadPercent.discountedValue),
      value: perUnitCryptoCostWithoutSpread * (1 + nobaSpreadPercent.value),
    };

    const rawFiatAmountForRequestedCryptoPostSpread: DiscountedAmount = {
      value: request.cryptoQuantity * perUnitCryptoCostWithSpread.value,
      discountedValue: request.cryptoQuantity * perUnitCryptoCostWithSpread.discountedValue,
    };

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
    const fiatAmountAfterAllChargesExceptCreditCard: DiscountedAmount = {
      // This covers "Spread", "Network Fee", "Noba Flat Fee"
      value: rawFiatAmountForRequestedCryptoPostSpread.value + nobaFlatFeeInFiat.value + networkFee.value,
      discountedValue: rawFiatAmountForRequestedCryptoPostSpread.discountedValue + nobaFlatFeeInFiat.discountedValue + networkFee.discountedValue,
    };
    const finalFiatAmount: number =
      (fiatAmountAfterAllChargesExceptCreditCard.value + fixedCreditCardFeeInFiat.value) /
      (1 - dynamicCreditCardFeePercent.value);

    const totalCreditCardFeeInFiat: number = finalFiatAmount - fiatAmountAfterAllChargesExceptCreditCard.value;
    const dynamicCreditCardFeeInFiat: DiscountedAmount = {
      value: finalFiatAmount * dynamicCreditCardFeePercent.value,
      discountedValue: finalFiatAmount * dynamicCreditCardFeePercent.discountedValue,
    };

    const quotedFiatAmount: DiscountedAmount = {
      value: finalFiatAmount,
      discountedValue: (dynamicCreditCardFeeInFiat.discountedValue + fixedCreditCardFeeInFiat.discountedValue) + fiatAmountAfterAllChargesExceptCreditCard.discountedValue,
    };

    this.logger.debug(`
    ORIGINAL VALUE - 
      CRYPTO FIXED (${request.cryptoCurrency}):\t${request.cryptoQuantity}
      POST-SPREAD (${request.fiatCurrency}):\t${rawFiatAmountForRequestedCryptoPostSpread}
      NETWORK FEE (${request.fiatCurrency}):\t${networkFee.value}
      NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat}
      COST BEFORE CC FEE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesExceptCreditCard}
      CREDIT CARD CHARGE (${request.fiatCurrency}):\t${finalFiatAmount}
      PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat}
      NOBA COST (${request.fiatCurrency}):\t\t${perUnitCryptoCostWithSpread.value * request.cryptoQuantity}
      ZERO HASH FEE (${request.fiatCurrency}):\t${finalFiatAmount * 0.007}
      NOBA REVENUE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat.value +
      (rawFiatAmountForRequestedCryptoPostSpread.value - perUnitCryptoCostWithoutSpread * request.cryptoQuantity) -
      finalFiatAmount * 0.007
      }
      `);

    this.logger.debug(`
    DISCOUNTED VALUE - 
      CRYPTO FIXED (${request.cryptoCurrency}):\t${request.cryptoQuantity}
      POST-SPREAD (${request.fiatCurrency}):\t${rawFiatAmountForRequestedCryptoPostSpread}
      NETWORK FEE (${request.fiatCurrency}):\t${networkFee.discountedValue}
      NOBA FLAT FEE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat}
      COST BEFORE CC FEE (${request.fiatCurrency}):\t${fiatAmountAfterAllChargesExceptCreditCard}
      CREDIT CARD CHARGE (${request.fiatCurrency}):\t${finalFiatAmount}
      PROCESSING FEES (${request.fiatCurrency}):\t${totalCreditCardFeeInFiat}
      NOBA COST (${request.fiatCurrency}):\t\t${perUnitCryptoCostWithSpread.discountedValue * request.cryptoQuantity}
      ZERO HASH FEE (${request.fiatCurrency}):\t${quotedFiatAmount.discountedValue * 0.007}
      NOBA REVENUE (${request.fiatCurrency}):\t${nobaFlatFeeInFiat.discountedValue +
      (rawFiatAmountForRequestedCryptoPostSpread.discountedValue -
        perUnitCryptoCostWithoutSpread * request.cryptoQuantity) -
      quotedFiatAmount.discountedValue * 0.007
      }
      `);

    const result: CombinedNobaQuote = {
      quote: {
        cryptoCurrency: request.cryptoCurrency,
        fiatCurrency: request.fiatCurrency,
        networkFeeInFiat: networkFee.discountedValue,
        nobaFeeInFiat: nobaFlatFeeInFiat.discountedValue,
        processingFeeInFiat: dynamicCreditCardFeeInFiat.discountedValue + fixedCreditCardFeeInFiat.discountedValue,
        amountPreSpread: request.cryptoQuantity * perUnitCryptoCostWithoutSpread,
        totalCryptoQuantity: request.cryptoQuantity,
        quotedFiatAmount: rawFiatAmountForRequestedCryptoPostSpread.discountedValue,
        totalFiatAmount: quotedFiatAmount.discountedValue,
        perUnitCryptoPriceWithSpread: perUnitCryptoCostWithSpread.discountedValue,
        perUnitCryptoPriceWithoutSpread: perUnitCryptoCostWithoutSpread,
        quoteID: zhQuote.quoteID,
      },
      nonDiscountedQuote: {
        fiatCurrency: request.fiatCurrency,
        networkFeeInFiat: networkFee.value,
        nobaFeeInFiat: nobaFlatFeeInFiat.value,
        processingFeeInFiat: dynamicCreditCardFeeInFiat.value + fixedCreditCardFeeInFiat.value,
        amountPreSpread: request.cryptoQuantity * perUnitCryptoCostWithoutSpread,
        quotedFiatAmount: rawFiatAmountForRequestedCryptoPostSpread.value,
        totalFiatAmount: quotedFiatAmount.value,
        perUnitCryptoPriceWithSpread: perUnitCryptoCostWithSpread.value,
        perUnitCryptoPriceWithoutSpread: perUnitCryptoCostWithoutSpread,
      },
      discountsGiven: {
        networkFeeDiscount: (networkFee.value - networkFee.discountedValue),
        nobaFeeDiscount: (nobaFlatFeeInFiat.value - nobaFlatFeeInFiat.discountedValue),
        // dynamic credit card fees.
        processingFeeDiscount: (dynamicCreditCardFeeInFiat.value - dynamicCreditCardFeeInFiat.discountedValue),
        // fixed credit card fees.
        creditCardFeeDiscount: fixedCreditCardFeeInFiat.value - fixedCreditCardFeeInFiat.discountedValue,
        spreadDiscount: (perUnitCryptoCostWithSpread.value - perUnitCryptoCostWithSpread.discountedValue) * request.cryptoQuantity,
      },
    };

    const fiatFieldsOfQuoteForTwoPlaceRounding = [
      "networkFeeInFiat",
      "nobaFeeInFiat",
      "processingFeeInFiat",
      "quotedFiatAmount",
      "totalFiatAmount",
      "perUnitCryptoPriceWithSpread",
      "perUnitCryptoPriceWithoutSpread",
    ];
    fiatFieldsOfQuoteForTwoPlaceRounding.forEach(field => {
      result.quote[field] = Utils.roundTo2DecimalNumber(result.quote[field]);
      result.nonDiscountedQuote[field] = Utils.roundTo2DecimalNumber(result.nonDiscountedQuote[field]);
    });

    const fiatFieldsOfDiscounts = [
      "networkFeeDiscount",
      "nobaFeeDiscount",
      "processingFeeDiscount",
      "creditCardFeeDiscount",
      "spreadDiscount",
    ];
    fiatFieldsOfDiscounts.forEach(field => {
      result.discountsGiven[field] = Utils.roundTo2DecimalNumber(result.discountsGiven[field]);
    });

    return result;
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
