export enum NotificationEventHandler {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  DASHBOARD = "dashboard",
}

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
  SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT = "payroll.deposit.completed",
  SEND_EMPLOYER_REQUEST_EVENT = "employee.request",
  SEND_REGISTER_NEW_EMPLOYEE_EVENT = "register.employee",
  SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT = "update.employee.allocation.amount",
  SEND_UPDATE_PAYROLL_STATUS_EVENT = "update.payroll.status",
  SEND_INVITE_EMPLOYEE_EVENT = "invite.employee",
}

type PreferredMedium = {
  [key in NotificationEventType]: NotificationEventHandler[];
};

export const preferredNotificationMedium: PreferredMedium = {
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
  [NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.PUSH],
  [NotificationEventType.SEND_DEPOSIT_FAILED_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.PUSH],
  [NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT]: [
    NotificationEventHandler.EMAIL,
    NotificationEventHandler.PUSH,
  ],
  [NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.PUSH],
  [NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT]: [
    NotificationEventHandler.EMAIL,
    NotificationEventHandler.PUSH,
  ],
  [NotificationEventType.SEND_TRANSFER_FAILED_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.PUSH],
  [NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT]: [NotificationEventHandler.EMAIL, NotificationEventHandler.PUSH],
  [NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT]: [
    NotificationEventHandler.EMAIL,
    NotificationEventHandler.PUSH,
  ],
  [NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT]: [NotificationEventHandler.EMAIL],
  [NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT]: [NotificationEventHandler.DASHBOARD],
  [NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT]: [NotificationEventHandler.DASHBOARD],
  [NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT]: [NotificationEventHandler.DASHBOARD],
};

type TemplateMap = {
  [key: string]: {
    en?: string;
    es?: string;
  };
};

export const emailTemplateExternalLinkMap: TemplateMap = {
  [NotificationEventType.SEND_OTP_EVENT]: {
    en: "d-62a393f5f89949f5a5a3d244a51ed2e7",
    es: "d-5e14091f8be44f9bb0689752411163a3",
  },
  [NotificationEventType.SEND_WELCOME_MESSAGE_EVENT]: {
    en: "d-0c8d633f6de545c6a562ac8e6d53917d",
    es: "d-cd852911b9014a719cd9c8d3b5b0a841",
  },
  [NotificationEventType.SEND_KYC_APPROVED_US_EVENT]: {
    en: "d-2d55cada60ab46209d6d5bcfe9c450d7",
    es: "d-874a99d468ca40b0b42b471d9213e1dd",
  },
  [NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT]: {
    // Same as US for now but this may eventually change.
    en: "d-2d55cada60ab46209d6d5bcfe9c450d7",
    es: "d-874a99d468ca40b0b42b471d9213e1dd",
  },
  [NotificationEventType.SEND_KYC_DENIED_EVENT]: {
    en: "d-fac2f33374c443cb855641727a735708",
    es: "d-e1e2826a573c4503a067cdc4cf560ca9",
  },
  [NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT]: {
    en: "d-d25d29442cf44338b72e15ea75bcab26",
    es: "d-953a7e77c37941688a871bb30e5e8d76",
  },
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT]: {
    en: "d-9f03c94f41f64b6ea2ec9343f1bc8b7f",
    es: "d-df43f46868d946aeb8a660b8eacf609f",
  },
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT]: {
    en: "d-06519883cba548dba2f2202ad58b12fa",
  },
  [NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT]: {
    en: "d-b523c0e37772460bbd60e14af2fa50a0",
  },
  [NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT]: {
    en: "d-ac14193dfd58407fb2fc5594ad6e2108",
  },
  [NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT]: {
    en: "d-f085402c06584fe2a843c8e9dff2ed4b",
    es: "d-d6b8f9ac6d3e414cb8da0c38216a9d26",
  },
  [NotificationEventType.SEND_DEPOSIT_FAILED_EVENT]: {
    en: "d-910099ff234c432f9c2246c71961353e",
    es: "d-90642bf2c09c41b58bd4c74b985c516b",
  },
  [NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT]: {
    en: "d-7e413692c9f8497c80d5b5e2a5218171",
    es: "d-d77bf9be0e1b417cbcb1375ec47f3263",
  },
  [NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT]: {
    en: "d-3fb3c83cdfd346ffa2d4c4021bc4ef2b",
    es: "d-9af9b2e7e2eb49ef8292bb6cb71945f1",
  },
  [NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT]: {
    en: "d-13a9459f11bb458aac117ad66dd1ccff",
    es: "d-020b26b11925437681157745f9967d76",
  },
  [NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT]: {
    en: "d-910099ff234c432f9c2246c71961353e",
    es: "d-b468886c63f140cb87d3b4c907ee9fb5",
  },
  [NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT]: {
    en: "d-1c758bcf9eae40ed83c3cd9152ed17c4",
    es: "d-82d724063f4c42ad928a30e7998bcd76",
  },
  [NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT]: {
    en: "d-003b215b896947ffa52c90fbafb9b33c",
    es: "d-e3de834595c44e09983e69db1c4c018e",
  },
  [NotificationEventType.SEND_TRANSFER_FAILED_EVENT]: {
    en: "d-c2f615c6c81147c9b3666cb6fd1c93b8",
    es: "d-d806e77606f04b7fb953aaa728f8ae2a",
  },
  [NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT]: {
    en: "d-4adb4c910e90462788ddda3ac24d1d2c",
    es: "d-c2f667576671406b8d7323a7b04b27f7",
  },
  [NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT]: {
    en: "d-db917173c48448fb90dadcb77259f4cc",
  },
  [NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT]: {
    en: "d-d0cee49e89d34a479394d84d01656f84",
    es: "d-1b01521028054dcbb9739a554bc38b0a",
  },
};

