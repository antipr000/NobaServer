import { anyString, anything, mock, when } from "ts-mockito";
import { MonoClient } from "../mono.client";

export function getMockMonoClientWithDefaults(): MonoClient {
  const mockMonoClient: MonoClient = mock(MonoClient);

  when(mockMonoClient.createCollectionLink(anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoClient.transfer(anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoClient.getTransferStatus(anyString())).thenReject(new Error("Method not implemented"));
  when(mockMonoClient.getSupportedBanks()).thenReject(new Error("Method not implemented"));

  return mockMonoClient;
}
