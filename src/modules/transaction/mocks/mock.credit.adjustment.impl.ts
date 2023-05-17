import { anyString, anything, mock, when } from "ts-mockito";
import { CreditAdjustmentImpl } from "../factory/credit.adjustment.impl";

export function getMockCreditAdjustmentImplWithDefaults(): CreditAdjustmentImpl {
  const creditAdjustmentImpl = mock(CreditAdjustmentImpl);
  when(creditAdjustmentImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(creditAdjustmentImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  return creditAdjustmentImpl;
}
