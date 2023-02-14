import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { Transaction, getFee, getTotalFees } from "../../../modules/transaction/domain/Transaction";
import { Consumer } from "../../../modules/consumer/domain/Consumer";

export type TransactionParameters = {
  transactionRef: string;
  createdTimestamp: string;
  processingFees: number;
  nobaFees: number;
  debitAmount: number;
  creditAmount: number;
  debitCurrency: string;
  creditCurrency: string;
  totalFees: number;
  exchangeRate?: number;
};

export type DepositCompletedNotificationParameters = TransactionParameters;

export interface DepositFailedNotificationParameters extends TransactionParameters {
  reasonDeclined: string;
}

export type DepositInitiatedNotificationParameters = TransactionParameters;

export type WithdrawalCompletedNotificationParameters = TransactionParameters;

export type WithdrawalIntiatedNotificationParameters = TransactionParameters;

export interface WithdrawalFailedNotificationParameters extends TransactionParameters {
  reasonDeclined: string;
}

export interface TransferCompletedNotificationParameters extends TransactionParameters {
  creditConsumer_firstName: string;
  creditConsumer_lastName: string;
  debitConsumer_handle: string;
  creditConsumer_handle: string;
}

export interface TransferReceivedNotificationParameters extends TransactionParameters {
  creditConsumer_firstName: string;
  creditConsumer_lastName: string;
  debitConsumer_handle: string;
  creditConsumer_handle: string;
  debitConsumer_firstName: string;
  debitConsumer_lastName: string;
}

export interface TransferFailedNotificationParameters extends TransactionParameters {
  creditConsumer_firstName: string;
  creditConsumer_lastName: string;
  debitConsumer_handle: string;
  creditConsumer_handle: string;
  reasonDeclined: string;
}

// TODO(jira/CRYPTO-604): Remove hardcoded values and unnecessary fields once templates are ready
export class TransactionNotificationPayloadMapper {
  toTransactionParams(transaction: Transaction): TransactionParameters {
    const processingFee = getFee(transaction, FeeType.PROCESSING);
    const nobaFee = getFee(transaction, FeeType.NOBA);
    return {
      transactionRef: transaction.transactionRef,
      createdTimestamp: transaction.createdTimestamp.toUTCString(),
      processingFees: processingFee ? processingFee.amount : 0,
      nobaFees: nobaFee ? nobaFee.amount : 0,
      debitAmount: transaction.debitAmount,
      debitCurrency: transaction.debitCurrency,
      creditAmount: transaction.creditAmount,
      creditCurrency: transaction.creditCurrency,
      exchangeRate: transaction.exchangeRate,
      totalFees: getTotalFees(transaction),
    };
  }

  toDepositInitiatedNotificationParameters(transaction: Transaction): DepositInitiatedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  toDepositCompletedNotificationParameters(transaction: Transaction): DepositCompletedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  toDepositFailedNotificationParameters(transaction: Transaction): DepositFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  toWithdrawalInitiatedNotificationParameters(transaction: Transaction): WithdrawalIntiatedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  toWithdrawalCompletedNotificationParameters(transaction: Transaction): WithdrawalCompletedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  toWithdrawalFailedNotificationParameters(transaction: Transaction): WithdrawalFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  toTransferCompletedNotificationParameters(
    transaction: Transaction,
    debitConsumer: Consumer,
    creditConsumer: Consumer,
  ): TransferCompletedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      creditConsumer_firstName: creditConsumer.props.firstName,
      creditConsumer_lastName: creditConsumer.props.lastName,
      creditConsumer_handle: creditConsumer.props.handle,
      debitConsumer_handle: debitConsumer.props.handle,
    };
  }

  toTransferReceivedNotificationParameters(
    transaction: Transaction,
    debitConsumer: Consumer,
    creditConsumer: Consumer,
  ): TransferReceivedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      creditConsumer_firstName: creditConsumer.props.firstName,
      creditConsumer_lastName: creditConsumer.props.lastName,
      creditConsumer_handle: creditConsumer.props.handle,
      debitConsumer_handle: debitConsumer.props.handle,
      debitConsumer_firstName: debitConsumer.props.firstName,
      debitConsumer_lastName: debitConsumer.props.lastName,
    };
  }

  toTransferFailedNotificationParameters(
    transaction: Transaction,
    debitConsumer: Consumer,
    creditConsumer: Consumer,
  ): TransferFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      creditConsumer_firstName: creditConsumer.props.firstName,
      creditConsumer_lastName: creditConsumer.props.lastName,
      creditConsumer_handle: creditConsumer.props.handle,
      debitConsumer_handle: debitConsumer.props.handle,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }
}
