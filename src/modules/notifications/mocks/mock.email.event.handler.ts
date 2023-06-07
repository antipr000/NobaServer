import { anything, mock, when } from "ts-mockito";
import { EmailEventHandler } from "../email.event.handler";

export const getMockEmailEventHandlerWithDefaults = () => {
  const mockEventHandler: EmailEventHandler = mock(EmailEventHandler);

  when(mockEventHandler.sendOtp(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendWelcomeMessage(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycApprovedUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycApprovedNonUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycDeniedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycPendingOrFlaggedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationPendingEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationRejectedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationFailedTechEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDepositCompletedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDepositFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDepositInitiatedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendWithdrawalCompletedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendWithdrawalFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendWithdrawalInitiatedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendTransferCompletedEmail(anything())).thenReject(new Error("Not implemented!"));

  return mockEventHandler;
};
