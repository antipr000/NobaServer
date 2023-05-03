import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Employee, EmployeeAllocationCurrency, EmployeeStatus } from "./domain/Employee";
import { IEmployeeRepo } from "./repo/employee.repo";
import { EMPLOYEE_REPO_PROVIDER } from "./repo/employee.repo.module";
import { CreateEmployeeRequestDTO, UpdateEmployeeRequestDTO } from "./dto/employee.service.dto";
import { Utils } from "../../core/utils/Utils";
import { EmployeeFilterOptionsDTO } from "./dto/employee.filter.options.dto";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { Employer } from "../employer/domain/Employer";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { NotificationPayloadMapper } from "../notifications/domain/NotificationPayload";

@Injectable()
export class EmployeeService {
  @Inject(EMPLOYEE_REPO_PROVIDER) private readonly employeeRepo: IEmployeeRepo;
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  @Inject() private readonly notificationService: NotificationService;

  async createEmployee(request: CreateEmployeeRequestDTO): Promise<Employee> {
    if (request.email) {
      const activeEmployee = await this.employeeRepo.getActiveEmployeeByEmail(request.email);

      if (activeEmployee) {
        this.logger.info(`Tried to create employee with email ${request.email} that already exists!`);
        return activeEmployee;
      }
    }

    return this.employeeRepo.createEmployee({
      allocationAmount: request.allocationAmount,
      allocationCurrency: EmployeeAllocationCurrency.COP,
      employerID: request.employerID,
      ...(request.consumerID && { consumerID: request.consumerID }),
      // If consumerID is populated, create a LINKED employee. Otherwise just set to CREATED.
      status: request.consumerID ? EmployeeStatus.LINKED : EmployeeStatus.CREATED,
      ...(request.email && { email: request.email }),
      ...(request.salary && { salary: request.salary }),
    });
  }

  // Just a helper to abstract status update from caller
  async linkEmployee(employeeID: string, consumerID: string): Promise<Employee> {
    return this.updateEmployee(employeeID, { consumerID: consumerID, status: EmployeeStatus.LINKED });
  }

  async inviteEmployee(email: string, employer: Employer, sendEmail: boolean): Promise<Employee> {
    let employee = await this.createEmployee({
      allocationAmount: 0,
      email: email,
      employerID: employer.id,
    });

    // If opted send notification to the new Employee

    if (sendEmail) {
      const inviteUrl = `https://app.noba.com/app-routing/LoadingScreen/na/na/na/na/na/na/${employee.id}`;

      await this.notificationService.sendNotification(
        NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT,
        NotificationPayloadMapper.toInviteEmployeeEvent(email, employer.name, inviteUrl, employee.id, employer.locale),
      );

      employee = await this.updateEmployee(employee.id, {
        status: EmployeeStatus.INVITED,
        lastInviteSentTimestamp: new Date(),
      });
    }

    return employee;
  }

  async updateEmployee(employeeID: string, updateRequest: UpdateEmployeeRequestDTO): Promise<Employee> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    const employee = await this.getEmployeeByID(employeeID, true);
    let status = updateRequest.status;

    // If we are attempting to update the consumerID, ensure we're not switching from an existing consumer
    if (updateRequest.consumerID && employee.consumerID && updateRequest.consumerID !== employee.consumerID) {
      throw new ServiceException({
        message: "Illegal attempt to modify existing consumerID on employee",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    } else if (updateRequest.consumerID && !employee.consumerID && !updateRequest.status) {
      // If linking consumer and status is not explicitly passed, then set to LINKED
      status = EmployeeStatus.LINKED;
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

    // Validate status transition
    if (updateRequest.status === EmployeeStatus.CREATED) {
      throw new ServiceException({
        message: "Illegal attempt to set existing employee to CREATED status",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (allocationAmount > (maxAllocationPercent * salary) / 100) {
      allocationAmount = Utils.roundTo2DecimalNumber((maxAllocationPercent * salary) / 100);
    }

    return this.employeeRepo.updateEmployee(employeeID, {
      ...(updateRequest.consumerID && { consumerID: updateRequest.consumerID }),
      ...(allocationAmount >= 0 && { allocationAmount: allocationAmount }),
      ...(salary >= 0 && { salary: salary }),
      ...(updateRequest.email && { email: updateRequest.email }),
      ...(status && { status: status }),
      ...(updateRequest.lastInviteSentTimestamp && { lastInviteSentTimestamp: updateRequest.lastInviteSentTimestamp }),
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

  async getFilteredEmployees(filterOptions: EmployeeFilterOptionsDTO): Promise<PaginatedResult<Employee>> {
    return this.employeeRepo.getFilteredEmployees(filterOptions);
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
