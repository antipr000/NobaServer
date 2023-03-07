import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Employer } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import {
  EMPLOYER_REPO_PROVIDER,
  PAYROLL_DISBURSEMENT_REPO_PROVIDER,
  PAYROLL_REPO_PROVIDER,
} from "./repo/employer.repo.module";
import {
  CreateEmployerRequestDTO,
  EmployerWithEmployeesDTO,
  UpdateEmployerRequestDTO,
} from "./dto/employer.service.dto";
import { EmployeeService } from "../employee/employee.service";
import { IPayrollRepo } from "./repo/payroll.repo";
import { IPayrollDisbursementRepo } from "./repo/payroll.disbursement.repo";
import { Payroll, PayrollCreateRequest } from "./domain/Payroll";
import {
  CreateDisbursementRequestDTO,
  UpdateDisbursementRequestDTO,
  UpdatePayrollRequestDTO,
} from "./dto/payroll.workflow.controller.dto";
import { PayrollDisbursement } from "./domain/PayrollDisbursement";
import { PayrollUpdateRequest } from "./domain/Payroll";
import { PayrollStatus } from "./domain/Payroll";
import { Utils } from "../../core/utils/Utils";
import { ExchangeRateService } from "../common/exchangerate.service";
import { Currency } from "../transaction/domain/TransactionTypes";
import { isValidDateString } from "../../core/utils/DateUtils";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";

