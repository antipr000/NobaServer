import { anything, mock, when } from "ts-mockito";
import { MonoWorkflowControllerMappers } from "../mono.workflow.controller.mappers";

export function getMockMonoWorkflowControllerMappersWithDefaults(): MonoWorkflowControllerMappers {
  const mockMonoWorkflowControllerMappers: MonoWorkflowControllerMappers = mock(MonoWorkflowControllerMappers);

  when(mockMonoWorkflowControllerMappers.convertToMonoTransactionDTO(anything())).thenReject(
    new Error("Method not implemented"),
  );
  return mockMonoWorkflowControllerMappers;
}
