import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { EmployerService } from "../employer.service";

export function getMockEmployerServiceWithDefaults(): EmployerService {
  const mockEmployerService: EmployerService = mock(EmployerService);

  when(mockEmployerService.createEmployer(anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.updateEmployer(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerByBubbleID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerByReferralID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.createPayroll(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getPayrollByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getAllEmployees(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.createDisbursement(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.createInvoice(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.createInvoiceReceipt(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.updateDisbursement(anyString(), anyString(), anything())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployerService.updatePayroll(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getEmployerForTransactionID(anyString())).thenReject(new Error("Method not implemented"));
  when(
    mockEmployerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(anyNumber(), anyString()),
  ).thenReject(new Error("Method not implemented"));
  when(
    mockEmployerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(anyNumber(), anyString()),
  ).thenReject(new Error("Method not implemented"));
  when(mockEmployerService.getTotalAllocationAmountAcrossInvoicedPayrolls()).thenReject(
    new Error("Method not implemented"),
  );

  return mockEmployerService;
}
