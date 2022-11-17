import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
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
import { SendTransactionInitiatedEvent } from "./events/SendTransactionInitiatedEvent";
import { SendCryptoFailedEvent } from "./events/SendCryptoFailedEvent";
import { SendOrderExecutedEvent } from "./events/SendOrderExecutedEvent";
import { SendOrderFailedEvent } from "./events/SendOrderFailedEvent";
import { SendHardDeclineEvent } from "./events/SendHardDeclineEvent";
import { Partner } from "../partner/domain/Partner";
import { PartnerService } from "../partner/partner.service";
import { NotificationDTO, WebhookType } from "../partner/domain/WebhookTypes";
import axios, { AxiosRequestConfig } from "axios";
import { KYCStatus } from "../consumer/domain/VerificationStatus";

@Injectable()
export class WebhookService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly partnerService: PartnerService;

  private async makeRequest(partner: Partner, payload: NotificationDTO, url: string): Promise<void> {
    const axiosRequestConfig: AxiosRequestConfig = {
      auth: {
        username: partner.props.webhookClientID,
        password: partner.props.webhookSecret,
      },
    };

    try {
      this.logger.info(`Webhook Payload: ${JSON.stringify(payload, null, 1)}`);
      await axios.post(url, payload, axiosRequestConfig);
    } catch (e) {
      this.logger.error(
        `Failed to make webhook call for partner id ${partner.props._id}, with payload: ${JSON.stringify(
          payload,
        )}. Reason: ${e.message}`,
      );
    }
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendOtp(payload: SendOtpEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_OTP_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.name,
      },
      otpData: {
        otp: payload.otp,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCode(payload: SendWalletUpdateVerificationCodeEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.name,
      },
      otpData: {
        otp: payload.otp,
        walletAddress: payload.walletAddress,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`)
  public async sendWelcomeMessage(payload: SendWelcomeMessageEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`)
  public async sendKycApprovedUSMessage(payload: SendKycApprovedUSEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.APPROVED,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`)
  public async sendKycApprovedNonUSMessage(payload: SendKycApprovedNonUSEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.APPROVED,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_DENIED_EVENT}`)
  public async sendKycDeniedMessage(payload: SendKycDeniedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_KYC_DENIED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.REJECTED,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`email.${NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT}`)
  public async sendKycPendingOrFlaggedMessage(payload: SendKycPendingOrFlaggedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.PENDING,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT}`)
  public async sendDocVerificationPendingMessage(payload: SendDocumentVerificationPendingEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.PENDING,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT}`)
  public async sendDocVerificationRejectedMessage(payload: SendDocumentVerificationRejectedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      verificationStatus: KYCStatus.REJECTED,
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT}`)
  public async sendDocVerificationFailedTechMessage(payload: SendDocumentVerificationTechnicalFailureEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_CARD_ADDED_EVENT}`)
  public async sendCardAddedMessage(payload: SendCardAddedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_CARD_ADDED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      paymentMethodInformation: {
        last4Digits: payload.last4Digits,
        cardNetwork: payload.cardNetwork,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT}`)
  public async sendCardAdditionFailedMessage(payload: SendCardAdditionFailedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      paymentMethodInformation: {
        last4Digits: payload.last4Digits,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_CARD_DELETED_EVENT}`)
  public async sendCardDeletedMessage(payload: SendCardDeletedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_CARD_DELETED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      paymentMethodInformation: {
        last4Digits: payload.last4Digits,
        cardNetwork: payload.cardNetwork,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT}`)
  public async sendTransactionInitiatedMessage(payload: SendTransactionInitiatedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      transactionInformation: {
        ...payload.params,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_CRYPTO_FAILED_EVENT}`)
  public async sendCryptoFailedMessage(payload: SendCryptoFailedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_CRYPTO_FAILED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      transactionInformation: {
        ...payload.params,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT}`)
  public async sendOrderExecutedMessage(payload: SendOrderExecutedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      transactionInformation: {
        ...payload.params,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`webhook.${NotificationEventType.SEND_TRANSACTION_FAILED_EVENT}`)
  public async sendOrderFailedMessage(payload: SendOrderFailedEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      transactionInformation: {
        ...payload.params,
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }

  @OnEvent(`email.${NotificationEventType.SEND_HARD_DECLINE_EVENT}`)
  public async sendHardDeclineMessage(payload: SendHardDeclineEvent) {
    const partner: Partner = await this.partnerService.getPartner(payload.partnerID);
    const webhook = this.partnerService.getWebhook(partner, WebhookType.NOTIFICATION);
    const webhookRequestPayload: NotificationDTO = {
      event: NotificationEventType.SEND_HARD_DECLINE_EVENT,
      userData: {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        nobaUserID: payload.nobaUserID,
      },
      paymentHardDeclineInformation: {
        sessionId: payload.sessionID,
        transactionID: payload.transactionID,
        paymentToken: payload.paymentToken,
        responseCode: payload.responseCode,
        summary: payload.responseSummary,
        processor: payload.processor,
        timestamp: new Date().toUTCString(),
      },
    };

    await this.makeRequest(partner, webhookRequestPayload, webhook.url);
  }
}
