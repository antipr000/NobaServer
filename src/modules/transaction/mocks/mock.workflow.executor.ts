import { WorkflowExecutor } from "src/infra/temporal/workflow.executor";
import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { SQLTransactionRepo } from "../repo/sql.transaction.repo";
import { ITransactionRepo } from "../repo/transaction.repo";

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
