import { Payroll } from "../../../modules/employer/domain/Payroll";
import {
  DisbursementDTO,
  EmployeeResponseDTO,
  PaginatedEmployeeResponseDTO,
  PayrollDTO,
} from "../dto/bubble.webhook.controller.dto";
import { PayrollDisbursement } from "../../../modules/employer/domain/PayrollDisbursement";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { Employee } from "../../../modules/employee/domain/Employee";

export class BubbleWebhookMapper {
  toPayrollDTO(payroll: Payroll): PayrollDTO {
    return {
      payrollID: payroll.id,
      payrollDate: payroll.payrollDate,
      status: payroll.status,
      reference: payroll.referenceNumber.toString(),
      payrollISODate: new Date(`${payroll.payrollDate}T12:00:00.000Z`),
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
      debitAmount: disbursement.allocationAmount,
    };
  }

  toEmployeeResponseDTO(employee: Employee): EmployeeResponseDTO {
    return {
      id: employee.id,
      allocationAmount: employee.allocationAmount,
      allocationCurrency: employee.allocationCurrency,
      status: employee.status,
      employerID: employee.employerID,
    };
  }

  toPaginatedEmployeeDTOs(paginatedResult: PaginatedResult<Employee>): PaginatedEmployeeResponseDTO {
    return {
      page: paginatedResult.page,
      totalItems: paginatedResult.totalItems,
      totalPages: paginatedResult.totalPages,
      hasNextPage: paginatedResult.hasNextPage,
      items: paginatedResult.items.map(employee => {
        return {
          id: employee.id,
          allocationAmount: employee.allocationAmount,
          allocationCurrency: employee.allocationCurrency,
          employerID: employee.employerID,
          consumerID: employee.consumerID,
          salary: employee.salary,
          email: employee.email,
          status: employee.status,
          firstName: employee.consumer.props.firstName,
          lastName: employee.consumer.props.lastName,
          consumerEmail: employee.consumer.props.email,
          phoneNumber: employee.consumer.props.phone,
          handle: employee.consumer.props.handle,
        };
      }),
    };
  }
}
