import { Payroll, PayrollCreateRequest, PayrollFilter, PayrollUpdateRequest } from "../domain/Payroll";

export interface IPayrollRepo {
  addPayroll(payroll: PayrollCreateRequest): Promise<Payroll>;
  updatePayroll(id: string, payroll: PayrollUpdateRequest): Promise<Payroll>;
  getPayrollByID(id: string): Promise<Payroll>;
  getAllPayrollsForEmployer(employerID: string, filters: PayrollFilter): Promise<Payroll[]>;
  getPayrollMatchingAmountAndEmployerDocumentNumber(
    debitAmount: number,
    employerDocumentNumber: string,
  ): Promise<Payroll[]>;
  getPayrollMatchingAmountAndEmployerDepositMatchingName(
    debitAmount: number,
    employerDepositMatchingName: string,
  ): Promise<Payroll[]>;
}
