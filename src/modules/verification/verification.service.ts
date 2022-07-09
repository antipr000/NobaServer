import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
import TruliooIntegrator from "../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator";
import { ConsentDTO } from "./dto/ConsentDTO";
import { SubdivisionDTO } from "./dto/SubdivisionDTO";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { IDVProvider } from "./integrations/IDVProvider";
import { ConsumerInformation } from "./domain/ConsumerInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "./domain/VerificationResult";
import { Consumer, ConsumerProps } from "../consumer/domain/Consumer";
import { DocumentInformation } from "./domain/DocumentInformation";
import { DocumentVerificationStatus } from "../consumer/domain/VerificationStatus";
import { VerificationData } from "./domain/VerificationData";
import { Entity } from "../../core/domain/Entity";
import { IVerificationDataRepo } from "./repos/IVerificationDataRepo";
import { TransactionInformation } from "./domain/TransactionInformation";
import { isValidDateOfBirth } from "../../core/utils/DateUtils";

@Injectable()
export class VerificationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("IDVProvider")
  private readonly idvProvider: IDVProvider;

  @Inject("VerificationDataRepo")
  private readonly verificationDataRepo: IVerificationDataRepo;

  private truliooProvider: TruliooIntegrator;

  constructor(private consumerService: ConsumerService, private readonly configService: CustomConfigService) {
    this.truliooProvider = new TruliooIntegrator(configService);
  }

  async getCountryCodes(): Promise<Array<string>> {
    return await this.truliooProvider.getCountryCodes();
  }

  async getConsents(countryCode: string): Promise<Array<ConsentDTO>> {
    return await this.truliooProvider.getConsents(countryCode);
  }

  async getSubdivisions(countryCode: string): Promise<Array<SubdivisionDTO>> {
    return await this.truliooProvider.getCountrySubdivisions(countryCode);
  }

  async verifyConsumerInformation(
    consumerID: string,
    sessionKey: string,
    consumerInformation: ConsumerInformation,
  ): Promise<ConsumerVerificationResult> {
    if (consumerInformation.dateOfBirth && !isValidDateOfBirth(consumerInformation.dateOfBirth)) {
      throw new BadRequestException("dateOfBirth should be valid and of the format YYYY-MM-DD");
    }
    const result: ConsumerVerificationResult = await this.idvProvider.verifyConsumerInformation(
      sessionKey,
      consumerInformation,
    );
    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      address: consumerInformation.address,
      firstName: consumerInformation.firstName,
      lastName: consumerInformation.lastName,
      dateOfBirth: consumerInformation.dateOfBirth,
      phone: consumerInformation.phoneNumber,
      verificationData: {
        ...consumer.props.verificationData,
        kycVerificationStatus: result.status,
        idVerificationTimestamp: new Date().getTime(),
        documentVerificationStatus: this.needsDocumentVerification(consumerInformation.address.countryCode)
          ? DocumentVerificationStatus.NOT_SUBMITTED
          : DocumentVerificationStatus.NOT_REQUIRED,
      },
      socialSecurityNumber: consumerInformation.nationalID ? consumerInformation.nationalID.number : undefined,
    };
    await this.consumerService.updateConsumer(newConsumerData);
    return result;
  }

  async verifyDocument(
    consumerID: string,
    sessionKey: string,
    documentInformation: DocumentInformation,
  ): Promise<string> {
    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const id = await this.idvProvider.verifyDocument(sessionKey, documentInformation, consumer);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: DocumentVerificationStatus.PENDING,
        documentVerificationTimestamp: new Date().getTime(),
        documentVerificationTransactionID: id,
      },
    };
    await this.consumerService.updateConsumer(newConsumerData);
    return id;
  }

  async getDocumentVerificationResult(
    consumerID: string,
    sessionKey: string,
    verificationID: string,
  ): Promise<DocumentVerificationResult> {
    const result = await this.idvProvider.getDocumentVerificationResult(sessionKey, verificationID, consumerID);
    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
      },
    };
    await this.consumerService.updateConsumer(newConsumerData);
    return result;
  }

  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionInformation: TransactionInformation,
  ): Promise<ConsumerVerificationResult> {
    const result = await this.idvProvider.transactionVerification(sessionKey, consumer, transactionInformation);

    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        kycVerificationStatus: result.status,
      },
    };

    await this.consumerService.updateConsumer(newConsumerData);

    return result;
  }

  async createSession(): Promise<VerificationData> {
    const sessionKey = Entity.getNewID();
    const verificationData = VerificationData.createVerificationData({ _id: sessionKey });
    return await this.verificationDataRepo.saveVerificationData(verificationData);
  }

  private needsDocumentVerification(countryCode: string): boolean {
    return countryCode.toLocaleLowerCase() !== "us";
  }
}
