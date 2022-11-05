import { anyString, mock, when } from "ts-mockito";
import { SMSService } from "../sms.service";

export const getMockSmsServiceWithDefaults = () => {
  const mockSmsService: SMSService = mock(SMSService);

  when(mockSmsService.sendSMS(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockSmsService;
};
