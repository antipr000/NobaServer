import { anything, mock, when } from "ts-mockito";
import { EmailService } from "../email.service";

export const getMockEmailServiceWithDefaults = () => {
  const mockEmailService: EmailService = mock(EmailService);

  when(mockEmailService.sendOtp(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendWelcomeMessage(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycApprovedUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycApprovedNonUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycDeniedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendKycPendingOrFlaggedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendDocVerificationPendingEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendDocVerificationRejectedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendDocVerificationFailedTechEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendCardAddedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendCardAdditionFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendCardDeletedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendTransactionInitiatedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendCryptoFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendOrderExecutedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEmailService.sendOrderFailedEmail(anything())).thenReject(new Error("Not implemented!"));

  return mockEmailService;
};
