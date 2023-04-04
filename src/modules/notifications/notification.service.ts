import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayload } from "./domain/NotificationPayload";
import {
  NotificationEventHandler,
  NotificationEventType,
  preferredNotificationMedium,
} from "./domain/NotificationTypes";
import { SendCardAddedEvent } from "./events/SendCardAddedEvent";
import { SendCardAdditionFailedEvent } from "./events/SendCardAdditionFailedEvent";
import { SendCardDeletedEvent } from "./events/SendCardDeletedEvent";
import { SendDocumentVerificationPendingEvent } from "./events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "./events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "./events/SendDocumentVerificationTechnicalFailureEvent";
import { SendHardDeclineEvent } from "./events/SendHardDeclineEvent";
import { SendKycApprovedNonUSEvent } from "./events/SendKycApprovedNonUSEvent";
import { SendKycApprovedUSEvent } from "./events/SendKycApprovedUSEvent";
import { SendKycDeniedEvent } from "./events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "./events/SendKycPendingOrFlaggedEvent";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { SendDepositInitiatedEvent } from "./events/SendDepositInitiatedEvent";
import { SendDepositFailedEvent } from "./events/SendDepositFailedEvent";
import { SendWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendWithdrawalInitiatedEvent } from "./events/SendWithdrawalInitiatedEvent";
import { SendTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendTransferFailedEvent } from "./events/SendTransferFailedEvent";
import { SendWithdrawalFailedEvent } from "./events/SendWithdrawalFailedEvent";
import { SendCollectionCompletedEvent } from "./events/SendCollectionCompletedEvent";
import { SendPhoneVerificationCodeEvent } from "./events/SendPhoneVerificationCodeEvent";
import { SendEmployerRequestEvent } from "./events/SendEmployerRequestEvent";
import { IPushTokenRepo } from "./repos/pushtoken.repo";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { SendTransferReceivedEvent } from "./events/SendTransferReceivedEvent";
import { SendRegisterNewEmployeeEvent } from "./events/SendRegisterNewEmployeeEvent";
import { SendUpdateEmployeeAllocationAmontEvent } from "./events/SendUpdateEmployeeAllocationAmountEvent";
import { SendUpdatePayrollStatusEvent } from "./events/SendUpdatePayrollStatusEvent";
import { SendPayrollDepositCompletedEvent } from "./events/SendPayrollDepositCompletedEvent";

