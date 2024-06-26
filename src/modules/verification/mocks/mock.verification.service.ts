import { anyString, anything, mock, when } from "ts-mockito";
import { VerificationService } from "../verification.service";

export function getMockVerificationServiceWithDefaults(): VerificationService {
  const mockVerificationService = mock(VerificationService);

  when(mockVerificationService.createSession(anyString())).thenReject(new Error("Method not implemented"));
  when(mockVerificationService.verifyConsumerInformation(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockVerificationService.verifyDocument(anyString(), anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockVerificationService.getDocumentVerificationResult(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockVerificationService.getDeviceVerificationResult(anyString())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockVerificationService.processDocumentVerificationWebhookResult(anything())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockVerificationService.processKycVerificationWebhookRequest(anything())).thenReject(
    new Error("Method not implemented"),
  );

  when(mockVerificationService.transactionVerification(anyString(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );

  return mockVerificationService;
}
