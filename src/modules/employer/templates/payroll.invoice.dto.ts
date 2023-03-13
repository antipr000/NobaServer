import { EmployeeDisbursement } from "../domain/Employer";

export type InvoiceEmployeeDisbursement = {
  employeeName: string;
  amount: string;
};

export class InvoiceTemplateFields {
  companyName: string;
  payrollReference: string;
  payrollDate: string;
  nobaAccountNumber: string;
  currency: string;
  allocations: InvoiceEmployeeDisbursement[];
  totalAmount: string;
}
