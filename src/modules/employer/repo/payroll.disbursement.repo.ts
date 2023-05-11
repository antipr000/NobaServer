import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import {
  PayrollDisbursementCreateRequest,
  PayrollDisbursement,
  PayrollDisbursementUpdateRequest,
  EnrichedDisbursement,
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
  getFilteredEnrichedDisbursementsForPayroll(
    payrollID: string,
    filters: EnrichedDisbursementFilterOptionsDTO,
  ): Promise<PaginatedResult<EnrichedDisbursement>>;
  getTotalDisbursementAmountForAllEmployees(): Promise<number>;
}
