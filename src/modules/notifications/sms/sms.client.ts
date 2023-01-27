import { TemplatePayload } from "./templates.sms";

export interface SMSClient {
  sendSMS(recipientPhoneNumber: string, templateKey: string, payload: TemplatePayload): Promise<void>;
}