export const smsTemplateStringMap: TemplateMap = {
  [NotificationEventType.SEND_OTP_EVENT]: {
    en: "{{otp}} is your one-time password for Noba login.",
    es: "{{otp}} es su contraseña de un solo uso para iniciar sesión en Noba.",
  },
  [NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT]: {
    en: "{{otp}} is your one-time password to verify your phone number with Noba.",
    es: "{{otp}} es su contraseña de un solo uso para verificar su número de teléfono con Noba.",
  },
  [NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT]: {
    en: "{{otp}} is your wallet verification code.",
    es: "{{otp}} es su código de verificación de billetera.",
  },
};

export const pushEventTemplateStringMap: TemplateMap = {
  [NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT]: {
    en: "Successfully deposited {{amount}} {{currency}} into your Noba account",
    es: "Se han depositado correctamente {{amount}} {{currency}} en tu cuenta de Noba",
  },
  [NotificationEventType.SEND_DEPOSIT_FAILED_EVENT]: {
    en: "Failed to deposit {{amount}} {{currency}} into your Noba account",
    es: "No se ha podido depositar {{amount}} {{currency}} en tu cuenta de Noba",
  },
  [NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT]: {
    en: "Successfully withdrew {{amount}} {{currency}} from your Noba account",
    es: "Se han retirado correctamente {{amount}} {{currency}} de tu cuenta de Noba",
  },
  [NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT]: {
    en: "Failed to withdraw {{amount}} {{currency}} from your Noba account",
    es: "No se ha podido retirar {{amount}} {{currency}} de tu cuenta de Noba",
  },
  [NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT]: {
    en: "Successfully sent {{amount}} {{currency}} to {{receiverHandle}}",
    es: "Se han enviado correctamente {{amount}} {{currency}} a {{receiverHandle}}",
  },
  [NotificationEventType.SEND_TRANSFER_FAILED_EVENT]: {
    en: "Failed to send {{amount}} {{currency}} to {{receiverHandle}}",
    es: "No se ha podido enviar {{amount}} {{currency}} a {{receiverHandle}}",
  },
  [NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT]: {
    en: "You received {{amount}} {{currency}} from {{senderHandle}}",
    es: "Has recibido {{amount}} {{currency}} de {{senderHandle}}",
  },
  [NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT]: {
    en: "Payroll deposit of amount {{amount}} {{currency}} completed for company {{companyName}}",
    es: "Depósito de nómina de importe {{amount}} {{currency}} completado para la empresa {{companyName}}",
  },
};
