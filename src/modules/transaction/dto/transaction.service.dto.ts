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
  walletDepositRequest?: WalletDepositTransactionRequest;
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

export type WalletDepositTransactionRequest = {
  debitAmount: number;
  debitCurrency: Currency;
  debitConsumerIDOrTag: string;
  depositMode: WalletDepositMode;
  memo: string;
  sessionKey: string;
};

export enum WalletDepositMode {
  COLLECTION_LINK = "COLLECTION_LINK",
}

export const validateInitiateTransactionRequest = (request: InitiateTransactionRequest) => {
  const intiateTransactionRequestValidationKeys: KeysRequired<InitiateTransactionRequest> = {
    type: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    cardWithdrawalRequest: Joi.object().optional(),
    cardReversalRequest: Joi.object().optional(),
    payrollDepositRequest: Joi.object().optional(),
    cardCreditAdjustmentRequest: Joi.object().optional(),
    cardDebitAdjustmentRequest: Joi.object().optional(),
    creditAdjustmentRequest: Joi.object().optional(),
    debitAdjustmentRequest: Joi.object().optional(),
    walletDepositRequest: Joi.object().optional(),
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
      "walletDepositRequest",
    )
    .options({
      allowUnknown: false,
      stripUnknown: true,
    });

  Joi.attempt(request, initiateTransactionJoiSchema);
};
