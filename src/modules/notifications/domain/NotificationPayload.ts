import { Consumer } from "../../../modules/consumer/domain/Consumer";
import {
  DepositCompletedNotificationParameters,
  DepositFailedNotificationParameters,
  DepositInitiatedNotificationParameters,
  TransferCompletedNotificationParameters,
  WithdrawalCompletedNotificationParameters,
  WithdrawalFailedNotificationParameters,
  WithdrawalIntiatedNotificationParameters,
} from "./TransactionNotificationParameters";

export type NotificationPayload = {
  email: string;
  locale?: string;
  otp?: string;
  handle?: string;
  walletAddress?: string;
  firstName?: string;
  lastName?: string;
  nobaUserID?: string;
  cardNetwork?: string;
  last4Digits?: string;
  depositCompletedParams?: DepositCompletedNotificationParameters;
  depositInitiatedParams?: DepositInitiatedNotificationParameters;
  depositFailedParams?: DepositFailedNotificationParameters;
  withdrawalCompletedParams?: WithdrawalCompletedNotificationParameters;
  withdrawalInitiatedParams?: WithdrawalIntiatedNotificationParameters;
  withdrawalFailedParams?: WithdrawalFailedNotificationParameters;
  transferCompletedParams?: TransferCompletedNotificationParameters;
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
    handle: consumer.props.handle,
    nobaUserID: consumer.props.id,
    locale: consumer.props.locale ?? "en",
    ...additionalPayload,
  };
}
