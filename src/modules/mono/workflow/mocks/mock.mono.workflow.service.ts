import { anyString, mock, when } from "ts-mockito";
import { MonoWorkflowService } from "../mono.workflow.service";

export function getMockMonoWorkflowServiceWithDefaults(): MonoWorkflowService {
  const mockMonoWorkflowService: MonoWorkflowService = mock(MonoWorkflowService);

  when(mockMonoWorkflowService.getNobaMonoAccountBalance(anyString())).thenReject(new Error("Method not implemented"));
  return mockMonoWorkflowService;
}
