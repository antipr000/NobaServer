import { Employee } from "../../../modules/employee/domain/Employee";
import { Employer } from "../domain/Employer";
import { EmployerDTO } from "../dto/employer.controller.dto";
import { EmployeesWorkflowDTO, EmployerWorkflowDTO } from "../dto/employer.workflow.controller.dto";

export class EmployerMapper {
  private getFuturePayrollDates(payrollDates: string[], leadDays: number): string[] {
    const now = new Date().setHours(0, 0, 0, 0);
    return payrollDates.filter(date => {
      return new Date(date) > new Date(now + leadDays * 24 * 60 * 60 * 1000);
    });
  }

  toEmployerWorkflowDTO(employer: Employer): EmployerWorkflowDTO {
    const payrollDatesAsc = employer.payrollDates.sort(); // Naturally sorts strings in ascending order
    const futurePayrollDates = this.getFuturePayrollDates(payrollDatesAsc, employer.leadDays);

    return {
      employerID: employer.id,
      employerName: employer.name,
      employerLogoURI: employer.logoURI,
      locale: employer.locale,
      leadDays: employer.leadDays,
      employerReferralID: employer.referralID,
      payrollDates: payrollDatesAsc,
      nextPayrollDate: futurePayrollDates[0],
      ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),
      ...(employer.documentNumber && { documentNumber: employer.documentNumber }),
      ...(employer.depositMatchingName && { depositMatchingName: employer.depositMatchingName }),
    };
  }

  toEmployerDTO(employer: Employer): EmployerDTO {
    const payrollDatesAsc = employer.payrollDates.sort(); // Naturally sorts strings in ascending order
    const futurePayrollDates = this.getFuturePayrollDates(payrollDatesAsc, employer.leadDays);

    return {
      employerID: employer.id,
      employerName: employer.name,
      employerLogoURI: employer.logoURI,
      locale: employer.locale,
      leadDays: employer.leadDays,
      employerReferralID: employer.referralID,
      payrollDates: payrollDatesAsc,
      nextPayrollDate: futurePayrollDates[0],
      ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),
      ...(employer.documentNumber && { documentNumber: employer.documentNumber }),
      ...(employer.depositMatchingName && { depositMatchingName: employer.depositMatchingName }),
    };
  }

  toEmployeesWorkflowDTO(employees: Employee[]): EmployeesWorkflowDTO {
    return {
      employees: employees.map(employee => ({
        id: employee.id,
        allocationAmount: employee.allocationAmount,
        allocationCurrency: employee.allocationCurrency,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
        status: employee.status,
        ...(employee.email && { email: employee.email }),
        ...(employee.salary && { salary: employee.salary }),
      })),
    };
  }
}
