import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Currency } from "../domain/TransactionTypes";
import { ExchangeRateService } from "../../common/exchangerate.service";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { InputTransaction, Transaction } from "../domain/Transaction";
import { MonoService } from "../../psp/mono/mono.service";
import { MonoCurrency, MonoTransactionType } from "../../psp/domain/Mono";
import { TransactionFlags } from "../domain/TransactionFlags";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { Utils } from "../../../core/utils/Utils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { FeeType } from "../domain/TransactionFee";

export class WalletDepositImpl implements IWorkflowImpl {
  private depositFeeFixedAmount: number;
  private depositFeeMultiplier: number;
  private depositNobaFeeAmount: number;
  private collectionFeeFixedAmount: number;
  private collectionFeeMultiplier: number;
  private collectionNobaFeeAmount: number;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly monoService: MonoService,
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

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InputTransaction> {
    if (transactionDetails.creditConsumerIDOrTag) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "creditConsumerIDOrTag cannot be set for WALLET_DEPOSIT workflow",
      });
    }

    if (transactionDetails.creditAmount || transactionDetails.creditCurrency) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "creditAmount and creditCurrency cannot be set for WALLET_DEPOSIT workflow",
      });
    }

    if (transactionDetails.debitAmount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitAmount must be greater than 0 for WALLET_DEPOSIT workflow",
      });
    }

    // COP limitation is temporary until we support other currencies
    if (!transactionDetails.debitCurrency || transactionDetails.debitCurrency !== Currency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitCurrency must be set for WALLET_DEPOSIT workflow and must be COP",
      });
    }

    transactionDetails.creditCurrency = Currency.USD;
    transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
    delete transactionDetails.creditConsumerIDOrTag;

    const isCollection =
      transactionDetails.options && transactionDetails.options.includes(TransactionFlags.IS_COLLECTION);

    const transactionQuote = await this.getTransactionQuote(
      transactionDetails.debitAmount,
      transactionDetails.debitCurrency,
      transactionDetails.creditCurrency,
      isCollection ? [TransactionFlags.IS_COLLECTION] : [],
    );

    transactionDetails.creditAmount = Number(transactionQuote.quoteAmountWithFees);
    transactionDetails.exchangeRate = Number(transactionQuote.nobaRate);

    const transaction: InputTransaction = {
      creditAmount: transactionDetails.creditAmount,
      creditCurrency: transactionDetails.creditCurrency,
      debitAmount: transactionDetails.debitAmount,
      debitCurrency: transactionDetails.debitCurrency,
      exchangeRate: transactionDetails.exchangeRate,
      workflowName: transactionDetails.workflowName,
      memo: transactionDetails.memo,
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
    };

    return transaction;
  }

  async initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void> {
    if (transaction.creditConsumerID && transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
      });
    }

    // TODO: Add a check for the currency here. Mono should be called "only" for COP currencies.
    const isCollection = options && options.includes(TransactionFlags.IS_COLLECTION);
    if (isCollection) {
      await this.monoService.createMonoTransaction({
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        amount: transaction.debitAmount,
        currency: transaction.debitCurrency as MonoCurrency,
        consumerID: transaction.debitConsumerID,
        nobaTransactionID: transaction.id,
      });
    }

    this.workflowExecutor.executeCreditConsumerWalletWorkflow(transaction.id, transaction.transactionRef);
  }

  async getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
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

    const isCollection = options && options.includes(TransactionFlags.IS_COLLECTION);
    if (desiredCurrency === Currency.USD) {
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
    } else {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "COP deposit not supported",
      });
    }
  }
}
