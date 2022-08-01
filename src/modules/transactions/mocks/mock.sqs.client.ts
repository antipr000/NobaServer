import { anyString, anything, mock, when } from "ts-mockito";
import { SqsClient } from "../queueprocessors/sqs.client";

export function getMockSqsClientWithDefaults(): SqsClient {
  const mockSqsClient = mock(SqsClient);

  when(mockSqsClient.enqueue(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockSqsClient.subscribeToQueue(anyString(), anything())).thenReject(new Error("Method not implemented"));

  return mockSqsClient;
}
