import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { BubbleService } from "../bubble.service";

export function getMockBubbleServiceWithDefaults(): BubbleService {
  const mockBubbleService: BubbleService = mock(BubbleService);

  when(mockBubbleService.createEmployeeInBubble(anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockBubbleService.registerEmployerInNoba(anything())).thenReject(new Error("Method not implemented"));
  when(mockBubbleService.updateEmployeeAllocationInBubble(anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );

  return mockBubbleService;
}
