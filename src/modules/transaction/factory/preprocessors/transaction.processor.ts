import { InputTransaction, Transaction } from "../../domain/Transaction";
import {
  CardCreditAdjustmentTransactionRequest,
  CardDebitAdjustmentTransactionRequest,
  CardReversalTransactionRequest,
  CardWithdrawalTransactionRequest,
  CreditAdjustmentTransactionRequest,
  DebitAdjustmentTransactionRequest,
  PayrollDepositTransactionRequest,
  WalletDepositTransactionRequest,
  WalletTransferTransactionRequest,
  WalletWithdrawalTransactionRequest,
} from "../../dto/transaction.service.dto";

export type TransactionProcessorRequest =
  | PayrollDepositTransactionRequest
  | CardWithdrawalTransactionRequest
  | CardReversalTransactionRequest
  | CreditAdjustmentTransactionRequest
  | DebitAdjustmentTransactionRequest
  | CardCreditAdjustmentTransactionRequest
  | CardDebitAdjustmentTransactionRequest
  | WalletDepositTransactionRequest
  | WalletWithdrawalTransactionRequest
  | WalletTransferTransactionRequest;

export interface TransactionProcessor {
  // Performs static and dynamic validation of the transaction.
  //   - Will complete successfully if the transaction is valid.
  //   - Throws an exception if the transaction is invalid.
  validate(request: TransactionProcessorRequest): Promise<void>;

  // Converts the transaction to InputTransaction (interface to the Repository layer).
  convertToRepoInputTransaction(request: TransactionProcessorRequest): Promise<InputTransaction>;

  // TODO: This is not transactional. Identify a way to make this transactional (maybe Temporal).
  // Performs post-processing after the transaction creation.
  // Any external system calls (e.g. Mono Transaction creation) should be done here.
  performPostProcessing(request: TransactionProcessorRequest, createdTransaction: Transaction): Promise<void>;
}
