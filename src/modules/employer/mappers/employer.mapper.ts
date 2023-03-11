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

  toEmployerWorkflowDTO(employer: Employer, employees: Employee[]): EmployerWorkflowDTO {
    const payrollDatesAsc = employer.payrollDates.sort(); // Naturally sorts strings in ascending order
    const futurePayrollDates = this.getFuturePayrollDates(payrollDatesAsc, employer.leadDays);
    if (!employees) employees = [];

    return {
      employerID: employer.id,
      employerName: employer.name,
      employerLogoURI: employer.logoURI,
      leadDays: employer.leadDays,
      employerReferralID: employer.referralID,
      payrollDates: payrollDatesAsc,
      nextPayrollDate: futurePayrollDates[0],
      ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),

      employees: employees.map(employee => ({
        id: employee.id,
        allocationAmount: employee.allocationAmount,
        allocationCurrency: employee.allocationCurrency,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
        ...(employee.salary && { salary: employee.salary }),
      })),
    };
  }

  toEmployerDTO(employer: Employer): EmployerDTO {
    const payrollDatesAsc = employer.payrollDates.sort(); // Naturally sorts strings in ascending order
    const futurePayrollDates = this.getFuturePayrollDates(payrollDatesAsc, employer.leadDays);

    return {
      employerID: employer.id,
      employerName: employer.name,
      employerLogoURI: employer.logoURI,
      leadDays: employer.leadDays,
      employerReferralID: employer.referralID,
      payrollDates: payrollDatesAsc,
      nextPayrollDate: futurePayrollDates[0],
      ...(employer.maxAllocationPercent && { maxAllocationPercent: employer.maxAllocationPercent }),
    };
  }

  toEmployeesWorkflowDTO(employees): EmployeesWorkflowDTO {
    return {
      employees: employees.map(employee => ({
        id: employee.id,
        allocationAmount: employee.allocationAmount,
        allocationCurrency: employee.allocationCurrency,
        employerID: employee.employerID,
        consumerID: employee.consumerID,
        ...(employee.salary && { salary: employee.salary }),
      })),
    };
  }
}
