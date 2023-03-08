import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { EmployeeDisbursement, Employer, TemplateFields } from "./domain/Employer";
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
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { ConsumerService } from "../consumer/consumer.service";
import { EmployeeService } from "../employee/employee.service";
import { TemplateService } from "../common/template.service";
import "dayjs/locale/es";
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
import puppeteer, { Browser } from "puppeteer";

@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;
  private readonly ENGLISH_LOCALE = "en";
  private readonly SPANISH_LOCALE = "es";

  @Inject()
  private readonly handlebarService: TemplateService;

  @Inject()
  private readonly employeeService: EmployeeService;

  @Inject()
  private readonly exchangeRateService: ExchangeRateService;

  @Inject()
  private readonly consumerService: ConsumerService;

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

  async generatePayroll(payrollID: string): Promise<void> {
    if (!payrollID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Payroll ID is required",
      });
    }

    console.log(payrollID);

    const templatesPromise = Promise.all([
      this.handlebarService.getHandlebarLanguageTemplate(`template_${this.ENGLISH_LOCALE}.hbs`),
      this.handlebarService.getHandlebarLanguageTemplate(`template_${this.SPANISH_LOCALE}.hbs`),
    ]);

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

    console.log(employer);

    const companyName = employer.name;
    const currency = payroll.debitCurrency;
    const accountNumber = employer.payrollAccountNumber || "095000766"; // TODO: grab from config
    const [template_en, template_es] = await templatesPromise;

    const [html_en, html_es] = await Promise.all([
      this.generateTemplate({
        handlebarTemplate: template_en,
        companyName: companyName,
        payrollReference: payroll.reference,
        payrollDate: payroll.payrollDate,
        currency: currency,
        employeeDisbursements: employeeDisbursements,
        totalAmount: payroll.totalDebitAmount,
        nobaAccountNumber: accountNumber,
        locale: this.ENGLISH_LOCALE,
        region: "US",
      }),
      this.generateTemplate({
        handlebarTemplate: template_es,
        companyName: companyName,
        payrollReference: payroll.reference,
        payrollDate: payroll.payrollDate,
        currency: currency,
        employeeDisbursements: employeeDisbursements,
        totalAmount: payroll.totalDebitAmount,
        nobaAccountNumber: accountNumber,
        locale: this.SPANISH_LOCALE,
        region: "CO",
      }),
    ]);

    await Promise.all([
      this.handlebarService.pushHandlebarLanguageFile(employer.id, `inv_${payrollID}_en.html`, html_en),
      this.handlebarService.pushHandlebarLanguageFile(employer.id, `inv_${payrollID}_es.html`, html_es),
    ]);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--headless"],
      executablePath: "/usr/bin/chromium-browser",
    });

    const [pdf_en, pdf_es] = await Promise.all([
      this.generatePayrollPDF(browser, html_en, `inv_${payrollID}_en.pdf`),
      this.generatePayrollPDF(browser, html_es, `inv_${payrollID}_es.pdf`),
    ]);

    await Promise.all([
      this.handlebarService.pushHandlebarLanguageFile(employer.id, `inv_${payrollID}_en.pdf`, pdf_en),
      this.handlebarService.pushHandlebarLanguageFile(employer.id, `inv_${payrollID}_es.pdf`, pdf_es),
    ]);
    browser.close();
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
      payrollUpdateRequest.debitCurrency = Currency.COP;
      payrollUpdateRequest.creditCurrency = Currency.USD;
    }

    const updatedPayroll = await this.payrollRepo.updatePayroll(payrollID, payrollUpdateRequest);

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

  async createInvoice(payrollID: string): Promise<void> {
    this.generatePayroll(payrollID);
  }

  private async generateTemplate({
    handlebarTemplate,
    companyName,
    payrollReference,
    payrollDate,
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
      payrollReference: payrollReference,
      date: dayjs(payrollDate).locale(locale).format("MMMM D, YYYY"),
      totalAmount: totalAmount.toLocaleString(`${locale}-${region}`),
      allocations: employeeAllocations,
      nobaAccountNumber: nobaAccountNumber,
    });
  }

  private async getEmployeeDisbursements(payrollID: string): Promise<EmployeeDisbursement[]> {
    const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

    return Promise.all(
      disbursements.map(async disbursement => {
        const employee = await this.employeeService.getEmployeeByID(disbursement.employeeID);
        const consumer = await this.consumerService.getConsumer(employee.consumerID);
        return {
          employeeName: consumer.props.firstName + " " + consumer.props.lastName,
          amount: disbursement.debitAmount,
        };
      }),
    );
  }

  private async generatePayrollPDF(browserInstance: Browser, html: string, path: string): Promise<Buffer> {
    const page = await browserInstance.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(html);
    await page.evaluateHandle("document.fonts.ready");
    return page.pdf({ format: "A4", path: path });
  }
}
