import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IWithdrawalDetailsRepo } from "./withdrawal.details.repo";
import {
  WithdrawalDetails,
  InputWithdrawalDetails,
  validateSavedWithdrawalDetails,
  convertToDomainWithdrawalDetails,
  validateInputWithdrawalDetails,
} from "../domain/WithdrawalDetails";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { KmsService } from "../../../modules/common/kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class SQLWithdrawalDetailsRepo implements IWithdrawalDetailsRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly alertService: AlertService;

  @Inject()
  private readonly kmsService: KmsService;

  async getWithdrawalDetailsByTransactionID(transactionID: string): Promise<WithdrawalDetails> {
    try {
      const returnedWithdrawalDetails = await this.prismaService.withdrawalDetails.findUnique({
        where: { transactionID },
      });
      const withdrawalDetails = convertToDomainWithdrawalDetails(returnedWithdrawalDetails);
      if (!withdrawalDetails) {
        return null;
      }

      validateSavedWithdrawalDetails(withdrawalDetails);
      return withdrawalDetails;
    } catch (e) {
      return null;
    }
  }

  async addWithdrawalDetails(withdrawalDetails: InputWithdrawalDetails): Promise<WithdrawalDetails> {
    validateInputWithdrawalDetails(withdrawalDetails);
    try {
      withdrawalDetails.accountNumber = await this.kmsService.encryptString(
        withdrawalDetails.accountNumber,
        KmsKeyType.SSN,
      );
      const returnedWithdrawalDetails = await this.prismaService.withdrawalDetails.create({
        data: {
          bankCode: withdrawalDetails.bankCode,
          accountNumber: withdrawalDetails.accountNumber,
          accountType: withdrawalDetails.accountType,
          documentNumber: withdrawalDetails.documentNumber,
          documentType: withdrawalDetails.documentType,
          transaction: {
            connect: {
              id: withdrawalDetails.transactionID,
            },
          },
        },
      });

      const savedWithdrawalDetails = convertToDomainWithdrawalDetails(returnedWithdrawalDetails);
      validateSavedWithdrawalDetails(savedWithdrawalDetails);
      return savedWithdrawalDetails;
    } catch (e) {
      this.alertService.raiseError(`Failed to save withdrawal details: ${JSON.stringify(e)}}`);
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Failed to save withdrawal details",
      });
    }
  }
}
