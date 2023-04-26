import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SMSClient } from "./sms/sms.client";
import { StubSMSClient } from "./sms/stub.sms.client";
import { EventRepo } from "./repos/event.repo";
import { EventHandlers } from "./domain/EventHandlers";
import { TemplateProcessor } from "../common/utils/template.processor";

@Injectable()
export class SMSEventHandler {
  @Inject("SMSClient")
  private readonly smsClient: SMSClient;

  @Inject("EventRepo")
  private readonly eventRepo: EventRepo;

  private async getOrDefaultTemplateBody(eventName: NotificationEventType, locale: string): Promise<string> {
    const event = await this.eventRepo.getEventByName(eventName);
    const pushTemplates = event.templates.filter(template => template.type === EventHandlers.SMS);

    locale = locale?.toLowerCase() ?? "en";
    if (pushTemplates.find(template => template.locale === locale)) {
      return pushTemplates.find(template => template.locale === locale).templateBody;
    }

    const localePrefix = locale.split("_")[0];

    if (pushTemplates.find(template => template.locale === localePrefix)) {
      return pushTemplates.find(template => template.locale === localePrefix).templateBody;
    }

    return pushTemplates.find(template => template.locale === "en").templateBody;
  }

  @OnEvent(`sms.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendLoginSMS(payload: SendOtpEvent) {
    const templateBody = await this.getOrDefaultTemplateBody(NotificationEventType.SEND_OTP_EVENT, payload.locale);

    const body = TemplateProcessor.parseTemplateString(templateBody, {
      otp: payload.otp,
    });

    await this.smsClient.sendSMS(payload.phone, body);
  }

  @OnEvent(`sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`)
  public async sendPhoneVerificationSMS(payload: SendOtpEvent) {
    const templateBody = await this.getOrDefaultTemplateBody(
      NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateBody, {
      otp: payload.otp,
    });

    await this.smsClient.sendSMS(payload.phone, body);
  }

  @OnEvent(`sms.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCodeSMS(payload: SendWalletUpdateVerificationCodeEvent) {
    const templateBody = await this.getOrDefaultTemplateBody(
      NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateBody, {
      otp: payload.otp,
    });

    await this.smsClient.sendSMS(payload.phone, body);
  }
  // BEGIN-NOSCAN
  @OnEvent("sms.get")
  public async getPreviousNotifications() {
    if (this.smsClient instanceof StubSMSClient) {
      const notifications = this.smsClient.getPreviousSMS();
      return notifications;
    }
  }

  @OnEvent("sms.clear")
  public async clearPreviousNotifications() {
    if (this.smsClient instanceof StubSMSClient) {
      this.smsClient.clearPreviousSMS();
    }
  }
  // END-NOSCAN
}
