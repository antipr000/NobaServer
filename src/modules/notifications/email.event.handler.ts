import { Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
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
import { EventHandlers } from "./domain/EventHandlers";
import { EventRepo } from "./repos/event.repo";
import { SendInviteEmployeeEvent } from "./events/SendInviteEmployeeEvent";
import { QRService } from "../common/qrcode.service";
import { S3Service } from "../common/s3.service";
import { QR_CODES_BASE_URL, QR_CODES_FOLDER_BUCKET_PATH } from "../../config/ConfigurationUtils";
import { SendScheduledReminderEvent } from "./events/SendScheduledReminderEvent";

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

  @Inject("EventRepo")
  private readonly eventRepo: EventRepo;

  @Inject()
  private readonly qrCodeService: QRService;

  @Inject()
  private readonly s3Service: S3Service;

  constructor(
    private readonly configService: CustomConfigService,
    @Inject("EmailClient") private readonly emailClient: EmailClient,
  ) {}

  private async getOrDefaultTemplateId(eventIDOrName: string, locale: string): Promise<string> {
    const event = await this.eventRepo.getEventByIDOrName(eventIDOrName);
    const emailTemplates = event.templates.filter(template => template.type === EventHandlers.EMAIL);
    locale = locale?.toLowerCase() ?? "en";
    if (emailTemplates.find(template => template.locale === locale)) {
      return emailTemplates.find(template => template.locale === locale).externalKey;
    }

    const localePrefix = locale.split("_")[0];

    if (emailTemplates.find(template => template.locale === localePrefix)) {
      return emailTemplates.find(template => template.locale === localePrefix).externalKey;
    }

    return emailTemplates.find(template => template.locale === "en").externalKey;
  }

  @OnEvent(`email.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendOtp(payload: SendOtpEvent) {
    const templateID = await this.getOrDefaultTemplateId(NotificationEventType.SEND_OTP_EVENT, payload.locale);
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID, //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
        one_time_password: payload.otp,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCode(payload: SendWalletUpdateVerificationCodeEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
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
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {},
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`)
  public async sendKycApprovedUSEmail(payload: SendKycApprovedUSEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`)
  public async sendKycApprovedNonUSEmail(payload: SendKycApprovedNonUSEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_DENIED_EVENT}`)
  public async sendKycDeniedEmail(payload: SendKycDeniedEvent) {
    const templateID = await this.getOrDefaultTemplateId(NotificationEventType.SEND_KYC_DENIED_EVENT, payload.locale);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT}`)
  public async sendKycPendingOrFlaggedEmail(payload: SendKycPendingOrFlaggedEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT}`)
  public async sendDocVerificationPendingEmail(payload: SendDocumentVerificationPendingEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName ?? "",
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT}`)
  public async sendDocVerificationRejectedEmail(payload: SendDocumentVerificationRejectedEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT}`)
  public async sendDocVerificationFailedTechEmail(payload: SendDocumentVerificationTechnicalFailureEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  public async sendDepositCompletedEmail(payload: SendDepositCompletedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.creditAmountNumber + payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT}`)
  public async sendDepositInitiatedEmail(payload: SendDepositInitiatedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.creditAmountNumber + payload.params.totalFeesNumber,
      payload.locale,
    );

    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`)
  public async sendDepositFailedEmail(payload: SendDepositFailedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.creditAmountNumber + payload.params.totalFeesNumber,
      payload.locale,
    );

    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
      payload.locale,
    );
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  public async sendWithdrawalCompletedEmail(payload: SendWithdrawalCompletedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );

    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT}`)
  public async sendWithdrawalInitiatedEmail(payload: SendWithdrawalInitiatedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`)
  public async sendWithdrawalFailedEmail(payload: SendWithdrawalFailedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
      payload.locale,
    );
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  public async sendTransferCompletedEmail(payload: SendTransferCompletedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        subtotal: subtotal,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`)
  public async sendTransferReceivedEvent(payload: SendTransferReceivedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_firstName: payload.params.debitConsumer_firstName,
        debitConsumer_lastName: payload.params.debitConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        subtotal: subtotal,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_FAILED_EVENT}`)
  public async sendTransferFailedEmail(payload: SendTransferFailedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.debitAmountNumber - payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
      payload.locale,
    );

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        creditConsumer_firstName: payload.params.creditConsumer_firstName,
        creditConsumer_lastName: payload.params.creditConsumer_lastName,
        debitConsumer_handle: payload.params.debitConsumer_handle,
        creditConsumer_handle: payload.params.creditConsumer_handle,
        firstName: payload.firstName,
        debitAmount: payload.params.debitAmount,
        debitCurrency: processCurrency(payload.params.debitCurrency),
        creditAmount: payload.params.creditAmount,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        subtotal: subtotal,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT}`)
  public async sendPayrollDepositCompletedEmail(payload: SendPayrollDepositCompletedEvent) {
    const subtotal = Utils.localizeAmount(
      payload.params.creditAmountNumber + payload.params.totalFeesNumber,
      payload.locale,
    );
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
      payload.locale,
    );
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        companyName: payload.params.companyName,
        transactionRef: payload.params.transactionRef,
        handle: payload.handle,
        executedTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        creditCurrency: processCurrency(payload.params.creditCurrency),
        debitCurrency: processCurrency(payload.params.debitCurrency),
        debitAmount: payload.params.debitAmount,
        creditAmount: payload.params.creditAmount,
        subtotal: subtotal,
        processingFees: payload.params.processingFees,
        nobaFees: payload.params.nobaFees,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT}`)
  public async sendEmployerRequestEmail(payload: SendEmployerRequestEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT,
      payload.locale,
    );

    const msg = {
      to: "kelsi@noba.com",
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        employerEmail: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT}`)
  public async sendInviteEmployeeEmail(payload: SendInviteEmployeeEvent) {
    const templateID = await this.getOrDefaultTemplateId(
      NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT,
      payload.locale,
    );

    const folderPath = this.configService.get(QR_CODES_FOLDER_BUCKET_PATH);
    const fileName = `employee_${payload.employeeID}.png`;
    const desinationPath = `${this.configService.get(QR_CODES_BASE_URL)}/${folderPath}/${fileName}`;

    const base64EncodedQRCode = await this.qrCodeService.generateQRCode(payload.inviteUrl);
    const buffer = Buffer.from(base64EncodedQRCode.replace(/^data:image\/\w+;base64,/, ""), "base64");

    await this.s3Service.uploadToS3(folderPath, fileName, buffer, "base64", "image/png");

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        companyName: payload.companyName,
        qrCodeImageUrl: desinationPath,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

  // Disabling this from handling reminder events, will uncomment when we will use it
  // @OnEvent(`email.${NotificationEventType.SEND_SCHEDULED_REMINDER_EVENT}`)
  public async sendScheduledReminderEvent(payload: SendScheduledReminderEvent) {
    const templateID = await this.getOrDefaultTemplateId(payload.eventID, payload.locale);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: templateID,
      dynamicTemplateData: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        handle: payload.handle,
      },
    };

    await this.emailClient.sendEmail(msg);
  }

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
}
