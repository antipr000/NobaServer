import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { EmployeeDisbursement, Employer } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import {
  EMPLOYER_REPO_PROVIDER,
  PAYROLL_DISBURSEMENT_REPO_PROVIDER,
  PAYROLL_REPO_PROVIDER,
} from "./repo/employer.repo.module";
import { CreateEmployerRequestDTO, UpdateEmployerRequestDTO } from "./dto/employer.service.dto";
import dayjs from "dayjs";
import { ConsumerService } from "../consumer/consumer.service";
import { EmployeeService } from "../employee/employee.service";
import { S3Service } from "../common/s3.service";
import "dayjs/locale/es";
import { IPayrollRepo } from "./repo/payroll.repo";
import { IPayrollDisbursementRepo } from "./repo/payroll.disbursement.repo";
import { Payroll, PayrollCreateRequest, isStatusTransitionAllowed } from "./domain/Payroll";
import {
  CreateDisbursementRequestDTO,
  UpdateDisbursementRequestDTO,
  UpdatePayrollRequestDTO,
} from "./dto/payroll.workflow.controller.dto";
import { PayrollDisbursement } from "./domain/PayrollDisbursement";
import { PayrollUpdateRequest, PayrollStatus } from "./domain/Payroll";
import { Currency } from "../transaction/domain/TransactionTypes";
import { isValidDateString } from "../../core/utils/DateUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { KmsService } from "../common/kms.service";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import {
  INVOICES_FOLDER_BUCKET_PATH,
  NOBA_CONFIG_KEY,
  TEMPLATES_FOLDER_BUCKET_PATH,
} from "../../config/ConfigurationUtils";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { Employee } from "../employee/domain/Employee";
import { TemplateProcessor, TemplateFormat, TemplateLocale, FooterData } from "../common/utils/template.processor";
import {
  InvoiceEmployeeDisbursement,
  InvoiceReceiptEmployeeDisbursement,
  InvoiceReceiptTemplateFields,
  InvoiceTemplateFields,
} from "./templates/payroll.invoice.dto";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { v4 } from "uuid";
import { Utils } from "../../core/utils/Utils";
import { ExchangeRateService } from "../exchangerate/exchangerate.service";

