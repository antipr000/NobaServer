import {
  PayrollDisbursementCreateRequest,
  PayrollDisbursement,
  PayrollDisbursementUpdateRequest,
} from "../domain/PayrollDisbursement";

export interface IPayrollDisbursementRepo {
  createPayrollDisbursement(payrollDisbursement: PayrollDisbursementCreateRequest): Promise<PayrollDisbursement>;
  updatePayrollDisbursement(
    id: string,
    payrollDisbursement: PayrollDisbursementUpdateRequest,
  ): Promise<PayrollDisbursement>;
  getPayrollDisbursementById(id: string): Promise<PayrollDisbursement>;
  getAllDisbursementsForEmployee(employeeID: string): Promise<PayrollDisbursement[]>;
}
