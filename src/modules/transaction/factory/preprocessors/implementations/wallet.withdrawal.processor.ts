import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { NobaConfigs } from "../../../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../../../config/ConfigurationUtils";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { CustomConfigService } from "../../../../../core/utils/AppConfigModule";
import { ConsumerService } from "../../../../../modules/consumer/consumer.service";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";
import { ExchangeRateService } from "../../../../../modules/exchangerate/exchangerate.service";
import { TransactionFlags } from "../../../../../modules/transaction/domain/TransactionFlags";
import { QuoteResponseDTO } from "../../../../../modules/transaction/dto/QuoteResponseDTO";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../../modules/common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import {
  WalletWithdrawalDetails,
  WalletWithdrawalTransactionRequest,
} from "../../../../../modules/transaction/dto/transaction.service.dto";
import { TransactionQuoteProvider } from "../quote.provider";
import { TransactionPreprocessor } from "../transaction.preprocessor";
import { FeeType } from "../../../../../modules/transaction/domain/TransactionFee";
import { AccountType, DocumentType } from "../../../../../modules/transaction/domain/WithdrawalDetails";
import { WorkflowInitiator } from "../workflow.initiator";
import { WorkflowExecutor } from "../../../../../infra/temporal/workflow.executor";

@Injectable()
export class WalletWithdrawalProcessor implements TransactionPreprocessor, TransactionQuoteProvider, WorkflowInitiator {
  private readonly walletWithdrawalDetailsKeys: KeysRequired<WalletWithdrawalDetails> = {
    bankCode: Joi.string().required(),
    accountNumber: Joi.string().required(),
    documentNumber: Joi.string().required(),
    documentType: Joi.string()
      .required()
      .valid(...Object.values(DocumentType)),
    accountType: Joi.string()
      .required()
      .valid(...Object.values(AccountType)),
  };
  private readonly validationKeys: KeysRequired<WalletWithdrawalTransactionRequest> = {
    debitConsumerIDOrTag: Joi.string().required(),
    debitAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
    sessionKey: Joi.string().required(),
    withdrawalDetails: Joi.object(this.walletWithdrawalDetailsKeys).required(),
  };

  private monoWithdrawalFeeAmount: number;
  private nobaWithdrawalFeeAmount: number;

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly workflowExecutor: WorkflowExecutor,
    private configService: CustomConfigService,
  ) {
    this.monoWithdrawalFeeAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.withdrawalMonoFeeAmount;
    this.nobaWithdrawalFeeAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.withdrawalNobaFeeAmount;
  }

  async validate(request: WalletWithdrawalTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: WalletWithdrawalTransactionRequest): Promise<InputTransaction> {
    const transactionQuote: QuoteResponseDTO = await this.getQuote(
      request.debitAmount,
      Currency.USD,
      request.creditCurrency,
    );
    const consumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);

    return {
      workflowName: WorkflowName.WALLET_WITHDRAWAL,
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
      creditCurrency: request.creditCurrency,
      debitAmount: request.debitAmount,
      debitCurrency: Currency.USD,
      debitConsumerID: consumer.props.id,
    };
  }

  async getQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
    if (desiredCurrency !== Currency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Non COP withdrawal not supported",
      });
    }

    const exchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
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
    const nobaFeeUSD = this.nobaWithdrawalFeeAmount;
    const processingFeeCOP = this.monoWithdrawalFeeAmount;
    const processingFeeUSD = Utils.roundTo2DecimalNumber(processingFeeCOP / bankRate);
    const processingFeeUSDRounded = Utils.roundUpToNearest(processingFeeUSD, 0.05);

    // TODO: Do fees get calculated postExchange or preExchange?
    const postExchangeAmount = Utils.roundTo2DecimalNumber(amount * nobaRate); // COP
    const postExchangeAmountWithBankFees = Utils.roundTo2DecimalNumber(
      (amount - nobaFeeUSD - processingFeeUSDRounded) * nobaRate,
    );

    if (postExchangeAmountWithBankFees < 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "AMOUNT_TOO_LOW",
      });
    }

    return {
      nobaFee: Utils.roundTo2DecimalString(nobaFeeUSD),
      processingFee: Utils.roundTo2DecimalString(processingFeeUSDRounded),
      totalFee: Utils.roundTo2DecimalString(Number(nobaFeeUSD) + Number(processingFeeUSDRounded)),
      quoteAmount: Utils.roundTo2DecimalString(postExchangeAmount),
      quoteAmountWithFees: Utils.roundTo2DecimalString(postExchangeAmountWithBankFees),
      nobaRate: nobaRate.toString(),
    };
  }

  async initiateWorkflow(transactionID: string, transactionRef: string): Promise<void> {
    await this.workflowExecutor.executeWalletWithdrawalWorkflow(transactionID, transactionRef);
  }

  private performStaticValidations(request: WalletWithdrawalTransactionRequest): void {
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
        message: "debitAmount must be greater than 0 for WALLET_WITHDRAWAL workflow",
      });
    }
  }

  private async performDynamicValidations(request: WalletWithdrawalTransactionRequest): Promise<void> {
    const consumer: Consumer = await this.consumerService.getActiveConsumer(request.debitConsumerIDOrTag);
    if (!consumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer specified in 'debitConsumerIDOrTag' does not exist or is not active",
      });
    }

    await this.getQuote(request.debitAmount, Currency.USD, request.creditCurrency);
  }
}
