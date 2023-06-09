import { anything, mock, when } from "ts-mockito";
import { PayrollDepositProcessor } from "../implementations/payroll.deposit.processor";

export function getMockPayrollDepositPreprocessorWithDefaults(): PayrollDepositProcessor {
  const payrollDepositPreprocessor = mock(PayrollDepositProcessor);

  when(payrollDepositPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(payrollDepositPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  when(payrollDepositPreprocessor.performPostProcessing(anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );

  return payrollDepositPreprocessor;
}
