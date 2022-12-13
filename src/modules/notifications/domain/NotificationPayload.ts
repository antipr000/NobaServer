import {
  CryptoFailedNotificationParameters,
  OrderExecutedNotificationParameters,
  OrderFailedNotificationParameters,
  TransactionInitiatedNotificationParameters,
} from "./TransactionNotificationParameters";

export type NotificationPayload = {
  email: string;
  otp?: string;
  walletAddress?: string;
  firstName?: string;
  lastName?: string;
  nobaUserID?: string;
  cardNetwork?: string;
  last4Digits?: string;
  transactionInitiatedParams?: TransactionInitiatedNotificationParameters;
  cryptoFailedParams?: CryptoFailedNotificationParameters;
  orderExecutedParams?: OrderExecutedNotificationParameters;
  orderFailedParams?: OrderFailedNotificationParameters;
  sessionID?: string;
  transactionID?: string;
  paymentToken?: string;
  processor?: string;
  responseCode?: string;
  responseSummary?: string;
};
