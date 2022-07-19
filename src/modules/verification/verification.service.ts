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
import { KYCStatus, DocumentVerificationStatus } from "../consumer/domain/VerificationStatus";
import { VerificationData } from "./domain/VerificationData";
import { Entity } from "../../core/domain/Entity";
import { IVerificationDataRepo } from "./repos/IVerificationDataRepo";
import { TransactionInformation } from "./domain/TransactionInformation";
import { isValidDateOfBirth } from "../../core/utils/DateUtils";
import { EmailService } from "../common/email.service";
import {
  CaseNotificationWebhookRequest,
  DocumentVerificationWebhookRequest,
  SardineDeviceInformationResponse,
} from "./integrations/SardineTypeDefinitions";

@Injectable()
export class VerificationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("IDVProvider")
  private readonly idvProvider: IDVProvider;

  @Inject("VerificationDataRepo")
  private readonly verificationDataRepo: IVerificationDataRepo;

  @Inject()
  private readonly emailService: EmailService;

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
          ? DocumentVerificationStatus.REQUIRED
          : DocumentVerificationStatus.NOT_REQUIRED,
      },
      socialSecurityNumber: consumerInformation.nationalID ? consumerInformation.nationalID.number : undefined,
    };
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);

    if (result.status === KYCStatus.APPROVED) {
      await this.emailService.sendKycApprovedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    } else if (result.status === KYCStatus.REJECTED) {
      await this.emailService.sendKycDeniedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    } else {
      await this.emailService.sendKycPendingOrFlaggedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    }
    return result;
  }

  async processKycVerificationWebhookRequest(requestBody: CaseNotificationWebhookRequest) {
    const consumerID = requestBody.data.case.customerID;
    const result: ConsumerVerificationResult = this.idvProvider.processKycVerificationWebhookResult(requestBody);
    if (
      result.status === ConsumerVerificationStatus.PENDING_KYC_APPROVED ||
      result.status === ConsumerVerificationStatus.NOT_APPROVED_REJECTED_KYC
    ) {
      const consumer = await this.consumerService.getConsumer(consumerID);
      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: result.status,
        },
      };

      await this.consumerService.updateConsumer(newConsumerData);

      if (result.status === ConsumerVerificationStatus.PENDING_KYC_APPROVED) {
        await this.emailService.sendKycApprovedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
        );
      } else if (result.status === ConsumerVerificationStatus.NOT_APPROVED_REJECTED_KYC) {
        await this.emailService.sendKycDeniedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
        );
      }
    }
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
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);
    await this.emailService.sendKycPendingOrFlaggedEmail(
      updatedConsumer.props.firstName,
      updatedConsumer.props.lastName,
      updatedConsumer.props.email,
    );
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
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);

    if (
      result.status === DocumentVerificationStatus.VERIFIED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.emailService.sendKycApprovedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    } else if (result.status === DocumentVerificationStatus.REJECTED) {
      await this.emailService.sendKycDeniedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    }

    return result;
  }

  async processDocumentVerificationWebhookResult(
    documentVerificationResult: DocumentVerificationWebhookRequest,
  ): Promise<DocumentVerificationResult> {
    const consumerID = documentVerificationResult.data.case.customerID;
    const result: DocumentVerificationResult =
      this.idvProvider.processDocumentVerificationWebhookResult(documentVerificationResult);

    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      riskRating: result.riskRating,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
      },
    };
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);

    if (
      result.status === DocumentVerificationStatus.VERIFIED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.emailService.sendKycApprovedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    } else if (result.status === DocumentVerificationStatus.REJECTED) {
      await this.emailService.sendKycDeniedEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    }
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

  async getDeviceVerificationResult(sessionKey: string): Promise<SardineDeviceInformationResponse> {
    return await this.idvProvider.getDeviceVerificationResult(sessionKey);
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
