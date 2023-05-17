import { anyString, anything, mock, when } from "ts-mockito";
import { DebitAdjustmentImpl } from "../factory/debit.adjustment.impl";

export function getMockDebitAdjustmentImplWithDefaults(): DebitAdjustmentImpl {
  const debitAdjustmentImpl = mock(DebitAdjustmentImpl);
  when(debitAdjustmentImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(debitAdjustmentImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(debitAdjustmentImpl.getTransactionQuote(anything(), anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );
  return debitAdjustmentImpl;
}