@Injectable()
export class NotificationService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Inject("PushTokenRepo")
  private readonly pushTokenRepo: IPushTokenRepo;

  private getNotificationMedium(
    eventType: NotificationEventType,
    payload: NotificationPayload,
  ): NotificationEventHandler[] {
    let notificationMedium = preferredNotificationMedium[eventType];
    if (notificationMedium.indexOf(NotificationEventHandler.EMAIL) > -1 && !payload.email) {
      notificationMedium = notificationMedium.filter(medium => medium !== NotificationEventHandler.EMAIL);
    }

    if (notificationMedium.indexOf(NotificationEventHandler.SMS) > -1 && !payload.phone) {
      notificationMedium = notificationMedium.filter(medium => medium !== NotificationEventHandler.SMS);
    }
    return notificationMedium;
  }

  async sendNotification(eventType: NotificationEventType, payload: NotificationPayload): Promise<void> {
    const notificationEvent = {
      notificationEventType: eventType,
      notificationEventHandler: this.getNotificationMedium(eventType, payload),
    };

    if (notificationEvent.notificationEventHandler.length === 0) {
      this.logger.error(`Failed to send notification for event type ${eventType} as no notification medium was found`);
      return;
    }

    payload.pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);

    notificationEvent.notificationEventHandler.forEach(eventHandler => {
      const eventName = `${eventHandler}.${eventType}`;
      this.createEvent(eventName, eventType, payload);
    });
  }

  async subscribeToPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    const existingPushTokenID = await this.pushTokenRepo.getPushToken(consumerID, pushToken);
    if (!existingPushTokenID) {
      return this.pushTokenRepo.addPushToken(consumerID, pushToken);
    }

    return existingPushTokenID;
  }

  async unsubscribeFromPushNotifications(consumerID: string, pushToken: string): Promise<string> {
    const deletedPushTokenID = await this.pushTokenRepo.deletePushToken(consumerID, pushToken);
    if (!deletedPushTokenID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Failed to delete push token",
      });
    }

    return deletedPushTokenID;
  }

  async updateEmployeeAllocationInBubble(nobaEmployeeID: string, allocationAmount: number): Promise<void> {
    await this.sendNotification(NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT, {
      locale: "en",
      nobaEmployeeID,
      allocationAmountInPesos: allocationAmount,
    });
  }

  private async createEvent(eventName: string, eventType: NotificationEventType, payload: NotificationPayload) {
    switch (eventType) {
      case NotificationEventType.SEND_OTP_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendOtpEvent({
            email: payload.email,
            phone: payload.phone,
            otp: payload.otp,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
          }),
        );
        break;
      case NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWalletUpdateVerificationCodeEvent({
            email: payload.email,
            phone: payload.phone,
            otp: payload.otp,
            name: payload.firstName,
            nobaUserID: payload.nobaUserID,
            locale: payload.locale,
            walletAddress: payload.walletAddress,
          }),
        );
        break;
      case NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendPhoneVerificationCodeEvent({
            phone: payload.phone,
            otp: payload.otp,
            handle: payload.handle,
            name: payload.firstName,
            locale: payload.locale,
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
            locale: payload.locale,
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
            locale: payload.locale,
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
            locale: payload.locale,
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
            locale: payload.locale,
            nobaUserID: payload.nobaUserID,
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
            locale: payload.locale,
            nobaUserID: payload.nobaUserID,
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
            locale: payload.locale,
            nobaUserID: payload.nobaUserID,
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
            locale: payload.locale,
            nobaUserID: payload.nobaUserID,
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
            locale: payload.locale,
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
            locale: payload.locale,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
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
            locale: payload.locale,
            last4Digits: payload.last4Digits,
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
            locale: payload.locale,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
          }),
        );
        break;
      case NotificationEventType.SEND_COLLECTION_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendCollectionCompletedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            locale: payload.locale,
          }),
        );
        break;
      case NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDepositCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            params: payload.depositCompletedParams,
            pushTokens: payload.pushTokens,
            locale: payload.locale,
          }),
        );
        break;
      case NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDepositInitiatedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.depositInitiatedParams,
          }),
        );
        break;
      case NotificationEventType.SEND_DEPOSIT_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendDepositFailedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            pushTokens: payload.pushTokens,
            locale: payload.locale,
            params: payload.depositFailedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWithdrawalCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            pushTokens: payload.pushTokens,
            params: payload.withdrawalCompletedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWithdrawalInitiatedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.withdrawalInitiatedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWithdrawalFailedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            pushTokens: payload.pushTokens,
            locale: payload.locale,
            params: payload.withdrawalFailedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendTransferCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            pushTokens: payload.pushTokens,
            params: payload.transferCompletedParams,
          }),
        );
        break;
      case NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendTransferReceivedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            pushTokens: payload.pushTokens,
            params: payload.transferReceivedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_TRANSFER_FAILED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendTransferFailedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            pushTokens: payload.pushTokens,
            locale: payload.locale,
            params: payload.transferFailedParams,
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
            locale: payload.locale,
            sessionID: payload.sessionID,
            transactionID: payload.transactionID,
            paymentToken: payload.paymentToken,
            processor: payload.processor,
            responseCode: payload.responseCode,
            responseSummary: payload.responseSummary,
          }),
        );
        break;

      case NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendPayrollDepositCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            pushTokens: payload.pushTokens,
            locale: payload.locale,
            params: payload.payrollDepositCompletedParams,
          }),
        );
        break;

      case NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendEmployerRequestEvent({
            email: payload.email,
            locale: payload.locale,
            firstName: payload.firstName,
            lastName: payload.lastName,
          }),
        );
        break;
      case NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendRegisterNewEmployeeEvent({
            email: payload.email,
            phone: payload.phone,
            firstName: payload.firstName,
            lastName: payload.lastName,
            employerReferralID: payload.employerReferralID,
            allocationAmountInPesos: payload.allocationAmountInPesos,
            nobaEmployeeID: payload.nobaEmployeeID,
          }),
        );
        break;
      case NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendUpdateEmployeeAllocationAmontEvent({
            nobaEmployeeID: payload.nobaEmployeeID,
            allocationAmountInPesos: payload.allocationAmountInPesos,
          }),
        );
        break;
      case NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendUpdatePayrollStatusEvent({
            nobaPayrollID: payload.nobaPayrollID,
            payrollStatus: payload.payrollStatus,
          }),
        );
        break;
      default:
        this.logger.error(`Unknown Notification event type: ${eventType}`);
        break;
    }
  }
}
