import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Consumer } from "../consumer/domain/Consumer";
import { Employee, EmployeeAllocationCurrency } from "../employee/domain/Employee";
import { EmployeeService } from "../employee/employee.service";
import { BubbleClient } from "./bubble.client";
import {
  RegisterEmployerRequest,
  UpdateNobaEmployeeRequest,
  UpdateNobaEmployerRequest,
} from "./dto/bubble.service.dto";
import { EmployerService } from "../employer/employer.service";
import { Employer } from "../employer/domain/Employer";

@Injectable()
export class BubbleService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly bubbleClient: BubbleClient,
    private readonly employeeService: EmployeeService,
    private readonly employerService: EmployerService,
  ) {}

  async createEmployeeInBubble(nobaEmployeeID: string, consumer: Consumer): Promise<void> {
    const nobaEmployee: Employee = await this.employeeService.getEmployeeByID(nobaEmployeeID);

    if (nobaEmployee.allocationCurrency !== EmployeeAllocationCurrency.COP) {
      throw new ServiceException({
        message: "Only COP is supported as 'allocationCurrency'",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    const employer: Employer = await this.employerService.getEmployerByID(nobaEmployee.employerID);

    await this.bubbleClient.registerNewEmployee({
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      phone: consumer.props.phone,
      employerReferralID: employer.referralID,
      nobaEmployeeID: nobaEmployee.id,
      allocationAmountInPesos: nobaEmployee.allocationAmount,
    });
  }

  async updateEmployeeAllocationInBubble(nobaEmployeeID: string, allocationAmount: number): Promise<void> {
    return this.bubbleClient.updateEmployeeAllocationAmount(nobaEmployeeID, allocationAmount);
  }

  async registerEmployerInNoba(request: RegisterEmployerRequest): Promise<string> {
    const employer: Employer = await this.employerService.createEmployer({
      name: request.name,
      referralID: request.referralID,
      logoURI: request.logoURI,
      bubbleID: request.bubbleID,
      ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
      ...(request.leadDays && { leadDays: request.leadDays }),
      ...(request.payrollDates && { payrollDates: request.payrollDates }),
    });

    return employer.id;
  }

  async updateEmployerInNoba(referralID: string, request: UpdateNobaEmployerRequest): Promise<void> {
    const employer: Employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    await this.employerService.updateEmployer(employer.id, {
      leadDays: request.leadDays,
      logoURI: request.logoURI,
      payrollDates: request.payrollDates,
      maxAllocationPercent: request.maxAllocationPercent,
    });

    if (request.maxAllocationPercent) {
      const updatedEmployees = await this.employeeService.updateAllocationAmountsForNewMaxAllocationPercent(
        employer.id,
        request.maxAllocationPercent,
      );

      const employeeUpdatePromises: Promise<void>[] = updatedEmployees.map(async employee =>
        this.updateEmployeeAllocationInBubble(employee.id, employee.allocationAmount),
      );

      await Promise.all(employeeUpdatePromises);
    }
  }

  async updateEmployee(employeeID: string, request: UpdateNobaEmployeeRequest): Promise<void> {
    const employee = await this.employeeService.getEmployeeByID(employeeID);
    if (!employee) {
      throw new ServiceException({
        message: `No employee found with ID: ${employeeID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const updatedEmployee = await this.employeeService.updateEmployee(employeeID, {
      salary: request.salary,
    });

    // If the salary update triggered a change to the allocation percent, update Bubble
    if (updatedEmployee?.allocationAmount !== employee.allocationAmount) {
      await this.updateEmployeeAllocationInBubble(employeeID, updatedEmployee.allocationAmount);
    }
  }
}
