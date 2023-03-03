import { anyString, anything, mock, when } from "ts-mockito";
import { IPayrollDisbursementRepo } from "../repo/payroll.disbursement.repo";
import { SqlPayrollDisbursementRepo } from "../repo/sql.payroll.disbursement.repo";

export function getMockPayrollDisbursementRepoWithDefaults(): IPayrollDisbursementRepo {
  const payrollDisbursementRepo = mock(SqlPayrollDisbursementRepo);

  when(payrollDisbursementRepo.createPayrollDisbursement(anything())).thenReject(new Error("Not implemented"));
  when(payrollDisbursementRepo.getAllDisbursementsForEmployee(anyString())).thenReject(new Error("Not implemented"));
  when(payrollDisbursementRepo.getPayrollDisbursementByID(anyString())).thenReject(new Error("Not implemented"));
  when(payrollDisbursementRepo.updatePayrollDisbursement(anyString(), anything())).thenReject(
    new Error("Not implemented"),
  );
  return payrollDisbursementRepo;
}
