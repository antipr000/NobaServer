import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Consumer } from "../consumer/domain/Consumer";
import { Employee, EmployeeAllocationCurrency } from "../employee/domain/Employee";
import { EmployeeService } from "../employee/employee.service";
import { BubbleClient } from "./bubble.client";
import { RegisterEmployerRequest, UpdateNobaEmployerRequest } from "./dto/bubble.service.dto";
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
      ...(request.leadDays && { leadDays: request.leadDays }),
      ...(request.payrollDays && { payrollDays: request.payrollDays }),
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
      payrollDays: request.payrollDays,
    });
  }
}
