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
import {
  SendDocumentVerificationPendingEvent,
  validateDocumentVerificationPendingEvent,
} from "./events/SendDocumentVerificationPendingEvent";
import {
  SendDocumentVerificationRejectedEvent,
  validateDocumentVerificationRejectedEvent,
} from "./events/SendDocumentVerificationRejectedEvent";
import {
  SendDocumentVerificationTechnicalFailureEvent,
  validateDocumentVerificationTechnicalFailureEvent,
} from "./events/SendDocumentVerificationTechnicalFailureEvent";
import { SendKycApprovedNonUSEvent, validateSendKycApprovedNonUSEvent } from "./events/SendKycApprovedNonUSEvent";
import { SendKycApprovedUSEvent, validateSendKycApprovedUSEvent } from "./events/SendKycApprovedUSEvent";
import { SendKycDeniedEvent, validateSendKycDeniedEvent } from "./events/SendKycDeniedEvent";
import {
  SendKycPendingOrFlaggedEvent,
  validateSendKycPendingOrFlaggedEvent,
} from "./events/SendKycPendingOrFlaggedEvent";
import {
  SendWalletUpdateVerificationCodeEvent,
  validateSendWalletUpdateVerificationCodeEvent,
} from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent, validateSendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";
import { SendDepositCompletedEvent, validateDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { SendDepositInitiatedEvent, validateDepositInitiatedEvent } from "./events/SendDepositInitiatedEvent";
import { SendDepositFailedEvent, validateDepositFailedEvent } from "./events/SendDepositFailedEvent";
import { SendWithdrawalCompletedEvent, validateWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendWithdrawalInitiatedEvent, validateWithdrawalInitiatedEvent } from "./events/SendWithdrawalInitiatedEvent";
import { SendTransferCompletedEvent, validateTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendTransferFailedEvent, validateTransferFailedEvent } from "./events/SendTransferFailedEvent";
import { SendWithdrawalFailedEvent, validateWithdrawalFailedEvent } from "./events/SendWithdrawalFailedEvent";
import { SendEmployerRequestEvent, validateSendEmployerRequestEvent } from "./events/SendEmployerRequestEvent";
import { IPushTokenRepo } from "./repos/pushtoken.repo";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { SendTransferReceivedEvent, validateTransferReceivedEvent } from "./events/SendTransferReceivedEvent";
import {
  SendRegisterNewEmployeeEvent,
  validateSendRegisterNewEmployeeEvent,
} from "./events/SendRegisterNewEmployeeEvent";
import {
  SendUpdateEmployeeAllocationAmountEvent,
  validateSendUpdateEmployeeAllocationAmountEvent,
} from "./events/SendUpdateEmployeeAllocationAmountEvent";
import {
  SendUpdatePayrollStatusEvent,
  validateSendUpdatePayrollStatusEvent,
} from "./events/SendUpdatePayrollStatusEvent";
import {
  SendPayrollDepositCompletedEvent,
  validatePayrollDepositCompletedEvent,
} from "./events/SendPayrollDepositCompletedEvent";
import { SendOtpEvent, validateSendOtpEvent } from "./events/SendOtpEvent";
import {
  SendPhoneVerificationCodeEvent,
  validateSendPhoneVerificationCodeEvent,
} from "./events/SendPhoneVerificationCodeEvent";

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

    if (notificationMedium.indexOf(NotificationEventHandler.PUSH) > -1 && !payload.nobaUserID) {
      notificationMedium = notificationMedium.filter(medium => medium !== NotificationEventHandler.PUSH);
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
    let pushTokens = [];
    switch (eventType) {
      case NotificationEventType.SEND_OTP_EVENT:
        validateSendOtpEvent(payload as SendOtpEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT:
        validateSendWalletUpdateVerificationCodeEvent(payload as SendWalletUpdateVerificationCodeEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT:
        validateSendPhoneVerificationCodeEvent(payload as SendPhoneVerificationCodeEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_WELCOME_MESSAGE_EVENT:
        validateSendWelcomeMessageEvent(payload as SendWelcomeMessageEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_KYC_APPROVED_US_EVENT:
        validateSendKycApprovedUSEvent(payload as SendKycApprovedUSEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT:
        validateSendKycApprovedNonUSEvent(payload as SendKycApprovedNonUSEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_KYC_DENIED_EVENT:
        validateSendKycDeniedEvent(payload as SendKycDeniedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT:
        validateSendKycPendingOrFlaggedEvent(payload as SendKycPendingOrFlaggedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT:
        validateDocumentVerificationPendingEvent(payload as SendDocumentVerificationPendingEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT:
        validateDocumentVerificationRejectedEvent(payload as SendDocumentVerificationRejectedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT:
        validateDocumentVerificationTechnicalFailureEvent(payload as SendDocumentVerificationTechnicalFailureEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const depositCompletedPayload = payload as SendDepositCompletedEvent;

        depositCompletedPayload.pushTokens = pushTokens;

        validateDepositCompletedEvent(depositCompletedPayload);

        this.eventEmitter.emitAsync(eventName, depositCompletedPayload);
        break;
      case NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT:
        validateDepositInitiatedEvent(payload as SendDepositInitiatedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEPOSIT_FAILED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const depositFailedPayload = payload as SendDepositFailedEvent;

        depositFailedPayload.pushTokens = pushTokens;

        validateDepositFailedEvent(depositFailedPayload);

        this.eventEmitter.emitAsync(eventName, depositFailedPayload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const withdrawalCompletedPayload = payload as SendWithdrawalCompletedEvent;

        withdrawalCompletedPayload.pushTokens = pushTokens;

        validateWithdrawalCompletedEvent(withdrawalCompletedPayload);

        this.eventEmitter.emitAsync(eventName, withdrawalCompletedPayload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT:
        validateWithdrawalInitiatedEvent(payload as SendWithdrawalInitiatedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const withdrawalFailedPayload = payload as SendWithdrawalFailedEvent;

        withdrawalFailedPayload.pushTokens = pushTokens;
        validateWithdrawalFailedEvent(withdrawalFailedPayload);

        this.eventEmitter.emitAsync(eventName, withdrawalFailedPayload);
        break;

      case NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const transferCompletedPayload = payload as SendTransferCompletedEvent;

        transferCompletedPayload.pushTokens = pushTokens;

        validateTransferCompletedEvent(transferCompletedPayload);

        this.eventEmitter.emitAsync(eventName, transferCompletedPayload);
        break;
      case NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const transferReceivedPayload = payload as SendTransferReceivedEvent;

        transferReceivedPayload.pushTokens = pushTokens;

        validateTransferReceivedEvent(transferReceivedPayload);
        this.eventEmitter.emitAsync(eventName, transferReceivedPayload);
        break;

      case NotificationEventType.SEND_TRANSFER_FAILED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const transferFailedPayload = payload as SendTransferFailedEvent;

        transferFailedPayload.pushTokens = pushTokens;

        validateTransferFailedEvent(transferFailedPayload);

        this.eventEmitter.emitAsync(eventName, transferFailedPayload);
        break;

      case NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT:
        pushTokens = await this.pushTokenRepo.getAllPushTokensForConsumer(payload.nobaUserID);
        const payrollDepositCompletedPayload = payload as SendPayrollDepositCompletedEvent;

        payrollDepositCompletedPayload.pushTokens = pushTokens;

        validatePayrollDepositCompletedEvent(payrollDepositCompletedPayload);

        this.eventEmitter.emitAsync(eventName, payrollDepositCompletedPayload);
        break;

      case NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT:
        validateSendEmployerRequestEvent(payload as SendEmployerRequestEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT:
        validateSendRegisterNewEmployeeEvent(payload as SendRegisterNewEmployeeEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT:
        validateSendUpdateEmployeeAllocationAmountEvent(payload as SendUpdateEmployeeAllocationAmountEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT:
        validateSendUpdatePayrollStatusEvent(payload as SendUpdatePayrollStatusEvent);
        this.eventEmitter.emitAsync(eventName, payload as SendUpdatePayrollStatusEvent);
        break;
      default:
        this.logger.error(`Unknown Notification event type: ${eventType}`);
        break;
    }
  }
}
