import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { anyNumber, anyString, anything, mock, when } from "ts-mockito";

export function getMockWorkflowExecutorWithDefaults(): WorkflowExecutor {
  const mockWorkflowExecutor: WorkflowExecutor = mock(WorkflowExecutor);

  when(
    mockWorkflowExecutor.executeConsumerWalletTransferWorkflow(anyString(), anyString(), anyNumber(), anyString()),
  ).thenReject(new Error("Method not implemented"));
  when(mockWorkflowExecutor.executeCreditConsumerWalletWorkflow(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockWorkflowExecutor.executeDebitConsumerWalletWorkflow(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );

  return mockWorkflowExecutor;
}
