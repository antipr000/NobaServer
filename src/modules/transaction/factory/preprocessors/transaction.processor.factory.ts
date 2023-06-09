import { Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { WorkflowName } from "../../domain/Transaction";
import { InitiateTransactionRequest } from "../../dto/transaction.service.dto";
import { CardCreditAdjustmentProcessor } from "./implementations/card.credit.adjustment.processor";
import { CardDebitAdjustmentProcessor } from "./implementations/card.debit.adjustment.processor";
import { CardReversalProcessor } from "./implementations/card.reversal.processor";
import { CardWithdrawalProcessor } from "./implementations/card.withdrawal.processor";
import { CreditAdjustmentProcessor } from "./implementations/credit.adjustment.processor";
import { DebitAdjustmentProcessor } from "./implementations/debit.adjustment.processor";
import { PayrollDepositProcessor } from "./implementations/payroll.deposit.processor";
import { WalletDepositProcessor } from "./implementations/wallet.deposit.processor";
import { WalletTransferProcessor } from "./implementations/wallet.transfer.processor";
import { WalletWithdrawalProcessor } from "./implementations/wallet.withdrawal.processor";
import { TransactionQuoteProvider } from "./quote.provider";
import { TransactionProcessor, TransactionProcessorRequest } from "./transaction.processor";
import { WorkflowInitiator } from "./workflow.initiator";

@Injectable()
export class TransactionProcessorFactory {
  constructor(
    private readonly payrollDepositPreprocessor: PayrollDepositProcessor,
    private readonly cardWithdrawalPreprocessor: CardWithdrawalProcessor,
    private readonly cardReversalPreprocessor: CardReversalProcessor,
    private readonly cardCreditAdjustmentPreprocessor: CardCreditAdjustmentProcessor,
    private readonly cardDebitAdjustmentPreprocessor: CardDebitAdjustmentProcessor,
    private readonly creditAdjustmentPreprocessor: CreditAdjustmentProcessor,
    private readonly debitAdjustmentPreprocessor: DebitAdjustmentProcessor,
    private readonly walletDepositProcessor: WalletDepositProcessor,
    private readonly walletWithdrawalProcessor: WalletWithdrawalProcessor,
    private readonly walletTransferPreprocessor: WalletTransferProcessor,
  ) {}

  getPreprocessor(workflowName: WorkflowName): TransactionProcessor {
    switch (workflowName) {
      case WorkflowName.PAYROLL_DEPOSIT:
        return this.payrollDepositPreprocessor;
      case WorkflowName.CARD_WITHDRAWAL:
        return this.cardWithdrawalPreprocessor;
      case WorkflowName.CARD_REVERSAL:
        return this.cardReversalPreprocessor;
      case WorkflowName.CARD_CREDIT_ADJUSTMENT:
        return this.cardCreditAdjustmentPreprocessor;
      case WorkflowName.CARD_DEBIT_ADJUSTMENT:
        return this.cardDebitAdjustmentPreprocessor;
      case WorkflowName.CREDIT_ADJUSTMENT:
        return this.creditAdjustmentPreprocessor;
      case WorkflowName.DEBIT_ADJUSTMENT:
        return this.debitAdjustmentPreprocessor;
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositProcessor;
      case WorkflowName.WALLET_WITHDRAWAL:
        return this.walletWithdrawalProcessor;
      case WorkflowName.WALLET_TRANSFER:
        return this.walletTransferPreprocessor;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: `No preprocessor found for workflow name: ${workflowName}`,
        });
    }
  }

  extractTransactionPreprocessorRequest(request: InitiateTransactionRequest): TransactionProcessorRequest {
    switch (request.type) {
      case WorkflowName.PAYROLL_DEPOSIT:
        return request.payrollDepositRequest;
      case WorkflowName.CARD_WITHDRAWAL:
        return request.cardWithdrawalRequest;
      case WorkflowName.CARD_REVERSAL:
        return request.cardReversalRequest;
      case WorkflowName.CARD_CREDIT_ADJUSTMENT:
        return request.cardCreditAdjustmentRequest;
      case WorkflowName.CARD_DEBIT_ADJUSTMENT:
        return request.cardDebitAdjustmentRequest;
      case WorkflowName.CREDIT_ADJUSTMENT:
        return request.creditAdjustmentRequest;
      case WorkflowName.DEBIT_ADJUSTMENT:
        return request.debitAdjustmentRequest;
      case WorkflowName.WALLET_DEPOSIT:
        return request.walletDepositRequest;
      case WorkflowName.WALLET_WITHDRAWAL:
        return request.walletWithdrawalRequest;
      case WorkflowName.WALLET_TRANSFER:
        return request.walletTransferRequest;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: `No preprocessor found for workflow name: ${request.type}`,
        });
    }
  }

  getQuoteProvider(workflowName: WorkflowName): TransactionQuoteProvider {
    switch (workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositProcessor;
      case WorkflowName.WALLET_WITHDRAWAL:
        return this.walletWithdrawalProcessor;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: `No quote provider found for workflow name: ${workflowName}`,
        });
    }
  }

  getWorkflowInitiator(workflowName: WorkflowName): WorkflowInitiator {
    switch (workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositProcessor;
      case WorkflowName.WALLET_WITHDRAWAL:
        return this.walletWithdrawalProcessor;
      case WorkflowName.WALLET_TRANSFER:
        return this.walletTransferPreprocessor;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: `No workflow initiator found for workflow name: ${workflowName}`,
        });
    }
  }
}
