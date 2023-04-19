import { Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { EmailTemplates } from "./domain/EmailTemplates";
import { Utils } from "../../core/utils/Utils";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "./events/SendKycApprovedUSEvent";
import { SendKycApprovedNonUSEvent } from "./events/SendKycApprovedNonUSEvent";
import { SendKycDeniedEvent } from "./events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "./events/SendKycPendingOrFlaggedEvent";
import { SendDocumentVerificationPendingEvent } from "./events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "./events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "./events/SendDocumentVerificationTechnicalFailureEvent";
import { EmailClient } from "./emails/email.client";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { SendWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendDepositInitiatedEvent } from "./events/SendDepositInitiatedEvent";
import { SendDepositFailedEvent } from "./events/SendDepositFailedEvent";
import { SendWithdrawalInitiatedEvent } from "./events/SendWithdrawalInitiatedEvent";
import { SendWithdrawalFailedEvent } from "./events/SendWithdrawalFailedEvent";
import { SendTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendEmployerRequestEvent } from "./events/SendEmployerRequestEvent";
import { SendTransferFailedEvent } from "./events/SendTransferFailedEvent";
import { SendTransferReceivedEvent } from "./events/SendTransferReceivedEvent";
import { SendPayrollDepositCompletedEvent } from "./events/SendPayrollDepositCompletedEvent";
import { StubEmailClient } from "./emails/stub.email.client";

const SUPPORT_URL = "help.noba.com";
const SENDER_EMAIL = "Noba <no-reply@noba.com>";
const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";

const processCurrency = (currency): string => {
  if (currency === "USD") return "USDC";
  return currency;
};

@Injectable()
export class EmailEventHandler {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(configService: CustomConfigService, @Inject("EmailClient") private readonly emailClient: EmailClient) {}

  @OnEvent(`email.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendOtp(payload: SendOtpEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.OTP_EMAIL, payload.locale ?? "en"), //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
        one_time_password: payload.otp,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCode(payload: SendWalletUpdateVerificationCodeEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.WALLET_UPDATE_OTP, payload.locale ?? "en"),
      dynamicTemplateData: {
        user: payload.firstName ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`)
  public async sendWelcomeMessage(payload: SendWelcomeMessageEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.WELCOME_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {},
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`)
  public async sendKycApprovedUSEmail(payload: SendKycApprovedUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(
        EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL,
        payload.locale ?? "en",
      ),
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`)
  public async sendKycApprovedNonUSEmail(payload: SendKycApprovedNonUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(
        EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL,
        payload.locale ?? "en",
      ),
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_DENIED_EVENT}`)
  public async sendKycDeniedEmail(payload: SendKycDeniedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.KYC_DENIED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT}`)
  public async sendKycPendingOrFlaggedEmail(payload: SendKycPendingOrFlaggedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.KYC_FLAGGED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT}`)
  public async sendDocVerificationPendingEmail(payload: SendDocumentVerificationPendingEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT}`)
  public async sendDocVerificationRejectedEmail(payload: SendDocumentVerificationRejectedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT}`)
  public async sendDocVerificationFailedTechEmail(payload: SendDocumentVerificationTechnicalFailureEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(
        EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL,
        payload.locale ?? "en",
      ),
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  public async sendDepositCompletedEmail(payload: SendDepositCompletedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.creditAmount) + Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT}`)
  public async sendDepositInitiatedEmail(payload: SendDepositInitiatedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.creditAmount) + Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.DEPOSIT_INITIATED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`)
  public async sendDepositFailedEmail(payload: SendDepositFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.creditAmount) + Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.DEPOSIT_FAILED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  public async sendWithdrawalCompletedEmail(payload: SendWithdrawalCompletedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.debitAmount) - Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT}`)
  public async sendWithdrawalInitiatedEmail(payload: SendWithdrawalInitiatedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.debitAmount) - Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.WITHDRAWAL_INITIATED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`)
  public async sendWithdrawalFailedEmail(payload: SendWithdrawalFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.debitAmount) - Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.WITHDRAWAL_FAILED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  public async sendTransferCompletedEmail(payload: SendTransferCompletedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.TRANSFER_SUCCESSFUL_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`)
  public async sendTransferReceivedEvent(payload: SendTransferReceivedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.TRANSFER_RECEIVED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_firstName: payload.params.debitConsumer_firstName,
        debitConsumer_lastName: payload.params.debitConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_FAILED_EVENT}`)
  public async sendTransferFailedEmail(payload: SendTransferFailedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.TRANSFER_FAILED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        creditCurrency: processCurrency(payload.params.creditCurrency),
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT}`)
  public async sendPayrollDepositCompletedEmail(payload: SendPayrollDepositCompletedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.creditAmount) + Utils.roundTo2DecimalNumber(payload.params.totalFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.PAYROLL_DEPOSIT_COMPLETED_EMAIL, payload.locale ?? "en"),
      dynamicTemplateData: {
        firstName: payload.firstName,
        companyName: payload.params.companyName,
        transactionRef: payload.params.transactionRef,
        handle: payload.handle,
        executedTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
        creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
        nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT}`)
  public async sendEmployerRequestEmail(payload: SendEmployerRequestEvent) {
    const msg = {
      to: "kelsi@noba.com",
      from: SENDER_EMAIL,
      templateId: EmailTemplates.getOrDefault(EmailTemplates.EMPLOYER_REQUEST_EMAIL, "en"),
      dynamicTemplateData: {
        employerEmail: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  // BEGIN-NOSCAN
  @OnEvent("email.get")
  public async getPreviousNotifications() {
    if (this.emailClient instanceof StubEmailClient) {
      const emails = this.emailClient.getPreviousEmails();
      return emails;
    }
  }

  @OnEvent("email.clear")
  public async clearPreviousNotifications() {
    if (this.emailClient instanceof StubEmailClient) {
      this.emailClient.clearPreviousEmails();
    }
  }
  // END-NOSCAN
}
