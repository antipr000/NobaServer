import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PayrollDisbursementCreateRequest,
  PayrollDisbursement,
  PayrollDisbursementUpdateRequest,
  validateCreatePayrollDisbursementRequest,
  convertToDomainPayrollDisbursement,
  validatePayrollDisbursement,
  validateUpdatePayrollDisbursementRequest,
  EnrichedDisbursement,
  convertToDomainEnrichedDisbursements,
} from "../domain/PayrollDisbursement";
import { IPayrollDisbursementRepo } from "./payroll.disbursement.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Prisma, PayrollDisbursement as PrismaPayrollDisbursementModel } from "@prisma/client";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
} from "../../../core/exception/CommonAppException";
import {
  EnrichedDisbursementFilterOptionsDTO,
  EnrichedDisbursementSortOptions,
} from "../dto/enriched.disbursement.filter.options.dto";
import { PaginatedResult, SortOrder } from "../../../core/infra/PaginationTypes";
import { createPaginator } from "../../../infra/sql/paginate/PaginationPipeline";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";

@Injectable()
export class SqlPayrollDisbursementRepo implements IPayrollDisbursementRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createPayrollDisbursement(payrollDisbursement: PayrollDisbursementCreateRequest): Promise<PayrollDisbursement> {
    validateCreatePayrollDisbursementRequest(payrollDisbursement);
    let savedPayrollDisbursement: PayrollDisbursement = null;

    try {
      const payrollDisbursementInput: Prisma.PayrollDisbursementCreateInput = {
        payroll: {
          connect: {
            id: payrollDisbursement.payrollID,
          },
        },
        employee: {
          connect: {
            id: payrollDisbursement.employeeID,
          },
        },
        allocationAmount: payrollDisbursement.allocationAmount,
      };

      const returnedPayrollDisbursement: PrismaPayrollDisbursementModel =
        await this.prismaService.payrollDisbursement.create({ data: payrollDisbursementInput });
      savedPayrollDisbursement = convertToDomainPayrollDisbursement(returnedPayrollDisbursement);
    } catch (err) {
      this.logger.error(JSON.stringify(err));

      throw new DatabaseInternalErrorException({
        message: "Error saving Payroll disbursement in database",
      });
    }

    try {
      validatePayrollDisbursement(savedPayrollDisbursement);
      return savedPayrollDisbursement;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Error saving Payroll disbursement in database",
      });
    }
  }

  async updatePayrollDisbursement(
    id: string,
    payrollDisbursement: PayrollDisbursementUpdateRequest,
  ): Promise<PayrollDisbursement> {
    validateUpdatePayrollDisbursementRequest(payrollDisbursement);

    try {
      const payrollDisbursementUpdateInput: Prisma.PayrollDisbursementUpdateInput = {
        ...(payrollDisbursement.transactionID && {
          transaction: {
            connect: {
              id: payrollDisbursement.transactionID,
            },
          },
        }),
        ...(payrollDisbursement.creditAmount && { creditAmount: payrollDisbursement.creditAmount }),
      };

      const returnedPayrollDisbursement: PrismaPayrollDisbursementModel =
        await this.prismaService.payrollDisbursement.update({
          where: {
            id: id,
          },
          data: payrollDisbursementUpdateInput,
        });
      return convertToDomainPayrollDisbursement(returnedPayrollDisbursement);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error updating the Payroll disbursement with ID: '${id}'`,
      });
    }
  }

  async getPayrollDisbursementByID(id: string): Promise<PayrollDisbursement> {
    try {
      const returnedPayrollDisbursement: PrismaPayrollDisbursementModel =
        await this.prismaService.payrollDisbursement.findUnique({
          where: {
            id: id,
          },
        });
      return convertToDomainPayrollDisbursement(returnedPayrollDisbursement);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }

  async getPayrollDisbursementByTransactionID(transactionID: string): Promise<PayrollDisbursement> {
    try {
      const returnedPayrollDisbursement: PrismaPayrollDisbursementModel =
        await this.prismaService.payrollDisbursement.findUnique({
          where: {
            transactionID: transactionID,
          },
        });
      return convertToDomainPayrollDisbursement(returnedPayrollDisbursement);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }

  async getAllDisbursementsForEmployee(employeeID: string): Promise<PayrollDisbursement[]> {
    try {
      const allDisbursementsForEmployee = await this.prismaService.payrollDisbursement.findMany({
        where: { employeeID },
      });
      return allDisbursementsForEmployee.map(disbursement => convertToDomainPayrollDisbursement(disbursement));
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return [];
    }
  }

  async getAllDisbursementsForPayroll(payrollID: string): Promise<PayrollDisbursement[]> {
    try {
      const allDisbursementsForEmployee = await this.prismaService.payrollDisbursement.findMany({
        where: { payrollID },
      });
      return allDisbursementsForEmployee.map(disbursement => convertToDomainPayrollDisbursement(disbursement));
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return [];
    }
  }

  async getFilteredEnrichedDisbursementsForPayroll(
    payrollID: string,
    filterOptions: EnrichedDisbursementFilterOptionsDTO,
  ): Promise<PaginatedResult<EnrichedDisbursement>> {
    const paginator = createPaginator<EnrichedDisbursement>(
      filterOptions.pageOffset,
      filterOptions.pageLimit,
      convertToDomainEnrichedDisbursements,
    );

    const sortOption = this.convertToSortOption(filterOptions.sortBy, filterOptions.sortDirection);

    try {
      const filterQuery: Prisma.PayrollDisbursementFindManyArgs = {
        where: {
          payrollID,
          ...(filterOptions.status && {
            transaction: {
              status: {
                in: filterOptions.status,
              },
            },
          }),
        },
        ...(sortOption && { orderBy: sortOption }),
        include: {
          employee: {
            include: {
              consumer: true,
            },
          },
          transaction: true,
        },
      };
      return await paginator(this.prismaService.payrollDisbursement, filterQuery);
    } catch (err) {
      console.log(err);
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error retrieving payroll disbursements with given filters",
      });
    }
  }

  private convertToSortOption(
    sortBy: EnrichedDisbursementSortOptions,
    sortDirection: SortOrder,
  ): Prisma.Enumerable<Prisma.PayrollDisbursementOrderByWithRelationInput> {
    if (sortBy === "lastName") {
      return {
        employee: {
          consumer: {
            lastName: sortDirection,
          },
        },
      };
    } else if (sortBy === "allocationAmount") {
      return {
        allocationAmount: sortDirection,
      };
    } else if (sortBy === "creditAmount") {
      return {
        creditAmount: sortDirection,
      };
    } else if (sortBy === "status") {
      return {
        transaction: {
          status: sortDirection,
        },
      };
    }

    return undefined;
  }
}
