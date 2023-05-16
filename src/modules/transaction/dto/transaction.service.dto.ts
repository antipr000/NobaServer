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

export enum CardReversalTransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

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
  const intiateTransactionRequestValidationKeys: KeysRequired<InitiateTransactionRequest> = {
    type: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    cardWithdrawalRequest: Joi.object(cardWithdrawalJoiValidationKeys).optional(),
    cardReversalRequest: Joi.object(cardReversalJoiValidationKeys).optional(),
    payrollDepositRequest: Joi.object(payrollRequestJoiValidationKeys).optional(),
  };

  const initiateTransactionJoiSchema = Joi.object(intiateTransactionRequestValidationKeys)
    .xor("cardWithdrawalRequest", "cardReversalRequest", "payrollDepositRequest")
    .options({
      allowUnknown: false,
      stripUnknown: true,
    });

  Joi.attempt(request, initiateTransactionJoiSchema);
};
