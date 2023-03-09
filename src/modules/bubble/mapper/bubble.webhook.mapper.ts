import { Payroll } from "../../../modules/employer/domain/Payroll";
import { DisbursementDTO, PayrollDTO } from "../dto/bubble.webhook.controller.dto";
import { PayrollDisbursement } from "../../../modules/employer/domain/PayrollDisbursement";

export class BubbleWebhookMapper {
  toPayrollDTO(payroll: Payroll): PayrollDTO {
    return {
      payrollID: payroll.id,
      payrollDate: payroll.payrollDate,
      status: payroll.status,
      reference: payroll.referenceNumber.toString(),
      ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
      ...(payroll.totalDebitAmount && { totalDebitAmount: payroll.totalDebitAmount }),
      ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
      ...(payroll.debitCurrency && { debitCurrency: payroll.debitCurrency }),
      ...(payroll.creditCurrency && { creditCurrency: payroll.creditCurrency }),
      ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
    };
  }

  toDisbursementDTO(disbursement: PayrollDisbursement): DisbursementDTO {
    return {
      id: disbursement.id,
      employeeID: disbursement.employeeID,
      transactionID: disbursement.transactionID,
      debitAmount: disbursement.debitAmount,
    };
  }
}
