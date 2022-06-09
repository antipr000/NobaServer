import { anyString, mock, when } from "ts-mockito";
import { EmailService } from "../email.service";

export const getMockEmailServiceWithDefaults = () => {
  const mockEmailService: EmailService = mock(EmailService);

  when(mockEmailService.sendOtp(anyString(), anyString(), anyString()))
    .thenReject(new Error('Not implemented!'));

  return mockEmailService;
}
