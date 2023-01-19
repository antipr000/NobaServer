import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Employee, EmployeeAllocationCurrency } from "./domain/Employee";
import { IEmployeeRepo } from "./repo/employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "./repo/employee.repo.module";

@Injectable()
export class EmployeeService {
  constructor(
    @Inject(EMPLOYEE_REPO_PROVIDER) private readonly employeeRepo: IEmployeeRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEmployee(allocationAmount: number, employerID: string, consumerID: string): Promise<Employee> {
    return this.employeeRepo.createEmployee({
      allocationAmount: allocationAmount,
      allocationCurrency: EmployeeAllocationCurrency.COP,
      employerID: employerID,
      consumerID: consumerID,
    });
  }

  async updateEmployee(employeeID: string, allocationAmount: number): Promise<Employee> {
    return this.employeeRepo.updateEmployee(employeeID, {
      allocationAmount: allocationAmount,
    });
  }

  async getEmployeeByID(employeeID: string): Promise<Employee> {
    return this.employeeRepo.getEmployeeByID(employeeID);
  }

  async getEmployeesForConsumerID(consumerID: string): Promise<Employee[]> {
    return this.employeeRepo.getEmployeesForConsumerID(consumerID);
  }
}
