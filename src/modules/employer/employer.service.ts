import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { Logger } from "winston";
import { Employer } from "./domain/Employer";
import { IEmployerRepo } from "./repo/employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "./repo/employer.repo.module";

@Injectable()
export class EmployerService {
  constructor(
    @Inject(EMPLOYER_REPO_PROVIDER) private readonly employerRepo: IEmployerRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEmployer(name: string, logoURI: string, referralID: string, bubbleID: string): Promise<Employer> {
    return this.employerRepo.createEmployer({
      name: name,
      logoURI: logoURI,
      referralID: referralID,
      bubbleID: bubbleID,
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
