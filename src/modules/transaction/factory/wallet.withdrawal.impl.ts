import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { Currency } from "../domain/TransactionTypes";
import { ExchangeRateDTO } from "../../common/dto/ExchangeRateDTO";
import { ExchangeRateService } from "../../common/exchangerate.service";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { Transaction } from "../domain/Transaction";
import { ExchangeRateFlags } from "../domain/ExchangeRateFlags";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { Utils } from "../../../core/utils/Utils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";

export class WalletWithdrawalImpl implements IWorkflowImpl {
  private withdrawalFeeAmount: number;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly workflowExecutor: WorkflowExecutor,
  ) {
    this.withdrawalFeeAmount = 0; // Eventually pull from config service
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

    transactionDetails.debitCurrency = Currency.USD;
    transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
    delete transactionDetails.creditConsumerIDOrTag;

    const exchangeRateFromUSD: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      transactionDetails.debitCurrency,
      transactionDetails.creditCurrency,
    );

    if (!exchangeRateFromUSD) {
      this.logger.error(
        `Database is not seeded properly. Could not find exchange rate for ${Currency.USD} - ${transactionDetails.debitCurrency}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN, // 500 error because even though it's "known", it's not expected
        message: "Could not find exchange rate",
      });
    }

    transactionDetails.creditAmount = exchangeRateFromUSD.nobaRate * transactionDetails.debitAmount;
    transactionDetails.exchangeRate = exchangeRateFromUSD.nobaRate;

    return transactionDetails;
  }

  async initiateWorkflow(transaction: Transaction): Promise<void> {
    if (transaction.creditConsumerID && transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
      });
    }
    this.workflowExecutor.executeDebitConsumerWalletWorkflow(
      transaction.debitConsumerID,
      transaction.debitAmount,
      transaction.transactionRef,
    );
  }

  async getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    exchangeRateFlags?: ExchangeRateFlags[],
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
      // Start with amount USD -> Noba Fee -> Noba Rate -> Processing Fee -> COP
      // Start with amount USD -> Post Exchange amount ->
      // Noba rate = 5000
      // 1 USDC FEE

      const nobaFeeUSD = this.withdrawalFeeAmount;

      const processingFeeCOP = 2500 * 1.19;
      const processingFeeUSD = Utils.roundTo2DecimalNumber(processingFeeCOP / bankRate); // Ask gal if this could just be 1 USD
      const processingFeeUSDRounded = Utils.roundUpToNearest(processingFeeUSD, 0.05);

      // Do fees get calculated postExchange or preExchange?
      const postExchangeAmount = Utils.roundTo2DecimalNumber(amount * nobaRate); // COP
      const postExchangeAmountWithBankFees = Utils.roundTo2DecimalNumber(
        (amount - nobaFeeUSD - processingFeeUSDRounded) * nobaRate,
      );

      return {
        nobaFee: Utils.roundTo2DecimalString(nobaFeeUSD),
        processingFee: Utils.roundTo2DecimalString(processingFeeUSDRounded),
        totalFee: Utils.roundTo2DecimalString(nobaFeeUSD + processingFeeUSDRounded),
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
