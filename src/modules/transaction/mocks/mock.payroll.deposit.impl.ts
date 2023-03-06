import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { PayrollDepositImpl } from "../factory/payroll.deposit.impl";

export function getMockPayrollDepositImplWithDefaults(): PayrollDepositImpl {
  const payrollDepositImpl = mock(PayrollDepositImpl);
  when(payrollDepositImpl.initiateWorkflow(anything())).thenReject(new Error("Not implemented!"));
  when(payrollDepositImpl.preprocessTransactionParams(anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(payrollDepositImpl.getTransactionQuote(anyNumber(), anything(), anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );

  return payrollDepositImpl;
}
