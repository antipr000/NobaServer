import {
  CryptoFailedEmailParameters,
  OrderExecutedEmailParameters,
  OrderFailedEmailParameters,
  TransactionInitiatedEmailParameters,
} from "../../../modules/common/domain/EmailParameters";

export type NotificationPayload = {
  email: string;
  otp?: string;
  walletAddress?: string;
  firstName?: string;
  lastName?: string;
  cardNetwork?: string;
  last4Digits?: string;
  transactionInitiatedParams?: TransactionInitiatedEmailParameters;
  cryptoFailedParams?: CryptoFailedEmailParameters;
  orderExecutedParams?: OrderExecutedEmailParameters;
  orderFailedParams?: OrderFailedEmailParameters;
  sessionID?: string;
  transactionID?: string;
  paymentToken?: string;
  processor?: string;
  responseCode?: string;
  responseSummary?: string;
};
