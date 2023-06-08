import { InputTransaction } from "../../domain/Transaction";
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

export type TransactionPreprocessorRequest =
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

export interface TransactionPreprocessor {
  // Performs static and dynamic validation of the transaction.
  //   - Will complete successfully if the transaction is valid.
  //   - Throws an exception if the transaction is invalid.
  validate(request: TransactionPreprocessorRequest): Promise<void>;

  // Converts the transaction to InputTransaction (interface to the Repository layer).
  convertToRepoInputTransaction(request: TransactionPreprocessorRequest): Promise<InputTransaction>;
}
