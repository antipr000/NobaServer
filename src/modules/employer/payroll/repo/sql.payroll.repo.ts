import { Inject, Injectable } from "@nestjs/common";
import {
  PayrollCreateRequest,
  Payroll,
  PayrollFilter,
  validateCreatePayrollRequest,
  convertToDomainPayroll,
  validatePayroll,
  PayrollUpdateRequest,
  validateUpdatePayrollRequest,
} from "../domain/Payroll";
import { IPayrollRepo } from "./payroll.repo";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Prisma, Payroll as PrismaPayrollModel } from "@prisma/client";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../../core/exception/CommonAppException";

@Injectable()
export class SqlPayrollRepo implements IPayrollRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async addPayroll(payroll: PayrollCreateRequest): Promise<Payroll> {
    validateCreatePayrollRequest(payroll);
    let savedPayroll: Payroll = null;

    try {
      const payrollInput: Prisma.PayrollCreateInput = {
        employer: {
          connect: {
            id: payroll.employerID,
          },
        },
        reference: payroll.reference,
        payrollDate: payroll.payrollDate,
        totalDebitAmount: payroll.totalDebitAmount,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
      };

      const returnedPayroll: PrismaPayrollModel = await this.prismaService.payroll.create({ data: payrollInput });
      savedPayroll = convertToDomainPayroll(returnedPayroll);
    } catch (err) {
      this.logger.error(JSON.stringify(err));

      throw new DatabaseInternalErrorException({
        message: "Error saving Payroll in database",
      });
    }

    try {
      validatePayroll(savedPayroll);
      return savedPayroll;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Error saving Payroll in database",
      });
    }
  }

  async updatePayroll(id: string, payroll: PayrollUpdateRequest): Promise<Payroll> {
    validateUpdatePayrollRequest(payroll);

    try {
      const payrollUpdateInput: Prisma.PayrollUpdateInput = {
        ...(payroll.completedTimestamp && { completedTimestamp: payroll.completedTimestamp }),
        ...(payroll.exchangeRate && { exchangeRate: payroll.exchangeRate }),
        ...(payroll.totalCreditAmount && { totalCreditAmount: payroll.totalCreditAmount }),
        ...(payroll.status && { status: payroll.status }),
      };

      const returnedPayroll: PrismaPayrollModel = await this.prismaService.payroll.update({
        data: payrollUpdateInput,
        where: {
          id: id,
        },
      });

      return convertToDomainPayroll(returnedPayroll);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new NotFoundError({});
      }
      throw new DatabaseInternalErrorException({
        message: `Error updating the Payroll with ID: '${id}'`,
      });
    }
  }

  async getPayrollByID(id: string): Promise<Payroll> {
    try {
      const returnedPayroll: PrismaPayrollModel = await this.prismaService.payroll.findUnique({ where: { id: id } });
      return convertToDomainPayroll(returnedPayroll);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }

  async getAllPayrollsForEmployer(employerID: string, filters: PayrollFilter): Promise<Payroll[]> {
    try {
      const payrollFilter: Prisma.PayrollWhereInput = {
        employerID: employerID,
        ...(filters.status && { status: filters.status }),
      };

      const returnedPayrolls: PrismaPayrollModel[] = await this.prismaService.payroll.findMany({
        where: payrollFilter,
      });

      return returnedPayrolls.map(payroll => convertToDomainPayroll(payroll));
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return [];
    }
  }
}
