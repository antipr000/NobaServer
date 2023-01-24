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
import { MonoService } from "../../psp/mono/mono.service";
import { MonoCurrency } from "../../psp/domain/Mono";

export class WalletDepositImpl implements IWorkflowImpl {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly exchangeRateService: ExchangeRateService;

  @Inject()
  private readonly workflowExecutor: WorkflowExecutor;

  @Inject()
  private readonly monoService: MonoService;

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO> {
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

    const exchangeRateToUSD: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      transactionDetails.debitCurrency,
      transactionDetails.creditCurrency,
    );

    if (!exchangeRateToUSD) {
      this.logger.error(
        `Database is not seeded properly. Could not find exchange rate for ${transactionDetails.debitCurrency} - ${Currency.USD}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN, // 500 error because even though it's "known", it's not expected
        message: "Could not find exchange rate",
      });
    }

    transactionDetails.creditAmount = exchangeRateToUSD.nobaRate * transactionDetails.debitAmount;
    transactionDetails.exchangeRate = exchangeRateToUSD.nobaRate;

    return transactionDetails;
  }

  async initiateWorkflow(transaction: Transaction): Promise<void> {
    if (transaction.creditConsumerID && transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
      });
    }

    // TODO: Add a check for the currency here. Mono should be called "only" for COP currencies.
    await this.monoService.createMonoTransaction({
      amount: transaction.debitAmount,
      currency: transaction.debitCurrency as MonoCurrency,
      consumerID: transaction.debitConsumerID,
      nobaTransactionID: transaction.id,
    });

    this.workflowExecutor.executeCreditConsumerWalletWorkflow(transaction.id, transaction.transactionRef);
  }
}
