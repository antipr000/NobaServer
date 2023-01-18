import { Consumer } from "../../../modules/consumer/domain/Consumer";
import {
  CryptoFailedNotificationParameters,
  OrderExecutedNotificationParameters,
  OrderFailedNotificationParameters,
  TransactionInitiatedNotificationParameters,
} from "./TransactionNotificationParameters";

export type NotificationPayload = {
  email: string;
  locale: string;
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

export function prepareNotificationPayload(
  consumer: Consumer,
  additionalPayload: Partial<NotificationPayload>,
): NotificationPayload {
  return {
    email: consumer.props.email,
    firstName: consumer.props.firstName,
    lastName: consumer.props.lastName,
    nobaUserID: consumer.props.id,
    locale: consumer.props.locale ?? "en",
    ...additionalPayload,
  };
}
