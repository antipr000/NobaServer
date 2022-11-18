import { anything, mock, when } from "ts-mockito";
import { EventHandler } from "../event.handler";

export const getMockEventHandlerWithDefaults = () => {
  const mockEventHandler: EventHandler = mock(EventHandler);

  when(mockEventHandler.sendOtp(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendWelcomeMessage(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycApprovedUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycApprovedNonUSEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycDeniedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendKycPendingOrFlaggedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationPendingEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationRejectedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendDocVerificationFailedTechEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendCardAddedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendCardAdditionFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendCardDeletedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendTransactionInitiatedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendCryptoFailedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendOrderExecutedEmail(anything())).thenReject(new Error("Not implemented!"));
  when(mockEventHandler.sendOrderFailedEmail(anything())).thenReject(new Error("Not implemented!"));

  return mockEventHandler;
};
