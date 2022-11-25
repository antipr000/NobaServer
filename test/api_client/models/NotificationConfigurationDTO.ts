/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type NotificationConfigurationDTO = {
  notificationEventType:
    | "otp"
    | "wallet.update.verification.code"
    | "welcome.message"
    | "kyc.approved.us"
    | "kyc.approved.non.us"
    | "kyc.denied"
    | "kyc.pending.or.flagged"
    | "document.verification.pending"
    | "document.verification.rejected"
    | "document.verification.technical.failure"
    | "card.added"
    | "card.addition.failed"
    | "card.deleted"
    | "transaction.initiated"
    | "crypto.failed"
    | "transaction.completed"
    | "transaction.failed"
    | "hard.decline";
  notificationEventHandler: "email" | "webhook";
};
