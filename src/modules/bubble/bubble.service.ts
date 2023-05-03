import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { EmployeeService } from "../employee/employee.service";
import {
  RegisterEmployerRequest,
  UpdateNobaEmployeeRequest,
  UpdateNobaEmployerRequest,
} from "./dto/bubble.service.dto";
import { EmployerService } from "../employer/employer.service";
import { Employer } from "../employer/domain/Employer";
import { Payroll } from "../employer/domain/Payroll";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { EnrichedDisbursement, PayrollDisbursement } from "../employer/domain/PayrollDisbursement";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { NotificationPayloadMapper } from "../notifications/domain/NotificationPayload";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { Employee } from "../employee/domain/Employee";
import { EmployeeFilterOptionsDTO } from "../employee/dto/employee.filter.options.dto";
import { EnrichedDisbursementFilterOptionsDTO } from "../employer/dto/enriched.disbursement.filter.options.dto";
import { EmployeeCreateRequestDTO } from "./dto/bubble.webhook.controller.dto";
import { S3Service } from "../common/s3.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { GENERATED_DATA_BUCKET_NAME, INVITE_CSV_FOLDER_BUCKET_PATH } from "../../config/ConfigurationUtils";
import { CsvService } from "../common/csv.service";

@Injectable()
export class BubbleService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly notificationService: NotificationService,
    private readonly employeeService: EmployeeService,
    private readonly employerService: EmployerService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly s3Service: S3Service,
    private readonly csvService: CsvService,
  ) {}

  async registerEmployerInNoba(request: RegisterEmployerRequest): Promise<string> {
    const employer: Employer = await this.employerService.createEmployer({
      name: request.name,
      referralID: request.referralID,
      logoURI: request.logoURI,
      bubbleID: request.bubbleID,
      ...(request.locale && { locale: request.locale }),
      ...(request.payrollAccountNumber && { payrollAccountNumber: request.payrollAccountNumber }),
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
      locale: request.locale,
      payrollDates: request.payrollDates,
      payrollAccountNumber: request.payrollAccountNumber,
      maxAllocationPercent: request.maxAllocationPercent,
    });

    if (request.maxAllocationPercent) {
      const updatedEmployees = await this.employeeService.updateAllocationAmountsForNewMaxAllocationPercent(
        employer.id,
        request.maxAllocationPercent,
      );

      const employeeUpdatePromises: Promise<void>[] = updatedEmployees.map(async employee =>
        this.notificationService.sendNotification(
          NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
          NotificationPayloadMapper.toUpdateEmployeeAllocationAmountEvent(employee.id, employee.allocationAmount),
        ),
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
      status: request.status,
    });

    // If the salary update triggered a change to the allocation percent, update Bubble
    if (updatedEmployee?.allocationAmount !== employee.allocationAmount) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
        NotificationPayloadMapper.toUpdateEmployeeAllocationAmountEvent(employeeID, updatedEmployee.allocationAmount),
      );
    }
  }

  async createPayroll(referralID: string, payrollDate: string): Promise<Payroll> {
    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const payroll: Payroll = await this.employerService.createPayroll(employer.id, payrollDate);
    await this.workflowExecutor.executePayrollProcessingWorkflow(payroll.id, payroll.id);
    return payroll;
  }

  async getAllPayrollsForEmployer(referralID: string): Promise<Payroll[]> {
    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    return this.employerService.getAllPayrollsForEmployer(employer.id);
  }

  async getPayroll(referralID: string, payrollID: string): Promise<Payroll> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employer = await this.employerService.getEmployerByReferralID(referralID);

    const payroll = await this.employerService.getPayrollByID(payrollID);

    if (!payroll || payroll.employerID !== employer.id) {
      throw new ServiceException({
        message: `No payroll found with ID: ${payrollID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    return payroll;
  }

  async getAllDisbursementsForEmployee(referralID: string, employeeID: string): Promise<PayrollDisbursement[]> {
    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const employee = await this.employeeService.getEmployeeByID(employeeID);
    if (!employee || employee.employerID !== employer.id) {
      throw new ServiceException({
        message: `No employee found with ID: ${employeeID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    return this.employerService.getAllDisbursementsForEmployee(employeeID);
  }

  async getAllEnrichedDisbursementsForPayroll(
    referralID: string,
    payrollID: string,
    filterOptions: EnrichedDisbursementFilterOptionsDTO,
  ): Promise<PaginatedResult<EnrichedDisbursement>> {
    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const payroll = await this.employerService.getPayrollByID(payrollID);
    if (!payroll || payroll.employerID !== employer.id) {
      throw new ServiceException({
        message: `No payroll found with ID: ${payrollID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    return this.employerService.getFilteredEnrichedDisbursementsForPayroll(payrollID, filterOptions);
  }

  async getAllEmployeesForEmployer(
    referralID: string,
    filterOptions: EmployeeFilterOptionsDTO,
  ): Promise<PaginatedResult<Employee>> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employerService.getFilteredEmployeesForEmployer(referralID, filterOptions);
  }

  async createEmployeeForEmployer(referralID: string, payload: EmployeeCreateRequestDTO): Promise<Employee> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (!payload.email) {
      throw new ServiceException({
        message: "Email is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.employeeService.inviteEmployee(payload.email, employer, payload.sendEmail);
  }

  async bulkInviteEmployeesForEmployer(referralID: string, file: Express.Multer.File): Promise<void> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employer = await this.employerService.getEmployerByReferralID(referralID);
    if (!employer) {
      throw new ServiceException({
        message: `No employer found with referralID: ${referralID}`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    // Validate CSV file is or correct format
    const headers = await this.csvService.getHeadersFromCsvFile(file.buffer);

    const validHeaders = ["Email", "First Name", "Last Name", "Salary"];

    if (validHeaders.some(header => !headers.includes(header))) {
      throw new ServiceException({
        message: "CSV file is not in the correct format",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const bucketName = this.configService.get(GENERATED_DATA_BUCKET_NAME);
    const bucketPath = this.configService.get(INVITE_CSV_FOLDER_BUCKET_PATH);
    const fileName = `${employer.id}.csv`;
    // Upload to S3
    await this.s3Service.uploadToS3(bucketPath, fileName, file.buffer);

    // Trigger workflow
    await this.workflowExecutor.executeBulkInviteEmployeesWorkflow(
      employer.id,
      bucketName,
      `${bucketPath}/${fileName}`,
      employer.id,
    );
  }
}
