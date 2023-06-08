import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayload } from "./domain/NotificationPayload";
import { NotificationEventType } from "./domain/NotificationTypes";
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
import { SendTransferReceivedEvent, validateTransferReceivedEvent } from "./events/SendTransferReceivedEvent";
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
import { LatestNotificationResponse } from "./dto/latestnotification.response.dto";
import { EventRepo } from "./repos/event.repo";
import { EventHandlers } from "./domain/EventHandlers";
import { SendInviteEmployeeEvent, validateSendInviteEmployeeEvent } from "./events/SendInviteEmployeeEvent";
import {
  SendCreditAdjustmentCompletedEvent,
  validateSendCreditAdjustmentCompletedEvent,
} from "./events/SendCreditAdjustmentCompletedEvent";
import {
  SendCreditAdjustmentFailedEvent,
  validateSendCreditAdjustmentFailedEvent,
} from "./events/SendCreditAdjustmentFailedEvent";
import {
  SendDebitAdjustmentCompletedEvent,
  validateSendDebitAdjustmentCompletedEvent,
} from "./events/SendDebitAdjustmentCompletedEvent";
import {
  SendDebitAdjustmentFailedEvent,
  validateSendDebitAdjustmentFailedEvent,
} from "./events/SendDebitAdjustmentFailedEvent";
import { SendScheduledReminderEvent, validateSendScheduledReminderEvent } from "./events/SendScheduledReminderEvent";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";

@Injectable()
export class NotificationService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  @Inject("EventRepo")
  private readonly eventRepo: EventRepo;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  private async getNotificationMedium(eventIDOrName: string, payload: NotificationPayload): Promise<EventHandlers[]> {
    const event = await this.eventRepo.getEventByIDOrName(eventIDOrName);
    let notificationMedium = event.handlers;
    if (notificationMedium.indexOf(EventHandlers.EMAIL) > -1 && !payload.email) {
      notificationMedium = notificationMedium.filter(medium => medium !== EventHandlers.EMAIL);
    }

    if (notificationMedium.indexOf(EventHandlers.SMS) > -1 && !payload.phone) {
      notificationMedium = notificationMedium.filter(medium => medium !== EventHandlers.SMS);
    }

    if (notificationMedium.indexOf(EventHandlers.PUSH) > -1 && !payload.nobaUserID) {
      notificationMedium = notificationMedium.filter(medium => medium !== EventHandlers.PUSH);
    }
    return notificationMedium;
  }

  async sendNotification(eventType: NotificationEventType, payload: NotificationPayload): Promise<void> {
    let eventIDOrName: string;

    if (eventType === NotificationEventType.SEND_SCHEDULED_REMINDER_EVENT) {
      eventIDOrName = (payload as SendScheduledReminderEvent).eventID;
    } else {
      eventIDOrName = eventType;
    }
    const notificationEvent = {
      notificationEventType: eventType,
      notificationEventHandler: await this.getNotificationMedium(eventIDOrName, payload),
    };

    if (notificationEvent.notificationEventHandler.length === 0) {
      this.logger.warn(`Failed to send notification for event type ${eventType} as no notification medium was found`);
      return;
    }

    for (const eventHandler of notificationEvent.notificationEventHandler) {
      const eventName = `${eventHandler}.${eventType}`;
      await this.createEvent(eventName, eventType, payload);
    }
  }

  private async createEvent(eventName: string, eventType: NotificationEventType, payload: NotificationPayload) {
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
        validateDepositCompletedEvent(payload as SendDepositCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT:
        validateDepositInitiatedEvent(payload as SendDepositInitiatedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEPOSIT_FAILED_EVENT:
        validateDepositFailedEvent(payload as SendDepositFailedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT:
        validateWithdrawalCompletedEvent(payload as SendWithdrawalCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT:
        validateWithdrawalInitiatedEvent(payload as SendWithdrawalInitiatedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT:
        validateWithdrawalFailedEvent(payload as SendWithdrawalFailedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT:
        validateTransferCompletedEvent(payload as SendTransferCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT:
        validateTransferReceivedEvent(payload as SendTransferReceivedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_TRANSFER_FAILED_EVENT:
        validateTransferFailedEvent(payload as SendTransferFailedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT:
        validatePayrollDepositCompletedEvent(payload as SendPayrollDepositCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT:
        validateSendEmployerRequestEvent(payload as SendEmployerRequestEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT:
        validateSendInviteEmployeeEvent(payload as SendInviteEmployeeEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT:
        validateSendUpdatePayrollStatusEvent(payload as SendUpdatePayrollStatusEvent);
        this.eventEmitter.emitAsync(eventName, payload as SendUpdatePayrollStatusEvent);
        break;

      case NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT:
        validateSendCreditAdjustmentCompletedEvent(payload as SendCreditAdjustmentCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_CREDIT_ADJUSTMENT_FAILED_EVENT:
        validateSendCreditAdjustmentFailedEvent(payload as SendCreditAdjustmentFailedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEBIT_ADJUSTMENT_COMPLETED_EVENT:
        validateSendDebitAdjustmentCompletedEvent(payload as SendDebitAdjustmentCompletedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;
      case NotificationEventType.SEND_DEBIT_ADJUSTMENT_FAILED_EVENT:
        validateSendDebitAdjustmentFailedEvent(payload as SendDebitAdjustmentFailedEvent);
        this.eventEmitter.emitAsync(eventName, payload);
        break;

      case NotificationEventType.SEND_SCHEDULED_REMINDER_EVENT:
        validateSendScheduledReminderEvent(payload as SendScheduledReminderEvent);
        const eventResponse = await this.eventEmitter.emitAsync(eventName, payload as SendScheduledReminderEvent);
        const isSuccessful: boolean = eventResponse[0];
        if (!isSuccessful) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "Failed to send scheduled reminder",
          });
        }
        break;
      default:
        this.logger.warn(`Unknown Notification event type: ${eventType}`);
        break;
    }
  }

  async getPreviousNotifications(): Promise<LatestNotificationResponse> {
    const smsData = await this.eventEmitter.emitAsync(`${EventHandlers.SMS}.get`);
    const emailData = await this.eventEmitter.emitAsync(`${EventHandlers.EMAIL}.get`);
    const pushData = await this.eventEmitter.emitAsync(`${EventHandlers.PUSH}.get`);

    return {
      smsData: smsData[0],
      emailData: emailData[0],
      pushData: pushData[0],
    };
  }

  async clearPreviousNotifications(): Promise<void> {
    await this.eventEmitter.emitAsync(`${EventHandlers.EMAIL}.clear`);
    await this.eventEmitter.emitAsync(`${EventHandlers.SMS}.clear`);
    await this.eventEmitter.emitAsync(`${EventHandlers.PUSH}.clear`);
  }
}
