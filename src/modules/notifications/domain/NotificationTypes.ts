// TODO: Separate this into what events support notifications on phone, email and webhook with a default preference for each?
export enum NotificationEventType {
  SEND_OTP_EVENT = "otp",
  SEND_PHONE_VERIFICATION_CODE_EVENT = "phone.verification.code",
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
  SEND_HARD_DECLINE_EVENT = "hard.decline",
  SEND_DEPOSIT_INITIATED_EVENT = "deposit.initiated",
  SEND_DEPOSIT_COMPLETED_EVENT = "deposit.completed",
  SEND_DEPOSIT_FAILED_EVENT = "deposit.failed",
  SEND_WITHDRAWAL_INITIATED_EVENT = "withdrawal.initiated",
  SEND_WITHDRAWAL_COMPLETED_EVENT = "withdrawal.completed",
  SEND_WITHDRAWAL_FAILED_EVENT = "withdrawal.failed",
  SEND_TRANSFER_COMPLETED_EVENT = "transfer.completed",
  SEND_TRANSFER_FAILED_EVENT = "transfer.failed",
  SEND_TRANSFER_RECEIVED_EVENT = "transfer.received",
  SEND_COLLECTION_LINK_EVENT = "collection.link",
  SEND_COLLECTION_COMPLETED_EVENT = "collection.completed",
  SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT = "payroll.deposit.completed",
  SEND_EMPLOYER_REQUEST_EVENT = "employee.request",
  SEND_REGISTER_NEW_EMPLOYEE_EVENT = "register.employee",
  SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT = "update.employee.allocation.amount",
  SEND_UPDATE_PAYROLL_STATUS_EVENT = "update.payroll.status",
}

export enum NotificationEventHandler {
  EMAIL = "email",
  WEBHOOK = "webhook",
  SMS = "sms",
  DASHBOARD = "dashboard",
}

export enum NotificationWorkflowTypes {
  COLLECTION_LINK_EVENT = "collectionLinkEvent",
  COLLECTION_COMPLETED_EVENT = "collectionCompletedEvent",
  DEPOSIT_COMPLETED_EVENT = "depositCompletedEvent",
  DEPOSIT_FAILED_EVENT = "depositFailedEvent",
  WITHDRAWAL_COMPLETED_EVENT = "withdrawalCompletedEvent",
  WITHDRAWAL_FAILED_EVENT = "withdrawalFailedEvent",
  TRANSFER_COMPLETED_EVENT = "transferCompletedEvent",
  TRANSFER_FAILED_EVENT = "transferFailedEvent",
  PAYROLL_DEPOSIT_COMPLETED_EVENT = "payrollDepositCompletedEvent",
  UPDATE_PAYROLL_STATUS_EVENT = "updatePayrollStatusEvent",
}

export const preferredNotificationMedium = {
  [NotificationEventType.SEND_OTP_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.SMS],
  [NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT]: [NotificationEventHandler.SMS],
  [NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT]: [
    NotificationEventHandler.EMAIL,
    NotificationEventHandler.SMS,
  ],
  [NotificationEventType.SEND_WELCOME_MESSAGE_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_KYC_APPROVED_US_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_KYC_DENIED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_CARD_ADDED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_CARD_DELETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_HARD_DECLINE_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DEPOSIT_FAILED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_TRANSFER_FAILED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_COLLECTION_LINK_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_COLLECTION_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT]: [NotificationEventHandler.DASHBOARD],
  [NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT]: [NotificationEventHandler.DASHBOARD],
  [NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT]: [NotificationEventHandler.DASHBOARD],
};
