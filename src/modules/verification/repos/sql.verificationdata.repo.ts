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
          userID: verificationData.props.userID,
          transactionID: verificationData.props.transactionRef,
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
          userID: verificationData.props.userID,
          transactionID: verificationData.props.transactionRef,
        },
      });

      return VerificationData.createVerificationData(result);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  async getSessionKeyFromFilters(filters: Partial<VerificationDataProps>): Promise<string> {
    try {
      const verificationDataProps = await this.prismaService.verification.findFirstOrThrow({
        where: {
          transactionID: filters.transactionRef,
        },
      });
      return verificationDataProps.id;
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
