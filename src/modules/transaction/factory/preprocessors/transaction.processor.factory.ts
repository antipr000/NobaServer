import { Injectable } from "@nestjs/common";
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
import { TransactionQuoteProvider } from "./quote.provider";
import { TransactionPreprocessor, TransactionPreprocessorRequest } from "./transaction.preprocessor";

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
      default:
        throw new Error(`No preprocessor found for workflow name: ${workflowName}`);
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
      default:
        throw new Error(`No preprocessor found for workflow name: ${request.type}`);
    }
  }

  getQuoteProvider(workflowName: WorkflowName): TransactionQuoteProvider {
    switch (workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        return this.walletDepositProcessor;
      default:
        throw new Error(`No quote provider found for workflow name: ${workflowName}`);
    }
  }
}
