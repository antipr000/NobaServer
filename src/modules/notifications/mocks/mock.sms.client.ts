import { anyString, mock, when } from "ts-mockito";
import { TwilioSMSClient } from "../sms/twilio.sms.service";

export function getMockSMSClientWithDefaults() {
  const smsClient = mock(TwilioSMSClient);
  when(smsClient.sendSMS(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  return smsClient;
}
