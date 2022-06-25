import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import IDVIntegrator from "../../externalclients/idvproviders/IDVIntegrator";
import { Logger } from "winston";
import { UserService } from "../user/user.service";
import TruliooIntegrator from "../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator";
import { ConfigService } from "@nestjs/config";
import { ConsentDTO } from "./dto/ConsentDTO";
import { SubdivisionDTO } from "./dto/SubdivisionDTO";
import { UserProps } from "../user/domain/User";
import { IDVerificationRequestDTO } from "./dto/IDVerificationRequestDTO";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";
import { DocumentTypes, Status } from "../../externalclients/idvproviders/definitions";
import { VerificationStatusDTO } from "./dto/VerificationStatusDTO";
import { VerificationStatusType } from "../user/domain/Types";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
@Injectable()
export class VerificationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly idvProvider: IDVIntegrator;

  constructor(private userService: UserService, private readonly configService: CustomConfigService) {
    this.idvProvider = new TruliooIntegrator(configService);
  }

  async getCountryCodes(): Promise<Array<string>> {
    return await this.idvProvider.getCountryCodes();
  }

  async getConsents(countryCode: string): Promise<Array<ConsentDTO>> {
    return await this.idvProvider.getConsents(countryCode);
  }

  async getSubdivisions(countryCode: string): Promise<Array<SubdivisionDTO>> {
    return await this.idvProvider.getCountrySubdivisions(countryCode);
  }

  async performIdentityVerification(
    user: UserProps,
    requestBody: IDVerificationRequestDTO,
  ): Promise<VerificationResultDTO> {
    const result: VerificationResultDTO = await this.idvProvider.verify(user._id, requestBody);
    if (result.status === Status.OK) {
      await this.userService.updateUser({
        ...user,
        verificationStatus: VerificationStatusType.VERIFIED,
        idVerificationTimestamp: new Date().getTime(),
        dateOfBirth: requestBody.dateOfBirth,
        address: {
          streetName: requestBody.streetName,
          city: requestBody.city,
          state: requestBody.state,
          countryCode: requestBody.countryCode,
          postalCode: requestBody.postalCode,
        },
      });
    } else {
      await this.userService.updateUser({
        ...user,
        dateOfBirth: requestBody.dateOfBirth,
        address: {
          streetName: requestBody.streetName,
          city: requestBody.city,
          state: requestBody.state,
          countryCode: requestBody.countryCode,
          postalCode: requestBody.postalCode,
        },
      });
    }
    return result;
  }

  async performDocumentVerification(
    documentFrontImageb64: string,
    documentBackImageb64: string,
    user: UserProps,
    countryCode: string,
    documentType: DocumentTypes,
  ) {
    const transactionId = await this.idvProvider.verifyDocument(user._id, {
      documentFrontImage: documentFrontImageb64,
      documentBackImage: documentBackImageb64,
      countryCode: countryCode,
      documentType: documentType,
    });
    await this.userService.updateUser({
      ...user,
      documentVerificationTransactionId: transactionId,
      documentVerificationTimestamp: new Date().getTime(),
    });
  }

  async getDocumentVerificationStatus(user: UserProps): Promise<VerificationStatusDTO> {
    const transactionID = user.documentVerificationTransactionId;
    return await this.idvProvider.getTransactionStatus(transactionID);
  }

  async getDocumentVerificationResult(user: UserProps): Promise<VerificationResultDTO> {
    const transactionID = user.documentVerificationTransactionId;
    const transactionStatus = await this.idvProvider.getTransactionStatus(transactionID);
    const transactionRecordId = transactionStatus.TransactionRecordId;
    const isMatch: boolean = await this.idvProvider.getTransactionResult(transactionRecordId);
    await this.userService.updateUser({
      ...user,
      documentVerified: isMatch,
    });
    if (isMatch) {
      return {
        status: Status.OK,
      };
    } else {
      return {
        status: Status.FAILED,
      };
    }
  }
}
