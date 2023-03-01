import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { Logger } from "winston";
import { Employer } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "./repo/employer.repo.module";
import { CreateEmployerRequestDTO, UpdateEmployerRequestDTO } from "./dto/employer.service.dto";
import { readFileSync, writeFileSync } from "fs-extra";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import HandlebarsI18n from "handlebars-i18n";
import { PAYROLL_DISBURSEMENT_REPO_PROVIDER, PAYROLL_REPO_PROVIDER } from "./payroll/repo/payroll.repo.module";
import { IPayrollRepo } from "./payroll/repo/payroll.repo";
import { IPayrollDisbursementRepo } from "./payroll/repo/payroll.disbursement.repo";
@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;

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

  async generatePayroll(payrollID: string): Promise<string> {
    // lookup in payroll repo
    // get disbursements by payroll ID
    // payroll -> disbursements -> employee -> consumer
    const payroll = await this.payrollRepo.getPayrollByID(payrollID);
    const disbursements = await this.payrollDisbursementRepo.getAllDisbursementsForPayroll(payrollID);

    HandlebarsI18n.init();
    const fileContent = readFileSync(
      __dirname.split("\\dist")[0] + "\\src\\modules\\employer\\payroll\\template_en.hbs",
      "utf-8",
    );
    const template = Handlebars.compile(fileContent);
    const dateMonthYear = dayjs().format("MMMM YYYY");
    const currency = "COP";
    const allocations = [
      {
        employee: "Camilo Moreno",
        amount: "200.000",
      },
      {
        employee: "German Ramirez",
        amount: "500.000",
      },
      {
        employee: "Jhon Pedroza",
        amount: "100.000",
      },
    ];

    const accountInformation = [
      {
        key: "Número de cuenta",
        value: "095000766",
      },
      {
        key: "NIT",
        value: "9016746554",
      },
      {
        key: "A nombre de",
        value: "NOBA COLOMBIA SAS",
      },
      {
        key: "Tipo de cuenta",
        value: "Ahorros",
      },
      {
        key: "Banco",
        value: "Banco Cooperativo Coopcentral",
      },
    ];
    const result = template({
      companyName: "Mono",
      currency: currency,
      dateMonthYear: dateMonthYear,
      totalAmount: "2.700.000",
      allocations: allocations,
      accountInformation: accountInformation,
    });
    writeFileSync(__dirname.split("\\dist")[0] + "\\src\\modules\\employer\\payroll\\payroll.html", result);
    console.log(result);
    return "fake-link";
  }
}
