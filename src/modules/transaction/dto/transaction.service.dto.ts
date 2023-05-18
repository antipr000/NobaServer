import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";

export type InitiateTransactionRequest = {
  // TODO: Replace `WorkflowName` with `TransactionType` enum.
  type: WorkflowName;

  cardWithdrawalRequest?: CardWithdrawalTransactionRequest;
  cardReversalRequest?: CardReversalTransactionRequest;
  payrollDepositRequest?: PayrollDepositTransactionRequest;
  cardCreditAdjustmentRequest?: CardCreditAdjustmentTransactionRequest;
  cardDebitAdjustmentRequest?: CardDebitAdjustmentTransactionRequest;
  creditAdjustmentRequest?: CreditAdjustmentTransactionRequest;
  debitAdjustmentRequest?: DebitAdjustmentTransactionRequest;
};

export type CardWithdrawalTransactionRequest = {
  nobaTransactionID: string;
  debitConsumerID: string;
  debitAmountInUSD: number;
  creditAmount: number;
  creditCurrency: Currency;
  exchangeRate: number;
  memo: string;
};

export type CardReversalTransactionRequest = {
  type: CardReversalTransactionType;
  nobaTransactionID: string;
  consumerID: string;
  amountInUSD: number;
  exchangeRate: number;
  memo: string;
};

export type PayrollDepositTransactionRequest = {
  disbursementID: string;
};

export type CreditAdjustmentTransactionRequest = {
  creditConsumerID: string;
  creditAmount: number;
  creditCurrency: string;
  memo: string;
};

export type DebitAdjustmentTransactionRequest = {
  debitConsumerID: string;
  debitAmount: number;
  debitCurrency: string;
  memo: string;
};

export enum CardReversalTransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export type CardCreditAdjustmentTransactionRequest = {
  debitAmount: number;
  debitCurrency: Currency;
  creditAmount: number;
  creditCurrency: Currency;
  exchangeRate: number;
  memo: string;
  creditConsumerID: string;
};

export type CardDebitAdjustmentTransactionRequest = {
  debitAmount: number;
  debitCurrency: Currency;
  creditAmount: number;
  creditCurrency: Currency;
  exchangeRate: number;
  memo: string;
  debitConsumerID: string;
};

export const validateInitiateTransactionRequest = (request: InitiateTransactionRequest) => {
  const cardWithdrawalJoiValidationKeys: KeysRequired<CardWithdrawalTransactionRequest> = {
    nobaTransactionID: Joi.string().required(),
    debitConsumerID: Joi.string().required(),
    debitAmountInUSD: Joi.number().required(),
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
  };
  const cardReversalJoiValidationKeys: KeysRequired<CardReversalTransactionRequest> = {
    type: Joi.string()
      .required()
      .valid(...Object.values(CardReversalTransactionType)),
    nobaTransactionID: Joi.string().required(),
    consumerID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
  };
  const payrollRequestJoiValidationKeys: KeysRequired<PayrollDepositTransactionRequest> = {
    disbursementID: Joi.string().required(),
  };
  const cardCreditAdjustmentJoiValidationKeys: KeysRequired<CardCreditAdjustmentTransactionRequest> = {
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
    creditConsumerID: Joi.string().required(),
  };
  const cardDebitAdjustmentJoiValidationKeys: KeysRequired<CardDebitAdjustmentTransactionRequest> = {
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
    debitConsumerID: Joi.string().required(),
  };
  const creditAdjustmentJoiValidationKeys: KeysRequired<CreditAdjustmentTransactionRequest> = {
    creditConsumerID: Joi.string().required(),
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
  };
  const debitAdjustmentJoiValidationKeys: KeysRequired<DebitAdjustmentTransactionRequest> = {
    debitConsumerID: Joi.string().required(),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
  };
  const intiateTransactionRequestValidationKeys: KeysRequired<InitiateTransactionRequest> = {
    type: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    cardWithdrawalRequest: Joi.object(cardWithdrawalJoiValidationKeys).optional(),
    cardReversalRequest: Joi.object(cardReversalJoiValidationKeys).optional(),
    payrollDepositRequest: Joi.object(payrollRequestJoiValidationKeys).optional(),
    cardCreditAdjustmentRequest: Joi.object(cardCreditAdjustmentJoiValidationKeys).optional(),
    cardDebitAdjustmentRequest: Joi.object(cardDebitAdjustmentJoiValidationKeys).optional(),
    creditAdjustmentRequest: Joi.object(creditAdjustmentJoiValidationKeys).optional(),
    debitAdjustmentRequest: Joi.object(debitAdjustmentJoiValidationKeys).optional(),
  };

  const initiateTransactionJoiSchema = Joi.object(intiateTransactionRequestValidationKeys)
    .xor(
      "cardWithdrawalRequest",
      "cardReversalRequest",
      "payrollDepositRequest",
      "cardCreditAdjustmentRequest",
      "cardDebitAdjustmentRequest",
      "creditAdjustmentRequest",
      "debitAdjustmentRequest",
    )
    .options({
      allowUnknown: false,
      stripUnknown: true,
    });

  Joi.attempt(request, initiateTransactionJoiSchema);
};
