import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationConfiguration } from "../partner/domain/NotificationConfiguration";
import { PartnerService } from "../partner/partner.service";
import { NotificationPayload } from "./domain/NotificationPayload";
import { NotificationEventHandlers, NotificationEventTypes } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "./events/SendWelcomeMessageEvent";

export class NotificationService {
  constructor(private readonly eventEmitter: EventEmitter2, private readonly partnerService: PartnerService) {}

  async sendNotification(
    eventType: NotificationEventTypes,
    partnerApiKey: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const partner = await this.partnerService.getPartnerFromApiKey(partnerApiKey);

    const notificationConfigs: NotificationConfiguration[] = partner.props.config.notificationConfig;

    const filteredNotificationEvents = notificationConfigs.filter(
      notificationConfig => notificationConfig.notificationEventType === eventType,
    );

    let notificationEvent: NotificationConfiguration = null;

    if (filteredNotificationEvents.length === 0) {
      notificationEvent = {
        notificationEventType: eventType,
        notificationEventHandler: [NotificationEventHandlers.EMAIL],
      };
    } else {
      notificationEvent = filteredNotificationEvents[0];
    }

    notificationEvent.notificationEventHandler.forEach(eventHandler => {
      const eventName = `${eventHandler}.${eventType}`;
      this.createEvent(eventName, eventType, payload);
    });
  }

  private createEvent(eventName: string, eventType: NotificationEventTypes, payload: NotificationPayload) {
    switch (eventType) {
      case NotificationEventTypes.SEND_OTP_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendOtpEvent({
            email: payload.email,
            otp: payload.otp,
            name: payload.firstName,
          }),
        );
        break;
      case NotificationEventTypes.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWalletUpdateVerificationCodeEvent({
            email: payload.email,
            otp: payload.otp,
            name: payload.firstName,
            walletAddress: payload.walletAddress,
          }),
        );
        break;
      case NotificationEventTypes.SEND_WELCOME_MESSAGE_EVENT:
        this.eventEmitter.emitAsync(
          eventName,
          new SendWelcomeMessageEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
          }),
        );
        break;
      default:
        break;
    }
  }
}
