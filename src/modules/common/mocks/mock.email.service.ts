import { anyString, mock, when } from "ts-mockito";
import { EmailService } from "../email.service";

export const getMockEmailServiceWithDefaults = () => {
  const mockEmailService: EmailService = mock(EmailService);

  when(mockEmailService.sendOtp(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendCardAddedEmail(anyString(), anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(
    mockEmailService.sendCardAdditionFailedEmail(anyString(), anyString(), anyString(), anyString(), anyString()),
  ).thenReject(new Error("Not implemented!"));
  when(
    mockEmailService.sendCardDeletedEmail(anyString(), anyString(), anyString(), anyString(), anyString()),
  ).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycApprovedEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendKycDenied(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycPendingOrFlagged(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );

  return mockEmailService;
};
