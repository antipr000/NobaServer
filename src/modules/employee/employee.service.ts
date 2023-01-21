import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
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
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    if (!allocationAmount) {
      throw new ServiceException({
        message: "allocationAmount is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employeeRepo.updateEmployee(employeeID, {
      allocationAmount: allocationAmount,
    });
  }

  async getEmployeeByID(employeeID: string): Promise<Employee> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employeeRepo.getEmployeeByID(employeeID);
  }

  async getEmployeeByConsumerAndEmployerID(consumerID: string, employerID: string): Promise<Employee> {
    if (!consumerID) {
      throw new ServiceException({
        message: "'consumerID' is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    if (!employerID) {
      throw new ServiceException({
        message: "'employerID' is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employeeRepo.getEmployeeByConsumerAndEmployerID(consumerID, employerID);
  }

  async getEmployeesForConsumerID(consumerID: string): Promise<Employee[]> {
    if (!consumerID) {
      throw new ServiceException({
        message: "consumerID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employeeRepo.getEmployeesForConsumerID(consumerID);
  }
}
