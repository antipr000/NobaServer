import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { Transaction, getFee, getTotalFees } from "../../../modules/transaction/domain/Transaction";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { Utils } from "../../../core/utils/Utils";

export type TransactionParameters = {
  transactionRef: string;
  createdTimestamp: string;
  processingFees: string;
  nobaFees: string;
  debitAmount: string;
  debitAmountNumber: number;
  creditAmount: string;
  creditAmountNumber: number;
  debitCurrency: string;
  creditCurrency: string;
  totalFees: string;
  totalFeesNumber: number;
  exchangeRate?: string;
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

export type CreditAdjustmentCompletedNotificationParameters = TransactionParameters;

export type CreditAdjustmentFailedNotificationParameters = TransactionParameters;

export type DebitAdjustmentCompletedNotificationParameters = TransactionParameters;

export type DebitAdjustmentFailedNotificationParameters = TransactionParameters;

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
  static getTransactionParamsSchema(): KeysRequired<TransactionParameters> {
    return {
      transactionRef: Joi.string().required(),
      createdTimestamp: Joi.string().required(),
      processingFees: Joi.string().required(),
      nobaFees: Joi.number().required(),
      debitAmount: Joi.string().required(),
      debitAmountNumber: Joi.number().required(),
      creditAmount: Joi.string().required(),
      creditAmountNumber: Joi.number().required(),
      debitCurrency: Joi.string().required(),
      creditCurrency: Joi.string().required(),
      totalFees: Joi.string().required(),
      totalFeesNumber: Joi.number().required(),
      exchangeRate: Joi.string().optional(),
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

  static getCreditAdjustmentCompletedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getCreditAdjustmentFailedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getDebitAdjustmentCompletedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }

  static getDebitAdjustmentFailedNotificationParamsSchema() {
    return this.getTransactionParamsSchema();
  }
}

// TODO(jira/CRYPTO-604): Remove hardcoded values and unnecessary fields once templates are ready
export class TransactionNotificationPayloadMapper {
  static toTransactionParams(transaction: Transaction, locale: string): TransactionParameters {
    const processingFee = getFee(transaction, FeeType.PROCESSING);
    const nobaFee = getFee(transaction, FeeType.NOBA);
    const totalFeesNumber = getTotalFees(transaction);

    const creditAmount = Utils.localizeAmount(transaction.creditAmount, locale);
    const debitAmount = Utils.localizeAmount(transaction.debitAmount, locale);
    const exchangeRate = Utils.localizeAmount(transaction.exchangeRate, locale, false);
    const nobaFees = Utils.localizeAmount(nobaFee ? nobaFee.amount : 0, locale);
    const processingFees = Utils.localizeAmount(processingFee ? processingFee.amount : 0, locale);
    const totalFees = Utils.localizeAmount(totalFeesNumber, locale);
    return {
      transactionRef: transaction.transactionRef,
      createdTimestamp: transaction.createdTimestamp.toUTCString(),
      processingFees: processingFees,
      nobaFees: nobaFees,
      debitAmount: debitAmount,
      debitAmountNumber: transaction.debitAmount,
      debitCurrency: transaction.debitCurrency,
      creditAmount: creditAmount,
      creditAmountNumber: transaction.creditAmount,
      creditCurrency: transaction.creditCurrency,
      exchangeRate: exchangeRate,
      totalFees: totalFees,
      totalFeesNumber: totalFeesNumber,
    };
  }

  static toDepositInitiatedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): DepositInitiatedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toDepositCompletedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): DepositCompletedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toDepositFailedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): DepositFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction, locale);
    return {
      ...transactionParams,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  static toWithdrawalInitiatedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): WithdrawalIntiatedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toWithdrawalCompletedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): WithdrawalCompletedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toPayrollDepositCompletedNotificationParameters(
    transaction: Transaction,
    companyName: string,
    locale: string,
  ): PayrollDepositCompletedNotificationParameters {
    const reverseExchangeRate = 1 / transaction.exchangeRate;
    transaction.exchangeRate = reverseExchangeRate;
    const transactionParams = this.toTransactionParams(transaction, locale);

    return {
      ...transactionParams,
      companyName: companyName,
    };
  }

  static toWithdrawalFailedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): WithdrawalFailedNotificationParameters {
    const transactionParams = this.toTransactionParams(transaction, locale);
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
    const locale = debitConsumer.props.locale;
    const transactionParams = this.toTransactionParams(transaction, locale);
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
    const locale = creditConsumer.props.locale;
    const transactionParams = this.toTransactionParams(transaction, locale);
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
    const locale = debitConsumer.props.locale;
    const transactionParams = this.toTransactionParams(transaction, locale);
    return {
      ...transactionParams,
      creditConsumer_firstName: creditConsumer.props.firstName,
      creditConsumer_lastName: creditConsumer.props.lastName,
      creditConsumer_handle: creditConsumer.props.handle,
      debitConsumer_handle: debitConsumer.props.handle,
      reasonDeclined: "Something went wrong", // TODO (CRYPTO-698)
    };
  }

  static toCreditAdjustmentCompletedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): CreditAdjustmentCompletedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toCreditAdjustmentFailedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): CreditAdjustmentFailedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toDebitAdjustmentCompletedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): DebitAdjustmentCompletedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }

  static toDebitAdjustmentFailedNotificationParameters(
    transaction: Transaction,
    locale: string,
  ): DebitAdjustmentFailedNotificationParameters {
    return this.toTransactionParams(transaction, locale);
  }
}
