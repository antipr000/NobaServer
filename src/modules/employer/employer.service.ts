import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { Logger } from "winston";
import { Employer } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "./repo/employer.repo.module";
import { CreateEmployerRequestDTO } from "./dto/employer.service.dto";

@Injectable()
export class EmployerService {
  private readonly MAX_LEAD_DAYS = 5;

  constructor(
    @Inject(EMPLOYER_REPO_PROVIDER) private readonly employerRepo: IEmployerRepo,
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

  private validatepayrollDays(payrollDays: number[]): void {
    const badSchedules = payrollDays.filter(schedule => schedule < 1 || schedule > 31);
    const duplicateSchedules = payrollDays.filter((schedule, index) => payrollDays.indexOf(schedule) !== index);

    if (badSchedules.length > 0) {
      throw new ServiceException({
        message: `Invalid payment schedules: ${badSchedules}`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (duplicateSchedules.length > 0) {
      throw new ServiceException({
        message: `Duplicate payment schedules: ${duplicateSchedules}`,
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

    if (!request.payrollDays || request.payrollDays.length === 0) {
      request.payrollDays = [31];
    }
    this.validatepayrollDays(request.payrollDays);

    return this.employerRepo.createEmployer({
      name: request.name,
      logoURI: request.logoURI,
      referralID: request.referralID,
      bubbleID: request.bubbleID,
      leadDays: request.leadDays,
      payrollDays: request.payrollDays,
    });
  }

  async updateEmployer(id: string, logoURI: string, referralID: string): Promise<Employer> {
    if (!id) {
      throw new ServiceException({
        message: "ID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    if (!logoURI && !referralID) {
      throw new ServiceException({
        message: "logoURI or referralID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employerRepo.updateEmployer(id, {
      ...(logoURI && { logoURI: logoURI }),
      ...(referralID && { referralID: referralID }),
    });
  }

  async getEmployerByID(id: string): Promise<Employer> {
    if (!id) {
      throw new ServiceException({
        message: "ID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employerRepo.getEmployerByID(id);
  }

  async getEmployerByReferralID(referralID: string): Promise<Employer> {
    if (!referralID) {
      throw new ServiceException({
        message: "referralID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employerRepo.getEmployerByReferralID(referralID);
  }

  async getEmployerByBubbleID(bubbleID: string): Promise<Employer> {
    if (!bubbleID) {
      throw new ServiceException({
        message: "bubbleID is required",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }

    return this.employerRepo.getEmployerByBubbleID(bubbleID);
  }
}
