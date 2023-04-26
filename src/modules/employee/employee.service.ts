import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Employee, EmployeeAllocationCurrency, EmployeeStatus } from "./domain/Employee";
import { IEmployeeRepo } from "./repo/employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "./repo/employee.repo.module";
import { UpdateEmployeeRequestDTO } from "./dto/employee.service.dto";
import { Utils } from "../../core/utils/Utils";

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
      status: EmployeeStatus.CREATED,
    });
  }

  async updateEmployee(employeeID: string, updateRequest: UpdateEmployeeRequestDTO): Promise<Employee> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    const employee = await this.getEmployeeByID(employeeID, true);

    // If we are attempting to update the consumerID, ensure we're not switching from an existing consumer
    if (updateRequest.consumerID && employee.consumerID && updateRequest.consumerID !== employee.consumerID) {
      throw new ServiceException({
        message: "Illegal attempt to modify existing consumerID on employee",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employer = employee.employer;

    const maxAllocationPercent = employer.maxAllocationPercent ?? 100;

    let allocationAmount = updateRequest.allocationAmount;
    if (allocationAmount === undefined || allocationAmount === null || allocationAmount < 0) {
      allocationAmount = employee.allocationAmount;
    }

    let salary = updateRequest.salary;
    if (salary === undefined || salary === null || salary < 0) {
      salary = employee.salary;
    }

    if (allocationAmount > (maxAllocationPercent * salary) / 100) {
      allocationAmount = Utils.roundTo2DecimalNumber((maxAllocationPercent * salary) / 100);
    }

    return this.employeeRepo.updateEmployee(employeeID, {
      ...(updateRequest.consumerID && { consumerID: updateRequest.consumerID }),
      ...(allocationAmount >= 0 && { allocationAmount: allocationAmount }),
      ...(salary >= 0 && { salary: salary }),
      ...(updateRequest.email && { email: updateRequest.email }),
      ...(updateRequest.status && { status: updateRequest.status }),
    });
  }

  async getEmployeeByID(employeeID: string, fetchEmployerDetails?: boolean): Promise<Employee> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employeeRepo.getEmployeeByID(employeeID, fetchEmployerDetails);
  }

  async getEmployeeByConsumerAndEmployerID(consumerID: string, employerID: string): Promise<Employee> {
    if (!consumerID) {
      throw new ServiceException({
        message: "'consumerID' is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!employerID) {
      throw new ServiceException({
        message: "'employerID' is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employeeRepo.getEmployeeByConsumerAndEmployerID(consumerID, employerID);
  }

  async getEmployeesForConsumerID(consumerID: string, fetchEmployerDetails = false): Promise<Employee[]> {
    if (!consumerID) {
      throw new ServiceException({
        message: "consumerID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employeeRepo.getEmployeesForConsumerID(consumerID, fetchEmployerDetails);
  }

  async getEmployeesForEmployer(employerID: string): Promise<Employee[]> {
    if (!employerID) {
      throw new ServiceException({
        message: "employerID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return await this.employeeRepo.getEmployeesForEmployerWithConsumer(employerID);
  }

  async updateAllocationAmountsForNewMaxAllocationPercent(
    employerID: string,
    newAllocationPercent: number,
  ): Promise<Employee[]> {
    const updateEmployeePromises: Promise<Employee>[] = [];
    const employees: Employee[] = await this.getEmployeesForEmployer(employerID);
    for (const employee of employees) {
      const maxAllocationAmount = (newAllocationPercent * employee.salary) / 100;

      if (employee.allocationAmount > maxAllocationAmount) {
        updateEmployeePromises.push(
          this.employeeRepo.updateEmployee(employee.id, {
            allocationAmount: Utils.roundTo2DecimalNumber(maxAllocationAmount),
          }),
        );
      }
    }

    return Promise.all(updateEmployeePromises);
  }
}
