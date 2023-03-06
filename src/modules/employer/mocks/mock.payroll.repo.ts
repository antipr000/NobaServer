import { anyString, anything, mock, when } from "ts-mockito";
import { IPayrollRepo } from "../repo/payroll.repo";
import { SqlPayrollRepo } from "../repo/sql.payroll.repo";

export function getMockPayrollRepoWithDefaults(): IPayrollRepo {
  const payrollRepo = mock(SqlPayrollRepo);

  when(payrollRepo.addPayroll(anything())).thenReject(new Error("Not implemented"));
  when(payrollRepo.getAllPayrollsForEmployer(anyString(), anything())).thenReject(new Error("Not implemented"));
  when(payrollRepo.getPayrollByID(anyString())).thenReject(new Error("Not implemented"));
  when(payrollRepo.updatePayroll(anyString(), anything())).thenReject(new Error("Not implemented"));

  return payrollRepo;
}
