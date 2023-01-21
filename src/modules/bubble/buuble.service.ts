import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
import { Consumer } from "../consumer/domain/Consumer";
import { Employee, EmployeeAllocationCurrency } from "../employee/domain/Employee";
import { EmployeeService } from "../employee/employee.service";
import { BubbleClient } from "./bubble.client";
import { RegisterEmployerRequest } from "./dto/bubble.service.dto";
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

    return this.bubbleClient.registerNewEmployee({
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      phone: consumer.props.phone,
      employerID: nobaEmployee.employerID,
      nobaEmployeeID: nobaEmployee.id,
      allocationAmountInPesos: nobaEmployee.allocationAmount,
    });
  }

  async updateEmployeeAllocationInBubble(nobaEmployeeID: string, allocationAmount: number): Promise<void> {
    return this.bubbleClient.updateEmployeeAllocationAmount(nobaEmployeeID, allocationAmount);
  }

  async registerEmployerInNoba(request: RegisterEmployerRequest): Promise<string> {
    const employer: Employer = await this.employerService.createEmployer(
      request.name,
      request.logoURI,
      request.referralID,
      request.bubbleID,
    );

    return employer.id;
  }
}
