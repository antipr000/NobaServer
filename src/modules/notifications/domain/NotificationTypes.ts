export enum NotificationEventTypes {
  SEND_OTP_EVENT = "send.otp.event",
  SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT = "send.wallet.update.verification.code.event",
  SEND_WELCOME_MESSAGE_EVENT = "send.welcome.message.event",
  SEND_KYC_APPROVED_US_EVENT = "send.kyc.approved.us.event",
  SEND_KYC_APPROVED_NON_US_EVENT = "send.kyc.approved.non.us.event",
  SEND_KYC_DENIED_EVENT = "send.kyc.denied.event",
  SEND_KYC_PENDING_OR_FLAGGED_EVENT = "send.kyc.pending.or.flagged.event",
  SEND_DOCUMENT_VERIFICATION_PENDING_EVENT = "send.document.verification.pending.event",
  SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT = "send.document.verification.rejected.event",
  SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT = "send.document.verification.technical.failure.event",
  SEND_CARD_ADDED_EVENT = "send.card.added.event",
  SEND_CARD_ADDITION_FAILED_EVENT = "send.card.addition.failed.event",
  SEND_CARD_DELETED_EVENT = "send.card.deleted.event",
  SEND_TRANSACTION_INITIATED_EVENT = "send.transaction.intitiated.event",
  SEND_CRYPTO_FAILED_EVENT = "send.crypto.failed.event",
  SEND_ORDER_EXECUTED_EVENT = "send.order.executed.event",
  SEND_ORDER_FAILED_EVENT = "send.order.failed.event",
  SEND_HARD_DECLINE_EVENT = "send.hard.decline.event",
}

export enum NotificationEventHandlers {
  EMAIL = "email",
  WEBHOOK = "webhook",
}
