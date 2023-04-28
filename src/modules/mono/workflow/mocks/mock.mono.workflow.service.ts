import { anyString, anything, mock, when } from "ts-mockito";
import { MonoWorkflowService } from "../mono.workflow.service";

export function getMockMonoWorkflowServiceWithDefaults(): MonoWorkflowService {
  const mockMonoWorkflowService: MonoWorkflowService = mock(MonoWorkflowService);

  when(mockMonoWorkflowService.createMonoTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoWorkflowService.getTransactionByCollectionLinkID(anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockMonoWorkflowService.getTransactionByNobaTransactionID(anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockMonoWorkflowService;
}
