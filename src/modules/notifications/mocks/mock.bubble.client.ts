import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { BubbleClient } from "../dashboard/bubble.client";

export function getMockBubbleClientWithDefaults(): BubbleClient {
  const mockBubbleClient: BubbleClient = mock(BubbleClient);

  when(mockBubbleClient.registerNewEmployee(anything())).thenReject(new Error("Method not implemented"));
  when(mockBubbleClient.updateEmployeeAllocationAmount(anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  return mockBubbleClient;
}
