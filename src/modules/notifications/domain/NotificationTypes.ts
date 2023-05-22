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
  SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT = "payroll.deposit.completed",
  SEND_EMPLOYER_REQUEST_EVENT = "employee.request",
  SEND_UPDATE_PAYROLL_STATUS_EVENT = "update.payroll.status",
  SEND_INVITE_EMPLOYEE_EVENT = "invite.employee",
<<<<<<< HEAD
  SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT = "credit.adjustment.completed",
  SEND_CREDIT_ADJUSTMENT_FAILED_EVENT = "credit.adjustment.failed",
  SEND_DEBIT_ADJUSTMENT_COMPLETED_EVENT = "debit.adjustment.completed",
  SEND_DEBIT_ADJUSTMENT_FAILED_EVENT = "debit.adjustment.failed",
=======
  SEND_SCHEDULED_REMINDER_EVENT = "scheduled.reminder",
>>>>>>> 4b050baa (Fixed event handlers and tests)
}

export enum NotificationWorkflowTypes {
  COLLECTION_LINK_EVENT = "collectionLinkEvent",
  DEPOSIT_COMPLETED_EVENT = "depositCompletedEvent",
  DEPOSIT_FAILED_EVENT = "depositFailedEvent",
  WITHDRAWAL_COMPLETED_EVENT = "withdrawalCompletedEvent",
  WITHDRAWAL_FAILED_EVENT = "withdrawalFailedEvent",
  TRANSFER_COMPLETED_EVENT = "transferCompletedEvent",
  TRANSFER_FAILED_EVENT = "transferFailedEvent",
  PAYROLL_DEPOSIT_COMPLETED_EVENT = "payrollDepositCompletedEvent",
  UPDATE_PAYROLL_STATUS_EVENT = "updatePayrollStatusEvent",
  CREDIT_ADJUSTMENT_COMPLETED_EVENT = "creditAdjustmentCompletedEvent",
  CREDIT_ADJUSTMENT_FAILED_EVENT = "creditAdjustmentFailedEvent",
  DEBIT_ADJUSTMENT_COMPLETED_EVENT = "debitAdjustmentCompletedEvent",
  DEBIT_ADJUSTMENT_FAILED_EVENT = "debitAdjustmentFailedEvent",
}