@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;

  @Inject()
  private readonly employeeService: EmployeeService;

  @Inject()
  private readonly exchangeRateService: ExchangeRateService;

  @Inject()
  private readonly notificationService: NotificationService;

  constructor(
    @Inject(EMPLOYER_REPO_PROVIDER) private readonly employerRepo: IEmployerRepo,
    @Inject(PAYROLL_REPO_PROVIDER) private readonly payrollRepo: IPayrollRepo,
    @Inject(PAYROLL_DISBURSEMENT_REPO_PROVIDER) private readonly payrollDisbursementRepo: IPayrollDisbursementRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private validateLeadDays(leadDays: number): void {
    if (leadDays > this.MAX_LEAD_DAYS || leadDays < 1) {
      throw new ServiceException({
        message: `Lead days cannot be more than ${this.MAX_LEAD_DAYS}`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
  }

  async getEmployerWithEmployees(
    employerID: string,
    shouldFetchEmployees?: boolean,
  ): Promise<EmployerWithEmployeesDTO> {
    if (!employerID) {
      throw new ServiceException({
        message: "Employer ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employer = await this.employerRepo.getEmployerByID(employerID);
    if (!employer) {
      throw new ServiceException({
        message: "Employer not found",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }
    let employees = [];
    if (shouldFetchEmployees) {
      employees = await this.employeeService.getEmployeesForEmployer(employerID);
    }
    return { ...employer, employees };
  }

  async createEmployer(request: CreateEmployerRequestDTO): Promise<Employer> {
    // Note - Don't replace it with "0". It will be treated as false.
    if (request.leadDays === undefined || request.leadDays === null) {
      request.leadDays = 1;
    }
    this.validateLeadDays(request.leadDays);

    return this.employerRepo.createEmployer({
      name: request.name,
      logoURI: request.logoURI,
      referralID: request.referralID,
      bubbleID: request.bubbleID,
      leadDays: request.leadDays,
      payrollAccountNumber: request.payrollAccountNumber,
      payrollDates: request.payrollDates,
      ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
    });
  }

  async updateEmployer(id: string, request: UpdateEmployerRequestDTO): Promise<Employer> {
    if (!id) {
      throw new ServiceException({
        message: "ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    if (Object.keys(request).length === 0) {
      throw new ServiceException({
        message: "No fields to update",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    if (request.leadDays !== undefined && request.leadDays !== null) {
      this.validateLeadDays(request.leadDays);
    }

    return this.employerRepo.updateEmployer(id, {
      ...(request.logoURI && { logoURI: request.logoURI }),
      ...(request.referralID && { referralID: request.referralID }),
      ...(request.leadDays && { leadDays: request.leadDays }),
      ...(request.payrollDates && { payrollDates: request.payrollDates }),
      ...(request.payrollAccountNumber && { payrollAccountNumber: request.payrollAccountNumber }),
      ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
    });
  }

  async getEmployerByID(id: string): Promise<Employer> {
    if (!id) {
      throw new ServiceException({
        message: "ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employerRepo.getEmployerByID(id);
  }

  async getEmployerByReferralID(referralID: string): Promise<Employer> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employerRepo.getEmployerByReferralID(referralID);
  }

  async getEmployerByBubbleID(bubbleID: string): Promise<Employer> {
    if (!bubbleID) {
      throw new ServiceException({
        message: "bubbleID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employerRepo.getEmployerByBubbleID(bubbleID);
  }

  async getPayrollByID(id: string): Promise<Payroll> {
    if (!id) {
      throw new ServiceException({
        message: "ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.payrollRepo.getPayrollByID(id);
  }

  async createPayroll(employerID: string, payrollDate: string): Promise<Payroll> {
    if (!employerID) {
      throw new ServiceException({
        message: "employerID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!isValidDateString(payrollDate)) {
      throw new ServiceException({
        message: "payrollDate is invalid",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const payrollCreateRequest: PayrollCreateRequest = {
      employerID: employerID,
      reference: Utils.generateLowercaseUUID(true),
      payrollDate: payrollDate,
    };

    return this.payrollRepo.addPayroll(payrollCreateRequest);
  }

  async updatePayroll(payrollID: string, request: UpdatePayrollRequestDTO): Promise<Payroll> {
    if (!payrollID) {
      throw new ServiceException({
        message: "payrollID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const payrollUpdateRequest: PayrollUpdateRequest = {
      status: request.status,
    };

    if (request.status === PayrollStatus.COMPLETED) {
      payrollUpdateRequest.completedTimestamp = new Date();
    } else if (request.status === PayrollStatus.PREPARED) {
      const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

      const totalDebitAmountInCOP = disbursements.reduce((acc, disbursement) => acc + disbursement.debitAmount, 0);

      const exchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD);

      const totalCreditAmountInUSD = totalDebitAmountInCOP * exchangeRateDTO.nobaRate;

      payrollUpdateRequest.totalDebitAmount = totalDebitAmountInCOP;
      payrollUpdateRequest.exchangeRate = exchangeRateDTO.nobaRate;
      payrollUpdateRequest.totalCreditAmount = totalCreditAmountInUSD;
    }

    const updatedPayroll = await this.payrollRepo.updatePayroll(payrollID, payrollUpdateRequest);

    // Notify dashboard about the update of payroll status

    if (request.status) {
      await this.notificationService.sendNotification(NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT, {
        nobaPayrollID: updatedPayroll.id,
        payrollStatus: updatedPayroll.status,
      });
    }

    return updatedPayroll;
  }

  async createDisbursement(
    payrollID: string,
    createDisbursementRequest: CreateDisbursementRequestDTO,
  ): Promise<PayrollDisbursement> {
    if (!payrollID) {
      throw new ServiceException({
        message: "payrollID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    if (!createDisbursementRequest.employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employee = await this.employeeService.getEmployeeByID(createDisbursementRequest.employeeID);

    if (!employee) {
      throw new ServiceException({
        message: "Employee not found",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const amount = employee.allocationAmount;
    return await this.payrollDisbursementRepo.createPayrollDisbursement({
      payrollID: payrollID,
      employeeID: createDisbursementRequest.employeeID,
      debitAmount: amount,
    });
  }

  async updateDisbursement(
    payrollID: string,
    disbursementID: string,
    updateDisbursementRequest: UpdateDisbursementRequestDTO,
  ): Promise<PayrollDisbursement> {
    if (!payrollID) {
      throw new ServiceException({
        message: "payrollID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!disbursementID) {
      throw new ServiceException({
        message: "disbursementID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const disbursement = await this.payrollDisbursementRepo.getPayrollDisbursementByID(disbursementID);

    if (!disbursement) {
      throw new ServiceException({
        message: "Payroll Disbursement not found",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (disbursement.payrollID !== payrollID) {
      throw new ServiceException({
        message: "Payroll Disbursement not found",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    return this.payrollDisbursementRepo.updatePayrollDisbursement(disbursementID, {
      transactionID: updateDisbursementRequest.transactionID,
    });
  }

  async getDisbursement(disbursementID: string): Promise<PayrollDisbursement> {
    return this.payrollDisbursementRepo.getPayrollDisbursementByID(disbursementID);
  }

  async createInvoice(payrollID: string): Promise<void> {
    throw new Error("Not implemented");
  }
}
