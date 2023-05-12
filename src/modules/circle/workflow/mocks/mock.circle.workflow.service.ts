import { mock, when } from "ts-mockito";
import { CircleWorkflowService } from "../circle.workflow.service";

export function getMockCircleWorkflowServiceWithDefaults(): CircleWorkflowService {
  const mockCircleWorkflowService: CircleWorkflowService = mock(CircleWorkflowService);

  when(mockCircleWorkflowService.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls()).thenReject(
    new Error("Method not implemented"),
  );
  return mockCircleWorkflowService;
}
