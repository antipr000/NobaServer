import { anyNumber, anyString, mock, when } from "ts-mockito";
import { WorkflowExecutor } from "../workflow.executor";

export function getMockWorkflowExecutorWithDefaults(): WorkflowExecutor {
  const workflowExecutor = mock(WorkflowExecutor);
  when(
    workflowExecutor.executeConsumerWalletTransferWorkflow(anyString(), anyString(), anyNumber(), anyString()),
  ).thenReject(new Error("Not implemented!"));
  when(workflowExecutor.executeCreditConsumerWalletWorkflow(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(workflowExecutor.executeDebitConsumerWalletWorkflow(anyString(), anyNumber(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  return workflowExecutor;
}
