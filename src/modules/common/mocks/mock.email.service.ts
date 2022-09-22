import { anyString, mock, when } from "ts-mockito";
import { EmailService } from "../email.service";

export const getMockEmailServiceWithDefaults = () => {
  const mockEmailService: EmailService = mock(EmailService);

  when(mockEmailService.sendOtp(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendWelcomeMessage(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendKycApprovedUSEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendKycApprovedNonUSEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendKycDeniedEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendKycPendingOrFlaggedEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendDocVerificationPendingEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendDocVerificationRejectedEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendDocVerificationFailedTechEmail(anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendCardAddedEmail(anyString(), anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendCardAdditionFailedEmail(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(
    mockEmailService.sendCardDeletedEmail(anyString(), anyString(), anyString(), anyString(), anyString()),
  ).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendTransactionInitiatedEmail(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendCryptoFailedEmail(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendOrderExecutedEmail(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockEmailService.sendOrderFailedEmail(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );

  return mockEmailService;
};
