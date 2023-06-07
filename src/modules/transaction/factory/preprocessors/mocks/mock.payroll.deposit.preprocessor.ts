import { anything, mock, when } from "ts-mockito";
import { PayrollDepositPreprocessor } from "../implementations/payroll.deposit.preprocessor";

export function getMockPayrollDepositPreprocessorWithDefaults(): PayrollDepositPreprocessor {
  const payrollDepositPreprocessor = mock(PayrollDepositPreprocessor);

  when(payrollDepositPreprocessor.validate(anything())).thenReject(new Error("Not implemented!"));
  when(payrollDepositPreprocessor.convertToRepoInputTransaction(anything())).thenReject(new Error("Not implemented!"));
  return payrollDepositPreprocessor;
}
