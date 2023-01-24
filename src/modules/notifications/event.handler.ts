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
import { SendCardAddedEvent } from "./events/SendCardAddedEvent";
import { SendCardAdditionFailedEvent } from "./events/SendCardAdditionFailedEvent";
import { SendCardDeletedEvent } from "./events/SendCardDeletedEvent";
import { SendHardDeclineEvent } from "./events/SendHardDeclineEvent";
import { EmailService } from "./emails/email.service";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { SendWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendDepositInitiatedEvent } from "./events/SendDepositInitiatedEvent";
import { SendDepositFailedEvent } from "./events/SendDepositFailedEvent";
import { SendWithdrawalInitiatedEvent } from "./events/SendWithdrawalInitiatedEvent";
import { SendWithdrawalFailedEvent } from "./events/SendWithdrawalFailedEvent";
import { SendTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendCollectionCompletedEvent } from "./events/SendCollectionCompletedEvent";

const SUPPORT_URL = "help.noba.com";
const SENDER_EMAIL = "Noba <no-reply@noba.com>";
const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";

@Injectable()
export class EventHandler {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(
    configService: CustomConfigService,
    @Inject("EmailService") private readonly emailService: EmailService,
  ) {}

  @OnEvent(`email.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendOtp(payload: SendOtpEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.OTP_EMAIL[payload.locale ?? "en"], //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCode(payload: SendWalletUpdateVerificationCodeEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WALLET_UPDATE_OTP[payload.locale ?? "en"],
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`)
  public async sendWelcomeMessage(payload: SendWelcomeMessageEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`)
  public async sendKycApprovedUSEmail(payload: SendKycApprovedUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`)
  public async sendKycApprovedNonUSEmail(payload: SendKycApprovedNonUSEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_DENIED_EVENT}`)
  public async sendKycDeniedEmail(payload: SendKycDeniedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        duration: 2, // TODO: Remove hardcoded duration
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT}`)
  public async sendKycPendingOrFlaggedEmail(payload: SendKycPendingOrFlaggedEvent) {
    const minutesFromNow = 10; // TODO: Remove hardcoded minutes
    const futureDate = new Date(new Date().getTime() + minutesFromNow * 60000).toUTCString();

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_FLAGGED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        datetimestamp: futureDate,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT}`)
  public async sendDocVerificationPendingEmail(payload: SendDocumentVerificationPendingEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT}`)
  public async sendDocVerificationRejectedEmail(payload: SendDocumentVerificationRejectedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT}`)
  public async sendDocVerificationFailedTechEmail(payload: SendDocumentVerificationTechnicalFailureEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_ADDED_EVENT}`)
  public async sendCardAddedEmail(payload: SendCardAddedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT}`)
  public async sendCardAdditionFailedEmail(payload: SendCardAdditionFailedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_CARD_DELETED_EVENT}`)
  public async sendCardDeletedEmail(payload: SendCardDeletedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  // TODO(jira/CRYPTO-604): Fix the parameters once template is ready
  @OnEvent(`email.${NotificationEventType.SEND_COLLECTION_COMPLETED_EVENT}`)
  public async sendCollectionCompletedEvent(payload: SendCollectionCompletedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.COLLECTION_COMPLETED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  public async sendDepositCompletedEmail(payload: SendDepositCompletedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        debitAmount: payload.params.debitAmount,
        creditAmount: payload.params.creditAmount,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT}`)
  public async sendDepositInitiatedEmail(payload: SendDepositInitiatedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_INITIATED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        totalPrice: payload.params.totalPrice,
        debitCurrency: payload.params.debitCurrency,
        creditAmount: payload.params.creditAmount,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`)
  public async sendDepositFailedEmail(payload: SendDepositFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_FAILED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        totalPrice: payload.params.totalPrice,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  public async sendWithdrawalCompletedEmail(payload: SendWithdrawalCompletedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        creditAmount: payload.params.creditAmount,
        creditCurrency: payload.params.creditCurrency,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT}`)
  public async sendWithdrawalInitiatedEmail(payload: SendWithdrawalInitiatedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_INITIATED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        withdrawalAmount: payload.params.withdrawalAmount,
        creditCurrency: payload.params.creditCurrency,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        debitCurrency: payload.params.debitCurrency,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`)
  public async sendWithdrawalFailedEmail(payload: SendWithdrawalFailedEvent) {
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_FAILED_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        debitCurrency: payload.params.debitCurrency,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
        reasonDeclined: payload.params.reasonDeclined,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  public async sendTransferCompletedEmail(payload: SendTransferCompletedEvent) {
    const msg = {
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSFER_SUCCESSFUL_EMAIL[payload.locale ?? "en"],
      dynamicTemplateData: {
        firstName: payload.name,
        debitAmount: payload.params.debitAmount,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: payload.params.processingFees,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
      },
    };

    await this.emailService.sendEmail(msg);
  }

  @OnEvent(`email.${NotificationEventType.SEND_HARD_DECLINE_EVENT}`)
  public async sendHardDeclineEmail(payload: SendHardDeclineEvent) {
    const msg = {
      to: NOBA_COMPLIANCE_EMAIL,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.NOBA_INTERNAL_HARD_DECLINE[payload.locale ?? "en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        session_id: payload.sessionID,
        transaction_id: payload.transactionID,
        payment_token: payload.paymentToken,
        processor: payload.processor,
        timestamp: new Date().toLocaleString(),
        response_code: payload.responseCode,
        summary: payload.responseSummary,
      },
    };

    await this.emailService.sendEmail(msg);
  }
}
