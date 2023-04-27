import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloWorkflowService } from "../pomelo.workflow.service";

export function getMockPomeloWorkflowServiceWithDefaults(): PomeloWorkflowService {
  const mockPomeloWorkflowService = mock(PomeloWorkflowService);

  when(mockPomeloWorkflowService.getPomeloTransactionByPomeloTransactionID(anyString())).thenReject(
    new Error("Not implemented"),
  );

  return mockPomeloWorkflowService;
}
