import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { Currency } from "../domain/TransactionTypes";
import { ExchangeRateService } from "../../common/exchangerate.service";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { Transaction } from "../domain/Transaction";
import { TransactionFlags } from "../domain/TransactionFlags";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { Utils } from "../../../core/utils/Utils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";

export class WalletWithdrawalImpl implements IWorkflowImpl {
  private monoWithdrawalFeeAmount: number;
  private nobaWithdrawalFeeAmount: number;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly workflowExecutor: WorkflowExecutor,
  ) {
    this.monoWithdrawalFeeAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.withdrawalMonoFeeAmount;
    this.nobaWithdrawalFeeAmount =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.withdrawalNobaFeeAmount;
  }

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO> {
    /* 
      For a withdrawal, the following are true:
        1. We set the debitConsumerIDOrTag to the initiating consumer (the consumer who is withdrawing)
        2. CreditConsumerIDOrTag will never be set
        3. Debit-side amount must be provided but currency will always be USD
        4. Credit-side currency must be provided but credit amount will always be calculated
    */
    if (transactionDetails.creditConsumerIDOrTag) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "creditConsumerIDOrTag cannot be set for WALLET_WITHDRAWAL workflow",
      });
    }

    if (transactionDetails.creditAmount) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "creditAmount cannot be set for WALLET_WITHDRAWAL workflow",
      });
    }

    if (transactionDetails.debitCurrency) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitCurrency cannot be set for WALLET_WITHDRAWAL workflow",
      });
    }

    if (transactionDetails.debitAmount <= 0) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debitAmount must be greater than 0 for WALLET_WITHDRAWAL workflow",
      });
    }

    if (!transactionDetails.creditCurrency) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "creditCurrency must be set for WALLET_WITHDRAWAL workflow",
      });
    }

    if (!transactionDetails.withdrawalData) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "withdrawalData must be set for WALLET_WITHDRAWAL workflow",
      });
    }

    transactionDetails.debitCurrency = Currency.USD;
    transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
    delete transactionDetails.creditConsumerIDOrTag;

    const transactionQuote = await this.getTransactionQuote(
      transactionDetails.debitAmount,
      transactionDetails.debitCurrency,
      transactionDetails.creditCurrency,
    );

    transactionDetails.creditAmount = Number(transactionQuote.quoteAmountWithFees);
    transactionDetails.exchangeRate = Number(transactionQuote.nobaRate);

    return transactionDetails;
  }

  async initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void> {
    if (transaction.creditConsumerID && transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
      });
    }

    this.workflowExecutor.executeDebitConsumerWalletWorkflow(transaction.id, transaction.id);
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

    if (desiredCurrency === Currency.COP) {
      const nobaFeeUSD = this.nobaWithdrawalFeeAmount;

      const processingFeeCOP = this.monoWithdrawalFeeAmount;
      const processingFeeUSD = Utils.roundTo2DecimalNumber(processingFeeCOP / bankRate);
      const processingFeeUSDRounded = Utils.roundUpToNearest(processingFeeUSD, 0.05);

      // Do fees get calculated postExchange or preExchange?
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
    } else {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Non-COP withdrawal not supported",
      });
    }
  }
}
