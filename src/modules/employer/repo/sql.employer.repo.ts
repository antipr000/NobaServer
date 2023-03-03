import { Inject, Injectable } from "@nestjs/common";
import {
  convertToDomainEmployer,
  Employer,
  EmployerCreateRequest,
  EmployerUpdateRequest,
  validateCreateEmployerRequest,
  validateEmployer,
  validateUpdateEmployerRequest,
} from "../domain/Employer";
import { IEmployerRepo } from "./employer.repo";
import { Employer as EmployerPrismaModel, Prisma } from "@prisma/client";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../core/exception/CommonAppException";
import { KmsService } from "../../../modules/common/kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";

@Injectable()
export class SqlEmployerRepo implements IEmployerRepo {
  @Inject()
  private readonly kmsService: KmsService;

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEmployer(request: EmployerCreateRequest): Promise<Employer> {
    validateCreateEmployerRequest(request);

    if (request.payrollAccountNumber) {
      request.payrollAccountNumber = await this.kmsService.encryptString(request.payrollAccountNumber, KmsKeyType.SSN);
    }

    let savedEmployer: Employer = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const employerInput: Prisma.EmployerCreateInput = {
        name: request.name,
        referralID: request.referralID,
        bubbleID: request.bubbleID,
        logoURI: request.logoURI,
        leadDays: request.leadDays,
        payrollAccountNumber: request.payrollAccountNumber,
        payrollDates: request.payrollDates,
        ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
      };

      const returnedEmployer: EmployerPrismaModel = await this.prismaService.employer.create({
        data: employerInput,
      });
      savedEmployer = convertToDomainEmployer(returnedEmployer);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: "Error saving Employer in database",
      });
    }

    try {
      validateEmployer(savedEmployer);
      return savedEmployer;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Error saving Employer in database",
      });
    }
  }

  async updateEmployer(id: string, request: EmployerUpdateRequest): Promise<Employer> {
    validateUpdateEmployerRequest(request);

    if (request.payrollAccountNumber) {
      request.payrollAccountNumber = await this.kmsService.encryptString(request.payrollAccountNumber, KmsKeyType.SSN);
    }

    try {
      const employerInput: Prisma.EmployerUpdateInput = {
        ...(request.logoURI && { logoURI: request.logoURI }),
        ...(request.referralID && { referralID: request.referralID }),
        ...(request.leadDays && { leadDays: request.leadDays }),
        ...(request.payrollAccountNumber && { payrollAccountNumber: request.payrollAccountNumber }),
        ...(request.payrollDates && { payrollDates: request.payrollDates }),
        ...(request.maxAllocationPercent && { maxAllocationPercent: request.maxAllocationPercent }),
      };

      const returnedEmployer: EmployerPrismaModel = await this.prismaService.employer.update({
        where: {
          id: id,
        },
        data: employerInput,
      });
      return convertToDomainEmployer(returnedEmployer);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new NotFoundError({});
      }

      throw new DatabaseInternalErrorException({
        message: "Error saving Employer in database",
      });
    }
  }

  async getEmployerByID(id: string): Promise<Employer> {
    try {
      const employer: EmployerPrismaModel = await this.prismaService.employer.findUnique({
        where: {
          id: id,
        },
      });

      if (!employer) {
        return null;
      }

      return convertToDomainEmployer(employer);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employer with ID: '${id}'`,
      });
    }
  }

  async getEmployerByReferralID(referralID: string): Promise<Employer> {
    try {
      const employer: EmployerPrismaModel = await this.prismaService.employer.findUnique({
        where: {
          referralID: referralID,
        },
      });

      if (!employer) {
        return null;
      }

      return convertToDomainEmployer(employer);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employer with referralID: '${referralID}'`,
      });
    }
  }

  async getEmployerByBubbleID(bubbleID: string): Promise<Employer> {
    try {
      const employer: EmployerPrismaModel = await this.prismaService.employer.findUnique({
        where: {
          bubbleID: bubbleID,
        },
      });

      if (!employer) {
        return null;
      }

      return convertToDomainEmployer(employer);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the Employer with bubbleID: '${bubbleID}'`,
      });
    }
  }
}
