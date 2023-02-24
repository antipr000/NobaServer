import { anything, mock, when } from "ts-mockito";
import { TransactionWorkflowMapper } from "../mapper/transaction.workflow.mapper";

export function getMockTransactionWorkflowMapperWithDefaults(): TransactionWorkflowMapper {
  const mockTransactionWorkflowMapper: TransactionWorkflowMapper = mock(TransactionWorkflowMapper);

  when(mockTransactionWorkflowMapper.toWorkflowTransactionDTO(anything(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  return mockTransactionWorkflowMapper;
}
