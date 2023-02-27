import { anyString, anything, mock, when } from "ts-mockito";
import { IDVProvider } from "../integrations/IDVProvider";
import { Sardine } from "../integrations/sardine.client";

export function getMockIdvProviderIntegrationWithDefaults(): IDVProvider {
  const mockIdvProvider = mock(Sardine);
  when(mockIdvProvider.verifyConsumerInformation(anyString(), anything())).thenReject(
    new Error("Method not implemented!"),
  );
  when(mockIdvProvider.verifyDocument(anyString(), anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockIdvProvider.getDocumentVerificationResult(anyString())).thenReject(new Error("Method not implemented"));

  when(mockIdvProvider.postConsumerFeedback(anyString(), anyString(), anything())).thenResolve();
  when(
    mockIdvProvider.postTransactionFeedback(anyString(), anyString(), anyString(), anyString(), anyString()),
  ).thenResolve();
  when(mockIdvProvider.postDocumentFeedback(anyString(), anything())).thenResolve();

  return mockIdvProvider;
}
