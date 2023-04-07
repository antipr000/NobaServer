import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { Transaction, getFee, getTotalFees } from "../../../modules/transaction/domain/Transaction";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import Joi from "joi";

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

export interface PayrollDepositCompletedNotificationParameters extends DepositCompletedNotificationParameters {
  companyName: string;
}

export class TransactionNotificationParamsJoiSchema {
  static getTransactionParamsSchema() {
    return {
      transactionRef: Joi.string().required(),
      createdTimestamp: Joi.string().required(),
      processingFees: Joi.number().required(),
      nobaFees: Joi.number().required(),
      debitAmount: Joi.number().required(),
      creditAmount: Joi.number().required(),
      debitCurrency: Joi.string().required(),
      creditCurrency: Joi.string().required(),
      totalFees: Joi.number().required(),
      exchangeRate: Joi.number().optional(),
    };
  }

  static getDepositCompletedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getDepositFailedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      reasonDeclined: Joi.string().required(),
    };
  }

  static getDepositInitiatedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getWithdrawalCompletedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getWithdrawalIntiatedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getWithdrawalFailedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      reasonDeclined: Joi.string().required(),
    };
  }

  static getTransferCompletedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      creditConsumer_firstName: Joi.string().required(),
      creditConsumer_lastName: Joi.string().required(),
      debitConsumer_handle: Joi.string().required(),
      creditConsumer_handle: Joi.string().required(),
    };
  }

  static getTransferReceivedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      creditConsumer_firstName: Joi.string().required(),
      creditConsumer_lastName: Joi.string().required(),
      debitConsumer_handle: Joi.string().required(),
      creditConsumer_handle: Joi.string().required(),
      debitConsumer_firstName: Joi.string().required(),
      debitConsumer_lastName: Joi.string().required(),
    };
  }

  static getTransferFailedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      creditConsumer_firstName: Joi.string().required(),
      creditConsumer_lastName: Joi.string().required(),
      debitConsumer_handle: Joi.string().required(),
      creditConsumer_handle: Joi.string().required(),
      reasonDeclined: Joi.string().required(),
    };
  }

  static getPayrollDepositCompletedNotificationParamsSchema() {
    return {
      ...this.getTransactionParamsSchema(),
      companyName: Joi.string().required(),
    };
  }
}

// TODO(jira/CRYPTO-604): Remove hardcoded values and unnecessary fields once templates are ready
export class TransactionNotificationPayloadMapper {
  static toTransactionParams(transaction: Transaction): TransactionParameters {
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

  static toDepositInitiatedNotificationParameters(transaction: Transaction): DepositInitiatedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  static toDepositCompletedNotificationParameters(transaction: Transaction): DepositCompletedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  static toDepositFailedNotificationParameters(transaction: Transaction): DepositFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  static toWithdrawalInitiatedNotificationParameters(
    transaction: Transaction,
  ): WithdrawalIntiatedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  static toWithdrawalCompletedNotificationParameters(
    transaction: Transaction,
  ): WithdrawalCompletedNotificationParameters {
    return this.toTransactionParams(transaction);
  }

  static toPayrollDepositCompletedNotificationParameters(
    transaction: Transaction,
    companyName: string,
  ): PayrollDepositCompletedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      companyName: companyName,
    };
  }

  static toWithdrawalFailedNotificationParameters(transaction: Transaction): WithdrawalFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction);
    return {
      ...transactionParams,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  static toTransferCompletedNotificationParameters(
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

  static toTransferReceivedNotificationParameters(
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

  static toTransferFailedNotificationParameters(
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
