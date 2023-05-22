import { anything, mock, when } from "ts-mockito";
import { MetaClient } from "../meta.client";

export function getMockMetaClientWithDefaults(): MetaClient {
  const mockMetaClient: MetaClient = mock(MetaClient);

  when(mockMetaClient.raiseEvent(anything())).thenReject(new Error("Method not implemented"));

  return mockMetaClient;
}
