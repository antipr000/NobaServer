// TODO: Separate this into what events support notifications on phone, email and webhook with a default preference for each?
export enum NotificationEventType {
  SEND_OTP_EVENT = "otp",
  SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT = "wallet.update.verification.code",
  SEND_WELCOME_MESSAGE_EVENT = "welcome.message",
  SEND_KYC_APPROVED_US_EVENT = "kyc.approved.us",
  SEND_KYC_APPROVED_NON_US_EVENT = "kyc.approved.non.us",
  SEND_KYC_DENIED_EVENT = "kyc.denied",
  SEND_KYC_PENDING_OR_FLAGGED_EVENT = "kyc.pending.or.flagged",
  SEND_DOCUMENT_VERIFICATION_PENDING_EVENT = "document.verification.pending",
  SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT = "document.verification.rejected",
  SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT = "document.verification.technical.failure",
  SEND_CARD_ADDED_EVENT = "card.added",
  SEND_CARD_ADDITION_FAILED_EVENT = "card.addition.failed",
  SEND_CARD_DELETED_EVENT = "card.deleted",
  SEND_TRANSACTION_INITIATED_EVENT = "transaction.initiated",
  SEND_CRYPTO_FAILED_EVENT = "crypto.failed",
  SEND_TRANSACTION_COMPLETED_EVENT = "transaction.completed",
  SEND_TRANSACTION_FAILED_EVENT = "transaction.failed",
  SEND_HARD_DECLINE_EVENT = "hard.decline",
}

export enum NotificationEventHandler {
  EMAIL = "email",
  WEBHOOK = "webhook",
}
