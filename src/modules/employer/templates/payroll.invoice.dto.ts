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

export type InvoiceReceiptEmployeeDisbursement = {
  employeeName: string;
  amount: string;
  creditAmount: string;
};

export class InvoiceReceiptTemplateFields {
  companyName: string;
  payrollReference: string;
  payrollDate: string;
  currency: string;
  allocations: InvoiceReceiptEmployeeDisbursement[];
  totalAmount: string;
  totalCreditAmount: string;
}
