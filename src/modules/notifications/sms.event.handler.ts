import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SMSClient } from "./sms/sms.client";
import { SMSTemplate } from "./domain/SMSTemplates";

@Injectable()
export class SMSEventHandler {
  @Inject("SMSClient")
  private readonly smsClient: SMSClient;

  @OnEvent(`sms.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendLoginSMS(payload: SendOtpEvent) {
    await this.smsClient.sendSMS(
      payload.phone,
      SMSTemplate.getOrDefault(SMSTemplate.LOGIN_OTP_SMS, payload.locale ?? "en"),
      {
        otp: payload.otp,
      },
    );
  }

  @OnEvent(`sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`)
  public async sendPhoneVerificationSMS(payload: SendOtpEvent) {
    await this.smsClient.sendSMS(
      payload.phone,
      SMSTemplate.getOrDefault(SMSTemplate.PHONE_VERIFICATION_CODE_SMS, payload.locale ?? "en"),
      {
        otp: payload.otp,
      },
    );
  }

  @OnEvent(`sms.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCodeSMS(payload: SendWalletUpdateVerificationCodeEvent) {
    await this.smsClient.sendSMS(
      payload.phone,
      SMSTemplate.getOrDefault(SMSTemplate.WALLET_VERIFICATION_CODE_SMS, payload.locale ?? "en"),
      {
        otp: payload.otp,
      },
    );
  }
}
