import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";
import { IVerificationDataRepo } from "./verificationdata.repo";
import { PrismaService } from "../../../infraproviders/PrismaService";

@Injectable()
export class SQLVerificationDataRepo implements IVerificationDataRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  async saveVerificationData(verificationData: VerificationData): Promise<VerificationData> {
    try {
      const verificationDataProps = await this.prismaService.verification.create({
        data: {
          id: verificationData.props.id,
          consumerID: verificationData.props.consumerID,
        },
      });
      return VerificationData.createVerificationData(verificationDataProps);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getVerificationData(id: string): Promise<VerificationData> {
    try {
      const verificationDataProps = await this.prismaService.verification.findUnique({ where: { id: id } });
      return VerificationData.createVerificationData(verificationDataProps);
    } catch (e) {
      throw new NotFoundException();
    }
  }

  async updateVerificationData(verificationData: VerificationData): Promise<VerificationData> {
    try {
      const result = await this.prismaService.verification.update({
        where: { id: verificationData.props.id },
        data: {
          consumerID: verificationData.props.consumerID,
        },
      });

      return VerificationData.createVerificationData(result);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getSessionKeyFromFilters(filters: Partial<VerificationDataProps>): Promise<string> {
    if (!filters.consumerID) throw new BadRequestException("No filters provided");

    try {
      const verificationDataProps = await this.prismaService.verification.findFirstOrThrow({
        where: {
          ...(filters.consumerID && { consumerID: filters.consumerID }),
        },
      });
      return verificationDataProps.id;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
