import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Employee, EmployeeAllocationCurrency } from "./domain/Employee";
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
    });
  }

  async updateEmployee(employeeID: string, updateRequest: UpdateEmployeeRequestDTO): Promise<Employee> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    const employee = await this.getEmployeeByID(employeeID);
    const employer = employee.employer;
    const maxAllocationPercent = employer.maxAllocationPercent ?? 100;

    const allocationAmount = updateRequest.allocationAmount ?? employee.allocationAmount;
    const salary = updateRequest.salary ?? employee.salary;

    if (allocationAmount > (maxAllocationPercent * salary) / 100) {
      updateRequest.allocationAmount = Utils.roundTo2DecimalNumber((maxAllocationPercent * salary) / 100);
    }

    return this.employeeRepo.updateEmployee(employeeID, {
      ...(updateRequest.allocationAmount && { allocationAmount: updateRequest.allocationAmount }),
      ...(updateRequest.salary && { salary: updateRequest.salary }),
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

  async updateAllocationAmountsForNewMaxAllocationPercent(
    employerID: string,
    newAllocationPercent: number,
  ): Promise<Employee[]> {
    const updateEmployeePromises: Promise<Employee>[] = [];
    const employees: Employee[] = await this.employeeRepo.getEmployeesForEmployer(employerID);
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
