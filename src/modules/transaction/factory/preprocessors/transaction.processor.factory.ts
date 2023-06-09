import { Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { WorkflowName } from "../../domain/Transaction";
import { InitiateTransactionRequest } from "../../dto/transaction.service.dto";
import { CardCreditAdjustmentPreprocessor } from "./implementations/card.credit.adjustment.preprocessor";
import { CardDebitAdjustmentPreprocessor } from "./implementations/card.debit.adjustment.preprocessor";
import { CardReversalPreprocessor } from "./implementations/card.reversal.preprocessor";
import { CardWithdrawalPreprocessor } from "./implementations/card.withdrawal.preprocessro";
import { CreditAdjustmentPreprocessor } from "./implementations/credit.adjustment.preprocessor";
import { DebitAdjustmentPreprocessor } from "./implementations/debit.adjustment.preprocessor";
import { PayrollDepositPreprocessor } from "./implementations/payroll.deposit.preprocessor";
import { WalletDepositProcessor } from "./implementations/wallet.deposit.processor";
import { WalletTransferPreprocessor } from "./implementations/wallet.transfer.preprocessor";
import { WalletWithdrawalProcessor } from "./implementations/wallet.withdrawal.processor";
import { TransactionQuoteProvider } from "./quote.provider";
import { TransactionPreprocessor, TransactionPreprocessorRequest } from "./transaction.preprocessor";
import { WorkflowInitiator } from "./workflow.initiator";

@Injectable()
export class TransactionProcessorFactory {
  constructor(
    private readonly payrollDepositPreprocessor: PayrollDepositPreprocessor,
    private readonly cardWithdrawalPreprocessor: CardWithdrawalPreprocessor,
    private readonly cardReversalPreprocessor: CardReversalPreprocessor,
    private readonly cardCreditAdjustmentPreprocessor: CardCreditAdjustmentPreprocessor,
    private readonly cardDebitAdjustmentPreprocessor: CardDebitAdjustmentPreprocessor,
    private readonly creditAdjustmentPreprocessor: CreditAdjustmentPreprocessor,
    private readonly debitAdjustmentPreprocessor: DebitAdjustmentPreprocessor,
    private readonly walletDepositProcessor: WalletDepositProcessor,
    private readonly walletWithdrawalProcessor: WalletWithdrawalProcessor,
    private readonly walletTransferPreprocessor: WalletTransferPreprocessor,
  ) {}

  getPreprocessor(workflowName: WorkflowName): TransactionPreprocessor {
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

  extractTransactionPreprocessorRequest(request: InitiateTransactionRequest): TransactionPreprocessorRequest {
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
