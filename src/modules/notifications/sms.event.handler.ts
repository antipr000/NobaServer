import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendOtpEvent } from "./events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "./events/SendWalletUpdateVerificationCodeEvent";
import { SMSClient } from "./sms/sms.client";

@Injectable()
export class SMSEventHandler {
  @Inject("SMSClient")
  private readonly smsClient: SMSClient;

  @OnEvent(`sms.${NotificationEventType.SEND_OTP_EVENT}`)
  public async sendLoginSMS(payload: SendOtpEvent) {
    await this.smsClient.sendSMS(payload.phone, `${payload.otp} is your one-time password for Noba login.`);
  }

  @OnEvent(`sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`)
  public async sendPhoneVerificationSMS(payload: SendOtpEvent) {
    await this.smsClient.sendSMS(
      payload.phone,
      `${payload.otp} is your one-time password to verify your phone number with Noba.`,
    );
  }

  @OnEvent(`sms.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`)
  public async sendWalletUpdateVerificationCodeSMS(payload: SendWalletUpdateVerificationCodeEvent) {
    await this.smsClient.sendSMS(payload.phone, `${payload.otp} is your wallet verification code`);
  }
}
