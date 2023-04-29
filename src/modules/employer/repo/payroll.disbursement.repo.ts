import {
  PayrollDisbursementCreateRequest,
  PayrollDisbursement,
  PayrollDisbursementUpdateRequest,
} from "../domain/PayrollDisbursement";
import { EnrichedDisbursementFilterOptionsDTO } from "../dto/enriched.disbursement.filter.options.dto";

export interface IPayrollDisbursementRepo {
  createPayrollDisbursement(payrollDisbursement: PayrollDisbursementCreateRequest): Promise<PayrollDisbursement>;
  updatePayrollDisbursement(
    id: string,
    payrollDisbursement: PayrollDisbursementUpdateRequest,
  ): Promise<PayrollDisbursement>;
  getPayrollDisbursementByID(id: string): Promise<PayrollDisbursement>;
  getPayrollDisbursementByTransactionID(transactionID: string): Promise<PayrollDisbursement>;
  getAllDisbursementsForEmployee(employeeID: string): Promise<PayrollDisbursement[]>;
  getAllDisbursementsForPayroll(payrollID: string): Promise<PayrollDisbursement[]>;
  getAllEnrichedDisbursementsForPayroll(
    payrollID: string,
    filters: EnrichedDisbursementFilterOptionsDTO,
  ): Promise<PayrollDisbursement[]>;
}
