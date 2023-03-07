import { anyNumber, anyString, mock, when } from "ts-mockito";
import { WorkflowExecutor } from "../workflow.executor";

export function getMockWorkflowExecutorWithDefaults(): WorkflowExecutor {
  const workflowExecutor = mock(WorkflowExecutor);
  when(workflowExecutor.executeWalletTransferWorkflow(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(workflowExecutor.executeWalletDepositWorkflow(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(workflowExecutor.executeWalletWithdrawalWorkflow(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(workflowExecutor.executePayrollProcessingWorkflow(anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(workflowExecutor.getHealth()).thenReject(new Error("Not implemented!"));
  return workflowExecutor;
}
