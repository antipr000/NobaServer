import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { EmployeeDisbursement, Employer, TemplateFields } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "./repo/employer.repo.module";
import { CreateEmployerRequestDTO, UpdateEmployerRequestDTO } from "./dto/employer.service.dto";
import { writeFileSync } from "fs-extra";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { PAYROLL_DISBURSEMENT_REPO_PROVIDER, PAYROLL_REPO_PROVIDER } from "./repo/payroll.repo.module";
import { IPayrollDisbursementRepo } from "./repo/payroll.disbursement.repo";
import { ConsumerService } from "../consumer/consumer.service";
import { EmployeeService } from "../employee/employee.service";
import { HandlebarService } from "../common/handlebar.service";
import "dayjs/locale/es";
import { IPayrollRepo } from "./repo/payroll.repo";

@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;
  private readonly ENGLISH_LOCALE = "en";
  private readonly SPANISH_LOCALE = "es";

  @Inject()
  private readonly handlebarService: HandlebarService;

  @Inject()
  private readonly employeeService: EmployeeService;

  // @Inject()
  // private readonly consumerService: ConsumerService;

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

  async generatePayroll(payrollID: string): Promise<void> {
    if (!payrollID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll ID is required",
      });
    }

    const templatesPromise = this.handlebarService.getHandlebarLanguageTemplates();

    let [employeeDisbursements, payroll] = await Promise.all([
      this.getEmployeeDisbursements(payrollID),
      this.payrollRepo.getPayrollByID(payrollID),
    ]);
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

    const companyName = employer.name;
    const currency = payroll.debitCurrency;
    employeeDisbursements = [
      {
        employeeName: "Juan Perez",
        amount: 200000,
      },
      {
        employeeName: "Maria Rodriguez",
        amount: 500000,
      },
      {
        employeeName: "Carlos Sanchez",
        amount: 100000,
      },
      {
        employeeName: "Jorge Lopez",
        amount: 100000,
      },
      {
        employeeName: "Andres Garcia",
        amount: 600000,
      },
      {
        employeeName: "Jose Hernandez",
        amount: 200000,
      },
      {
        employeeName: "Maria Ramirez",
        amount: 1000000,
      },
    ];
    const nobaAccountNumber = "095000766";
    const templates = await templatesPromise;

    const [html_en, html_es] = await Promise.all([
      this.generateTemplate({
        handlebarTemplate: templates[this.ENGLISH_LOCALE],
        companyName: companyName,
        currency: currency,
        employeeDisbursements: employeeDisbursements,
        totalAmount: payroll.totalDebitAmount,
        nobaAccountNumber: nobaAccountNumber,
        locale: this.ENGLISH_LOCALE,
        region: "US",
      }),
      this.generateTemplate({
        handlebarTemplate: templates[this.SPANISH_LOCALE],
        companyName: companyName,
        currency: currency,
        employeeDisbursements: employeeDisbursements,
        totalAmount: payroll.totalDebitAmount,
        nobaAccountNumber: nobaAccountNumber,
        locale: this.SPANISH_LOCALE,
        region: "CO",
      }),
    ]);

    await Promise.all([
      this.handlebarService.pushHandlebarLanguageHTML(employer.id, `inv_${payrollID}_en.html`, html_en),
      this.handlebarService.pushHandlebarLanguageHTML(employer.id, `inv_${payrollID}_es.html`, html_es),
    ]);
  }

  private async generateTemplate({
    handlebarTemplate,
    companyName,
    nobaAccountNumber,
    currency,
    employeeDisbursements,
    totalAmount,
    locale,
    region,
  }: TemplateFields): Promise<string> {
    const template = Handlebars.compile(handlebarTemplate);

    const employeeAllocations = employeeDisbursements.map(allocation => ({
      employeeName: allocation.employeeName,
      amount: allocation.amount.toLocaleString(`${locale}-${region}`),
    }));
    return template({
      companyName: companyName,
      currency: currency,
      dateMonthYear: dayjs().locale(locale).format("MMMM YYYY"),
      totalAmount: totalAmount.toLocaleString(`${locale}-${region}`),
      allocations: employeeAllocations,
      nobaAccountNumber: nobaAccountNumber,
    });
  }

  private async getEmployeeDisbursements(payrollID: string): Promise<EmployeeDisbursement[]> {
    const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

    return Promise.all(
      disbursements.map(async disbursement => {
        // need to resolve circular dependency first
        const employee = await this.employeeService.getEmployeeByID(disbursement.employeeID);
        // const consumer = await this.consumerService.getConsumer(employee.consumerID);
        return {
          employeeName: "TestFirst" + " " + "TestLast",
          amount: disbursement.debitAmount,
        };
      }),
    );
  }
}
