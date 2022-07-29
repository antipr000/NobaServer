import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
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

  constructor(private consumerService: ConsumerService) {}

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
        kycVerificationTimestamp: new Date().getTime(),
        documentVerificationStatus: this.needsDocumentVerification(consumerInformation.address.countryCode)
          ? DocumentVerificationStatus.REQUIRED
          : DocumentVerificationStatus.NOT_REQUIRED,
      },
      socialSecurityNumber: consumerInformation.nationalID ? consumerInformation.nationalID.number : undefined,
    };

    const isUS = consumerInformation.address.countryCode === "US";
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);

    if (result.status === KYCStatus.APPROVED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, result);
      if (isUS) {
        await this.emailService.sendKycApprovedUSEmail(
          updatedConsumer.props.firstName,
          updatedConsumer.props.lastName,
          updatedConsumer.props.email,
        );
      } else {
        await this.emailService.sendKycApprovedNonUSEmail(
          updatedConsumer.props.firstName,
          updatedConsumer.props.lastName,
          updatedConsumer.props.email,
        );
      }
    } else if (result.status === KYCStatus.REJECTED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, result);
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
    if (result.status === KYCStatus.APPROVED || result.status === KYCStatus.REJECTED) {
      await this.idvProvider.postConsumerFeedback(requestBody.data.case.sessionKey, result);
      const consumer = await this.consumerService.getConsumer(consumerID);
      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: result.status,
        },
      };

      await this.consumerService.updateConsumer(newConsumerData);

      if (result.status === KYCStatus.APPROVED) {
        await this.emailService.sendKycApprovedUSEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
        );
      } else if (result.status === KYCStatus.REJECTED) {
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
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.emailService.sendKycApprovedUSEmail(
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
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
      await this.emailService.sendKycApprovedUSEmail(
        updatedConsumer.props.firstName,
        updatedConsumer.props.lastName,
        updatedConsumer.props.email,
      );
    } else if (result.status === DocumentVerificationStatus.REJECTED) {
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
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
    await this.verificationDataRepo.updateVerificationData(
      VerificationData.createVerificationData({
        _id: sessionKey,
        transactionID: transactionInformation.transactionID,
      }),
    );

    return result;
  }

  async provideTransactionFeedback(
    errorCode: string,
    errorDescription: string,
    transactionID: string,
    processor: string,
  ): Promise<void> {
    const sessionKey = await this.verificationDataRepo.getSessionKeyFromFilters({ transactionID: transactionID });
    await this.idvProvider.postTransactionFeedback(sessionKey, errorCode, errorDescription, transactionID, processor);
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
