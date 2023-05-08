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
import { EMPLOYEE_LOAD_CSV_HEADER_VALUES } from "./csv.header.values";

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

    for (let i = 0; i < headers.length; i++) {
      this.validateCsvHeaderAtPosition(i, headers[i], employer.locale);
    }

    // Validate emails are of correct format
    const emails = await this.csvService.getAllRowsForSpecificColumn(file.buffer, 0);
    const invalidEmail = emails.find(email => !/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email));
    if (invalidEmail) {
      this.logger.error(`Invalid email found in CSV file: ${invalidEmail}`);
      throw new ServiceException({
        message: `Invalid email found in CSV file: ${invalidEmail}`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    // Validate salarys are integers
    const salarys = (await this.csvService.getAllRowsForSpecificColumn(file.buffer, 3)).map(salary => Number(salary));
    const invalidSalary = salarys.find(salary => !Number.isInteger(salary));
    if (invalidSalary) {
      this.logger.error(`Invalid salary found in CSV file: ${invalidSalary}`);
      throw new ServiceException({
        message: `Invalid salary found in CSV file: ${invalidSalary}. Salary can only be integer.`,
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

  private validateCsvHeaderAtPosition = (position: number, header: string, locale?: string): void => {
    let headerValue = "";
    switch (position) {
      case 0:
        headerValue = EMPLOYEE_LOAD_CSV_HEADER_VALUES.getOrDefault(EMPLOYEE_LOAD_CSV_HEADER_VALUES.email, locale);
        break;
      case 1:
        headerValue = EMPLOYEE_LOAD_CSV_HEADER_VALUES.getOrDefault(EMPLOYEE_LOAD_CSV_HEADER_VALUES.firstName, locale);
        break;
      case 2:
        headerValue = EMPLOYEE_LOAD_CSV_HEADER_VALUES.getOrDefault(EMPLOYEE_LOAD_CSV_HEADER_VALUES.lastName, locale);
        break;
      case 3:
        headerValue = EMPLOYEE_LOAD_CSV_HEADER_VALUES.getOrDefault(EMPLOYEE_LOAD_CSV_HEADER_VALUES.salary, locale);
        break;
    }

    if (header !== headerValue) {
      throw new ServiceException({
        message: "CSV file is not in the correct format",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
  };
}
