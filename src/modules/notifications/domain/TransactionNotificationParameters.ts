import { Transaction } from "../../../modules/transaction/domain/Transaction";

export type TransactionParameters = {
  transactionRef: string;
  createdTimestamp: string;
  processingFees: number;
  nobaFees: number;
  totalPrice: number;
  fiatCurrencyCode: string;
};

export interface DepositCompletedNotificationParameters extends TransactionParameters {
  debitAmount: number;
  creditAmount: number;
  debitCurrency: string;
  exchangeRate: number;
}

export interface DepositFailedNotificationParameters extends DepositCompletedNotificationParameters {
  reasonDeclined: string;
}

export type DepositInitiatedNotificationParameters = DepositCompletedNotificationParameters;

export interface WithdrawalCompletedNotificationParameters extends TransactionParameters {
  creditAmount: number;
  creditCurrency: string;
  exchangeRate: number;
}

export interface WithdrawalIntiatedNotificationParameters extends TransactionParameters {
  withdrawalAmount: number;
  creditCurrency: string;
  exchangeRate: number;
  debitCurrency: string;
}

export interface WithdrawalFailedNotificationParameters extends TransactionParameters {
  reasonDeclined: string;
  exchangeRate: number;
  debitCurrency: string;
}

export interface TransferCompletedNotificationParameters extends TransactionParameters {
  debitAmount: number;
}

// TODO(jira/CRYPTO-604): Remove hardcoded values and unnecessary fields once templates are ready
export class TransactionNotificationPayloadMapper {
  toTransactionParams(transaction: Transaction): TransactionParameters {
    return {
      transactionRef: transaction.transactionRef,
      createdTimestamp: transaction.createdTimestamp.toUTCString(),
      processingFees: 0,
      nobaFees: 0,
      fiatCurrencyCode: transaction.debitCurrency,
      totalPrice: transaction.debitAmount,
    };
  }

  toDepositInitiatedNotificationParameters(transaction: Transaction): DepositInitiatedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      debitCurrency: transaction.debitCurrency,
      exchangeRate: transaction.exchangeRate,
      totalPrice: transaction.creditAmount,
    };
  }

  toDepositCompletedNotificationParameters(transaction: Transaction): DepositCompletedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      debitCurrency: transaction.debitCurrency,
      exchangeRate: transaction.exchangeRate,
      totalPrice: transaction.debitAmount,
    };
  }

  toDepositFailedNotificationParameters(transaction: Transaction): DepositFailedNotificationParameters {
    const depositParams = this.toDepositCompletedNotificationParameters(transaction);
    return {
      ...depositParams,
      reasonDeclined: "",
    };
  }

  toWithdrawalInitiatedNotificationParameters(transaction: Transaction): WithdrawalIntiatedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      withdrawalAmount: transaction.debitAmount,
      creditCurrency: transaction.creditCurrency,
      exchangeRate: transaction.exchangeRate,
      debitCurrency: transaction.debitCurrency,
      totalPrice: transaction.creditAmount,
    };
  }

  toWithdrawalCompletedNotificationParameters(transaction: Transaction): WithdrawalCompletedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      creditAmount: transaction.creditAmount,
      creditCurrency: transaction.creditCurrency,
      exchangeRate: transaction.exchangeRate,
      totalPrice: transaction.creditAmount,
    };
  }

  toWithdrawalFailedNotificationParameters(transaction: Transaction): WithdrawalFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      reasonDeclined: "",
      exchangeRate: transaction.exchangeRate,
      debitCurrency: transaction.debitCurrency,
      totalPrice: transaction.debitAmount,
    };
  }

  toTransferCompletedNotificationParameters(transaction: Transaction): TransferCompletedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      debitAmount: transaction.debitAmount,
      totalPrice: transaction.creditAmount,
    };
  }
}
