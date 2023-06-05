import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { NobaConfigs } from "../../../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../../../core/utils/AppConfigModule";
import { ConsumerService } from "../../../../../modules/consumer/consumer.service";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";
import { ExchangeRateDTO } from "../../../../../modules/exchangerate/dto/exchangerate.dto";
import { ExchangeRateService } from "../../../../../modules/exchangerate/exchangerate.service";
import { FeeType } from "../../../../../modules/transaction/domain/TransactionFee";
import { TransactionFlags } from "../../../../../modules/transaction/domain/TransactionFlags";
import {
  WalletDepositMode,
  WalletDepositTransactionRequest,
} from "../../../../../modules/transaction/dto/transaction.service.dto";
import { QuoteResponseDTO } from "test/api_client";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { Utils } from "../../../../../core/utils/Utils";
import { AlertKey } from "../../../../common/alerts/alert.dto";
import { AlertService } from "../../../../common/alerts/alert.service";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { TransactionQuoteProvider } from "../quote.provider";
import { TransactionPreprocessor } from "../transaction.preprocessor";

@Injectable()
export class WalletDepositProcessor implements TransactionPreprocessor, TransactionQuoteProvider {
  private depositFeeFixedAmount: number;
  private depositFeeMultiplier: number;
  private depositNobaFeeAmount: number;
  private collectionFeeFixedAmount: number;
  private collectionFeeMultiplier: number;
  private collectionNobaFeeAmount: number;

  private readonly validationKeys: KeysRequired<WalletDepositTransactionRequest> = {
    debitAmount: Joi.number().required(),
    debitConsumerIDOrTag: Joi.string().required(),
    memo: Joi.string().required(),
    sessionKey: Joi.string().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    depositMode: Joi.string()
      .required()
      .valid(...Object.values(WalletDepositMode)),
  };

  constructor(
    private readonly alertService: AlertService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly consumerService: ConsumerService,
    private configService: CustomConfigService,
  ) {
    this.depositFeeFixedAmount = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.depositFeeFixedAmount;
    this.depositFeeMultiplier = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.depositFeeMultiplier;
    this.depositNobaFeeAmount = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.depositNobaFeeAmount;
    this.collectionFeeFixedAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.collectionFeeFixedAmount;
    this.collectionFeeMultiplier =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.collectionFeeMultiplier;
    this.collectionNobaFeeAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.collectionNobaFeeAmount;
  }

  async validate(request: WalletDepositTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: WalletDepositTransactionRequest): Promise<InputTransaction> {
    const transactionQuote = await this.getQuote(request.debitAmount, request.debitCurrency, Currency.USD, [
      TransactionFlags.IS_COLLECTION,
    ]);
    const consumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);

    return {
      workflowName: WorkflowName.WALLET_DEPOSIT,
      exchangeRate: Number(transactionQuote.nobaRate),
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [
        {
          amount: Number(transactionQuote.nobaFee),
          currency: Currency.USD,
          type: FeeType.NOBA,
        },
        {
          amount: Number(transactionQuote.processingFee),
          currency: Currency.USD,
          type: FeeType.PROCESSING,
        },
      ],
      sessionKey: request.sessionKey,
      creditAmount: Number(transactionQuote.quoteAmountWithFees),
      creditCurrency: Currency.USD,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency as Currency,
      debitConsumerID: consumer.props.id,
    };
  }

  async getQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
    if (desiredCurrency !== Currency.USD) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Only USD currency is supported for this type of transaction",
      });
    }

    const exchangeRateDTO: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      amountCurrency,
      desiredCurrency,
    );
    if (!exchangeRateDTO) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "No exchange rate found for currency pair",
      });
    }

    const bankRate = exchangeRateDTO.bankRate;
    const nobaRate = exchangeRateDTO.nobaRate;
    const isCollection = options && options.includes(TransactionFlags.IS_COLLECTION);

    const bankFeeCOP = isCollection
      ? Number(this.collectionFeeMultiplier * amount) + Number(this.collectionFeeFixedAmount)
      : Number(this.depositFeeMultiplier * amount) + Number(this.depositFeeFixedAmount);
    const nobaFeeUSD = isCollection ? this.collectionNobaFeeAmount : this.depositNobaFeeAmount;

    // Convert to USD using bank rate
    const bankFeeUSD = bankFeeCOP * bankRate;
    // Round up pesos fee to nearest .05 USD
    const bankFeeUSDRounded = Utils.roundUpToNearest(bankFeeUSD, 0.05);

    const postExchangeAmount = Utils.roundTo2DecimalNumber(amount * nobaRate);
    const postExchangeAmountWithBankFees = Utils.roundTo2DecimalNumber(
      postExchangeAmount - nobaFeeUSD - bankFeeUSDRounded,
    );

    if (postExchangeAmountWithBankFees < 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "AMOUNT_TOO_LOW",
      });
    }

    return {
      nobaFee: Utils.roundTo2DecimalString(nobaFeeUSD),
      processingFee: Utils.roundTo2DecimalString(bankFeeUSDRounded),
      totalFee: Utils.roundTo2DecimalString(Number(nobaFeeUSD) + Number(bankFeeUSDRounded)),
      quoteAmount: Utils.roundTo2DecimalString(postExchangeAmount),
      quoteAmountWithFees: Utils.roundTo2DecimalString(postExchangeAmountWithBankFees),
      nobaRate: nobaRate.toString(),
    };
  }

  private performStaticValidations(request: WalletDepositTransactionRequest): void {
    try {
      const validationSchema = Joi.object(this.validationKeys).options({
        allowUnknown: false,
        stripUnknown: true,
      });
      Joi.attempt(request, validationSchema);
    } catch (e) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: e.message,
      });
    }

    if (request.debitAmount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitAmount must be greater than 0 for WALLET_DEPOSIT workflow",
      });
    }

    if (request.debitCurrency !== Currency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitCurrency must be set for WALLET_DEPOSIT workflow and must be COP",
      });
    }

    if (request.depositMode !== WalletDepositMode.COLLECTION_LINK) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "WALLET_DEPOSIT workflow only supports collection link",
      });
    }
  }

  private async performDynamicValidations(request: WalletDepositTransactionRequest): Promise<void> {
    const consumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);
    if (!consumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer specified in 'debitConsumerIDOrTag' does not exist or is not active",
      });
    }
  }
}
