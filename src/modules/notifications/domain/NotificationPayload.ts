import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import {
  DepositCompletedNotificationParameters,
  DepositFailedNotificationParameters,
  DepositInitiatedNotificationParameters,
  PayrollDepositCompletedNotificationParameters,
  TransferCompletedNotificationParameters,
  TransferFailedNotificationParameters,
  TransferReceivedNotificationParameters,
  WithdrawalCompletedNotificationParameters,
  WithdrawalFailedNotificationParameters,
  WithdrawalIntiatedNotificationParameters,
} from "./TransactionNotificationParameters";

export type NotificationPayload = {
  email?: string;
  phone?: string;
  locale: string;
  otp?: string;
  handle?: string;
  walletAddress?: string;
  firstName?: string;
  lastName?: string;
  nobaUserID?: string;
  cardNetwork?: string;
  last4Digits?: string;
  pushTokens?: string[];
  depositCompletedParams?: DepositCompletedNotificationParameters;
  depositInitiatedParams?: DepositInitiatedNotificationParameters;
  depositFailedParams?: DepositFailedNotificationParameters;
  withdrawalCompletedParams?: WithdrawalCompletedNotificationParameters;
  withdrawalInitiatedParams?: WithdrawalIntiatedNotificationParameters;
  withdrawalFailedParams?: WithdrawalFailedNotificationParameters;
  transferCompletedParams?: TransferCompletedNotificationParameters;
  transferReceivedParams?: TransferReceivedNotificationParameters;
  transferFailedParams?: TransferFailedNotificationParameters;
  payrollDepositCompletedParams?: PayrollDepositCompletedNotificationParameters;
  sessionID?: string;
  transactionID?: string;
  paymentToken?: string;
  processor?: string;
  responseCode?: string;
  responseSummary?: string;
  employerReferralID?: string;
  allocationAmountInPesos?: number;
  nobaEmployeeID?: string;
  nobaPayrollID?: string;
  payrollStatus?: PayrollStatus;
};

export function prepareNotificationPayload(
  consumer: Consumer,
  additionalPayload: Partial<NotificationPayload>,
): NotificationPayload {
  return {
    email: consumer.props.email,
    phone: consumer.props.phone,
    firstName: consumer.props.firstName,
    lastName: consumer.props.lastName,
    handle: consumer.props.handle,
    nobaUserID: consumer.props.id,
    locale: consumer.props.locale ?? "en",
    ...additionalPayload,
  };
}
