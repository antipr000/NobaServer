import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationConfiguration } from "../partner/domain/NotificationConfiguration";
import { PartnerService } from "../partner/partner.service";
import { NotificationPayload } from "./domain/NotificationPayload";
import { NotificationEventHandler, NotificationEventType } from "./domain/NotificationTypes";
import { SendCardAddedEvent } from "./events/SendCardAddedEvent";
import { SendCardAdditionFailedEvent } from "./events/SendCardAdditionFailedEvent";
import { SendCardDeletedEvent } from "./events/SendCardDeletedEvent";
import { SendCryptoFailedEvent } from "./events/SendCryptoFailedEvent";
import { SendDocumentVerificationPendingEvent } from "./events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "./events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "./events/SendDocumentVerificationTechnicalFailureEvent";
import { SendHardDeclineEvent } from "./events/SendHardDeclineEvent";
import { SendKycApprovedNonUSEvent } from "./events/SendKycApprovedNonUSEvent";
import { SendKycApprovedUSEvent } from "./events/SendKycApprovedUSEvent";
import { SendKycDeniedEvent } from "./events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "./events/SendKycPendingOrFlaggedEvent";
import { SendOrderExecutedEvent } from "./events/SendOrderExecutedEvent";
import { SendOrderFailedEvent } from "./events/SendOrderFailedEvent";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendTransactionInitiatedEvent } from "./events/SendTransactionInitiatedEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";

@Injectable()
export class NotificationService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;
  constructor(private readonly eventEmitter: EventEmitter2, private readonly partnerService: PartnerService) {}

  async sendNotification(
    eventType: NotificationEventType,
    partnerID: string,
    payload: NotificationPayload,
  ): Promise<void> {
    let notificationEvent: NotificationConfiguration = null;
    if (partnerID) {
      try {
        // Partner exists in db. Read configurations set by partner
        const partner = await this.partnerService.getPartner(partnerID);

        const notificationConfigs: NotificationConfiguration[] = partner.props.config?.notificationConfig ?? [];

        const filteredNotificationEvents = notificationConfigs.filter(
          notificationConfig => notificationConfig.notificationEventType === eventType,
        );

        if (filteredNotificationEvents.length === 0) {
          notificationEvent = {
            notificationEventType: eventType,
            notificationEventHandler: [NotificationEventHandler.EMAIL],
          };
        } else {
          notificationEvent = filteredNotificationEvents[0];
        }
      } catch (e) {
        // PartnerId does not exist in db. Send only email
        notificationEvent = {
          notificationEventType: eventType,
          notificationEventHandler: [NotificationEventHandler.EMAIL],
        };
      }
    } else {
      notificationEvent = {
        notificationEventType: eventType,
        notificationEventHandler: [NotificationEventHandler.EMAIL],
      };
    }

    notificationEvent.notificationEventHandler.forEach(eventHandler => {
      const eventName = `${eventHandler}.${eventType}`;
      this.createEvent(eventName, eventType, payload, partnerID);
    });
  }

  private createEvent(
    eventName: string,
    eventType: NotificationEventType,
    payload: NotificationPayload,
    partnerID?: string,
  ) {
    switch (eventType) {
      case NotificationEventType.SEND_OTP_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendOtpEvent({
            email: payload.email,
            otp: payload.otp,
            name: payload.firstName,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWalletUpdateVerificationCodeEvent({
            email: payload.email,
            otp: payload.otp,
            name: payload.firstName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            walletAddress: payload.walletAddress,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_WELCOME_MESSAGE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWelcomeMessageEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_KYC_APPROVED_US_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendKycApprovedUSEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendKycApprovedNonUSEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_KYC_DENIED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendKycDeniedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendKycPendingOrFlaggedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDocumentVerificationPendingEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDocumentVerificationRejectedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDocumentVerificationTechnicalFailureEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_CARD_ADDED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendCardAddedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendCardAdditionFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            last4Digits: payload.last4Digits,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_CARD_DELETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendCardDeletedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendTransactionInitiatedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.transactionInitiatedParams,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_CRYPTO_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendCryptoFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.cryptoFailedParams,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendOrderExecutedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.orderExecutedParams,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_TRANSACTION_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendOrderFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.orderFailedParams,
            partnerID: partnerID,
          }),
        );
        break;
      case NotificationEventType.SEND_HARD_DECLINE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendHardDeclineEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            sessionID: payload.sessionID,
            transactionID: payload.transactionID,
            paymentToken: payload.paymentToken,
            processor: payload.processor,
            responseCode: payload.responseCode,
            responseSummary: payload.responseSummary,
            partnerID: partnerID,
          }),
        );
        break;
      default:
        this.logger.error(`Unknown Notification event type: ${eventType}`);
        break;
    }
  }
}