@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;
  private readonly nobaPayrollAccountNumber: string;
  private readonly invoiceTemplateBucketPath: string;
  private readonly invoicesFolderBucketPath: string;

  @Inject()
  private readonly s3Service: S3Service;

  @Inject()
  private readonly employeeService: EmployeeService;

  @Inject()
  private readonly exchangeRateService: ExchangeRateService;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly kmsService: KmsService;

  @Inject()
  private readonly workflowExecutor: WorkflowExecutor;

  static readonly FOOTER_TRANSLATIONS = {
    "en-US": {
      center: "Payroll",
      left: "Invoice",
      right: "Page",
    },
    "es-CO": {
      center: "Nómina",
      left: "Factura",
      right: "Página",
    },
  };

  constructor(
    @Inject(EMPLOYER_REPO_PROVIDER) private readonly employerRepo: IEmployerRepo,
    @Inject(PAYROLL_REPO_PROVIDER) private readonly payrollRepo: IPayrollRepo,
    @Inject(PAYROLL_DISBURSEMENT_REPO_PROVIDER) private readonly payrollDisbursementRepo: IPayrollDisbursementRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
  ) {
    this.nobaPayrollAccountNumber =
      this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).payroll.nobaPayrollAccountNumber;
    this.invoiceTemplateBucketPath = this.configService.get(TEMPLATES_FOLDER_BUCKET_PATH);
    this.invoicesFolderBucketPath = this.configService.get(INVOICES_FOLDER_BUCKET_PATH);
  }

  private validateLeadDays(leadDays: number): void {
    if (leadDays > this.MAX_LEAD_DAYS || leadDays < 1) {
      throw new ServiceException({
        message: `Lead days cannot be more than ${this.MAX_LEAD_DAYS}`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
  }

  async getAllEmployees(employerID: string): Promise<Employee[]> {
    if (!employerID) {
      throw new ServiceException({
        message: "Employer ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const employees = await this.employeeService.getEmployeesForEmployer(employerID);
    return employees.filter(employee => {
      return this.consumerService.isActiveConsumer(employee.consumer);
    });
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
      ...(request.documentNumber && { documentNumber: request.documentNumber }),
      ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
      ...(request.depositMatchingName && { depositMatchingName: request.depositMatchingName }),
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
      ...(request.name && { name: request.name }),
      ...(request.logoURI && { logoURI: request.logoURI }),
      ...(request.referralID && { referralID: request.referralID }),
      ...(request.documentNumber && { documentNumber: request.documentNumber }),
      ...(request.leadDays && { leadDays: request.leadDays }),
      ...(request.payrollDates && { payrollDates: request.payrollDates }),
      ...(request.depositMatchingName && { depositMatchingName: request.depositMatchingName }),
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

    const employer: Employer = await this.employerRepo.getEmployerByID(id);
    if (!employer) {
      throw new ServiceException({
        message: "Employer not found",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }
    return employer;
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

  async createInvoice(payrollID: string): Promise<void> {
    if (!payrollID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll ID is required",
      });
    }

    const payroll = await this.payrollRepo.getPayrollByID(payrollID);

    if (!payroll) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll not found",
      });
    }

    const employer = await this.employerRepo.getEmployerByID(payroll.employerID);
    if (!employer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Employer not found",
      });
    }

    let accountNumber = this.nobaPayrollAccountNumber;
    if (employer.payrollAccountNumber) {
      const employerPayrollAccountNumber = await this.kmsService.decryptString(
        employer.payrollAccountNumber,
        KmsKeyType.SSN,
      );

      if (!employerPayrollAccountNumber) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: `Account number failed decryption: ${employer.payrollAccountNumber}`,
        });
      }

      accountNumber = employerPayrollAccountNumber;
    }

    const templateProcessor = new TemplateProcessor(
      this.logger,
      this.s3Service,
      `${this.invoiceTemplateBucketPath}/payroll-invoice/`,
      `template_LOCALE.hbs`,
      `${this.invoicesFolderBucketPath}/${employer.id}/`,
      `inv_${payroll.id}`,
    );

    templateProcessor.addFormat(TemplateFormat.HTML);
    templateProcessor.addFormat(TemplateFormat.PDF);
    templateProcessor.addLocale(
      TemplateLocale.ENGLISH,
      EmployerService.FOOTER_TRANSLATIONS[TemplateLocale.ENGLISH.toString()],
    );
    templateProcessor.addLocale(
      TemplateLocale.SPANISH,
      EmployerService.FOOTER_TRANSLATIONS[TemplateLocale.SPANISH.toString()],
    );

    // Loads templates for each specified locale
    await templateProcessor.loadTemplates();

    const employeeDisbursements = await this.getEmployeeDisbursements(payrollID);

    const companyName = employer.name;
    const currency = payroll.debitCurrency;

    const footerDataMap = new Map<TemplateLocale, FooterData>();

    // Populate templates for each locale
    for (const [locale] of templateProcessor.locales.entries()) {
      const employeeAllocations: InvoiceEmployeeDisbursement[] = employeeDisbursements.map(allocation => ({
        employeeName: allocation.employeeName,
        amount: allocation.amount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
      }));

      const templateFields: InvoiceTemplateFields = {
        companyName: companyName,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        payrollDate: dayjs(payroll.payrollDate).locale(locale.toString()).format("MMMM D, YYYY"),
        currency: currency,
        allocations: employeeAllocations,
        totalAmount: payroll.totalDebitAmount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
        nobaAccountNumber: accountNumber,
      };

      footerDataMap.set(locale, {
        left: `#${templateFields.payrollReference}`,
        center: `${templateFields.payrollDate}`,
      });

      templateProcessor.populateTemplate(locale, templateFields);
    }

    // Upload templates
    await templateProcessor.uploadPopulatedTemplates(footerDataMap);

    // Destroy template context
    await templateProcessor.destroy();
  }

  async createInvoiceReceipt(payrollID: string): Promise<void> {
    if (!payrollID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll ID is required",
      });
    }

    const payroll = await this.payrollRepo.getPayrollByID(payrollID);

    if (!payroll) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll not found",
      });
    }

    // We can create a receipt only if the payroll is in the RECEIPT status
    if (payroll.status !== PayrollStatus.RECEIPT) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Receipt can only be generated for payroll in status IN_PROGRESS or COMPLETED. Current status: ${payroll.status}`,
      });
    }

    const employer = await this.employerRepo.getEmployerByID(payroll.employerID);
    if (!employer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Employer not found",
      });
    }

    const templateProcessor = new TemplateProcessor(
      this.logger,
      this.s3Service,
      `${this.invoiceTemplateBucketPath}/payroll-receipt/`,
      `template_LOCALE.hbs`,
      `${this.invoicesFolderBucketPath}/${employer.id}/`,
      `rct_${payroll.id}`,
    );

    templateProcessor.addFormat(TemplateFormat.HTML);
    templateProcessor.addFormat(TemplateFormat.PDF);
    templateProcessor.addLocale(
      TemplateLocale.ENGLISH,
      EmployerService.FOOTER_TRANSLATIONS[TemplateLocale.ENGLISH.toString()],
    );
    templateProcessor.addLocale(
      TemplateLocale.SPANISH,
      EmployerService.FOOTER_TRANSLATIONS[TemplateLocale.SPANISH.toString()],
    );

    // Loads templates for each specified locale
    await templateProcessor.loadTemplates();

    const employeeDisbursements = await this.getEmployeeDisbursements(payrollID);

    const companyName = employer.name;
    const currency = payroll.debitCurrency;

    const footerDataMap = new Map<TemplateLocale, FooterData>();

    // Populate templates for each locale
    for (const [locale] of templateProcessor.locales.entries()) {
      let totalCreditAmount = 0;
      const employeeAllocations: InvoiceReceiptEmployeeDisbursement[] = employeeDisbursements.map(allocation => {
        totalCreditAmount += Utils.roundToSpecifiedDecimalNumber(allocation.creditAmount, 2);
        return {
          employeeName: allocation.employeeName,
          amount: allocation.amount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
          creditAmount: allocation.creditAmount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
        };
      });

      const templateFields: InvoiceReceiptTemplateFields = {
        companyName: companyName,
        payrollReference: payroll.referenceNumber.toString().padStart(8, "0"),
        payrollDate: dayjs(payroll.payrollDate).locale(locale.toString()).format("MMMM D, YYYY"),
        currency: currency,
        allocations: employeeAllocations,
        totalAmount: payroll.totalDebitAmount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
        totalCreditAmount: totalCreditAmount.toLocaleString(locale.toString(), { minimumFractionDigits: 2 }),
      };

      footerDataMap.set(locale, {
        left: `#${templateFields.payrollReference}`,
        center: `${templateFields.payrollDate}`,
      });

      templateProcessor.populateTemplate(locale, templateFields);
    }

    // Upload templates
    await templateProcessor.uploadPopulatedTemplates(footerDataMap);

    // Destroy template context
    await templateProcessor.destroy();
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

  async getAllPayrollsForEmployer(employerID: string): Promise<Payroll[]> {
    if (!employerID) {
      throw new ServiceException({
        message: "employerID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return this.payrollRepo.getAllPayrollsForEmployer(employerID, {});
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

    const payroll = await this.getPayrollByID(payrollID);

    if (!isStatusTransitionAllowed(payroll.status, request.status)) {
      this.logger.warn(
        `Invalid payroll status transition: ${payroll.status} -> ${request.status} for payroll ${payrollID}`,
      );
      return payroll;
    }

    const payrollUpdateRequest: PayrollUpdateRequest = {
      status: request.status,
    };

    if (request.status === PayrollStatus.COMPLETED) {
      payrollUpdateRequest.completedTimestamp = new Date();
    } else if (request.status === PayrollStatus.PREPARED) {
      const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

      const totalDebitAmountInCOP = disbursements.reduce((acc, disbursement) => acc + disbursement.allocationAmount, 0);

      const exchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD);

      const totalCreditAmountInUSD = totalDebitAmountInCOP * exchangeRateDTO.nobaRate;

      payrollUpdateRequest.totalDebitAmount = totalDebitAmountInCOP;
      payrollUpdateRequest.exchangeRate = exchangeRateDTO.nobaRate;
      payrollUpdateRequest.totalCreditAmount = totalCreditAmountInUSD;
      payrollUpdateRequest.debitCurrency = Currency.COP;
      payrollUpdateRequest.creditCurrency = Currency.USD;
    }

    const updatedPayroll = await this.payrollRepo.updatePayroll(payrollID, payrollUpdateRequest);

    return updatedPayroll;
  }

  async retryPayroll(payrollID: string) {
    if (!payrollID) {
      throw new ServiceException({
        message: "payrollID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const payroll = await this.getPayrollByID(payrollID);

    if (!payroll) {
      throw new ServiceException({
        message: `Payroll ${payrollID} not found`,
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    // Only allow payroll to be retried for certain statuses
    if (
      [PayrollStatus.CREATED, PayrollStatus.FUNDED, PayrollStatus.INVOICED, PayrollStatus.RECEIPT].includes(
        payroll.status,
      )
    ) {
      // We are expecting this scenario
      this.logger.info(`Picking up payroll ${payroll.id} from where it left off in status ${payroll.status}...`);
      // TODO: Add check to ensure workflow is not still running
      await this.workflowExecutor.executePayrollProcessingWorkflow(payroll.id, `${payroll.id}:${v4()}`);
      return payroll;
    } else {
      throw new ServiceException({
        message: `Payroll ${payroll.id} cannot be retried from status ${payroll.status}`,
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
      });
    }
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
      allocationAmount: amount,
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
      creditAmount: updateDisbursementRequest.creditAmount,
    });
  }

  async getDisbursement(disbursementID: string): Promise<PayrollDisbursement> {
    return this.payrollDisbursementRepo.getPayrollDisbursementByID(disbursementID);
  }

  async getAllDisbursementsForPayroll(payrollID: string): Promise<PayrollDisbursement[]> {
    if (!payrollID) {
      throw new ServiceException({
        message: "payrollID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    return this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);
  }

  async getAllDisbursementsForEmployee(employeeID: string): Promise<PayrollDisbursement[]> {
    if (!employeeID) {
      throw new ServiceException({
        message: "employeeID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }
    return this.payrollDisbursementRepo.getAllDisbursementsForEmployee(employeeID);
  }

  async getEmployerForTransactionID(transactionID: string): Promise<Employer> {
    // First, get the disbursement for the transaction ID
    const disbursement = await this.payrollDisbursementRepo.getPayrollDisbursementByTransactionID(transactionID);

    if (!disbursement) {
      return null;
    }

    // Then get the payroll associated with the disbursement
    const payroll = await this.payrollRepo.getPayrollByID(disbursement.payrollID);

    if (!payroll) {
      return null;
    }

    // Then get the employer associated with the payroll
    return this.employerRepo.getEmployerByID(payroll.employerID);
  }

  private async getEmployeeDisbursements(payrollID: string): Promise<EmployeeDisbursement[]> {
    const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

    const enrichedDisbursements = await Promise.all(
      disbursements.map(async disbursement => {
        const employee = await this.employeeService.getEmployeeByID(disbursement.employeeID);
        const consumer = await this.consumerService.getConsumer(employee.consumerID);
        return {
          employeeName: consumer.props.firstName + " " + consumer.props.lastName,
          amount: disbursement.allocationAmount,
          creditAmount: disbursement.creditAmount,
        };
      }),
    );

    // Sort enriched disbursements by employee name
    return enrichedDisbursements.sort((a, b) => {
      if (a.employeeName < b.employeeName) {
        return -1;
      }
      if (a.employeeName > b.employeeName) {
        return 1;
      }
      return 0;
    });
  }
}
