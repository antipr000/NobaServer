import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
import { IDVProvider } from "./integrations/IDVProvider";
import { ConsumerInformation } from "./domain/ConsumerInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "./domain/VerificationResult";
import { Consumer, ConsumerProps } from "../consumer/domain/Consumer";
import { DocumentInformation } from "./domain/DocumentInformation";
import { KYCStatus, DocumentVerificationStatus } from "@prisma/client";
import { VerificationData } from "./domain/VerificationData";
import { Entity } from "../../core/domain/Entity";
import { IVerificationDataRepo } from "./repos/verificationdata.repo";
import {
  CaseNotificationWebhookRequest,
  DocumentVerificationWebhookRequest,
  SardineDeviceInformationResponse,
} from "./integrations/SardineTypeDefinitions";
import { NotificationService } from "../notifications/notification.service";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { IDVerificationURLRequestLocale } from "./dto/IDVerificationRequestURLDTO";
import { isValidDateOfBirth } from "../../core/utils/DateUtils";
import { TransactionVerification } from "./domain/TransactionVerification";

@Injectable()
export class VerificationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("IDVProvider")
  private readonly idvProvider: IDVProvider;

  @Inject("VerificationDataRepo")
  private readonly verificationDataRepo: IVerificationDataRepo;

  @Inject()
  private readonly notificationService: NotificationService;

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
        kycCheckStatus: result.status,
        kycVerificationTimestamp: new Date(),
        riskRating: result.idvProviderRiskLevel,
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
        await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
          firstName: updatedConsumer.props.firstName,
          lastName: updatedConsumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: updatedConsumer.props.displayEmail,
        });
      } else {
        await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT, {
          firstName: updatedConsumer.props.firstName,
          lastName: updatedConsumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: updatedConsumer.props.displayEmail,
        });
      }
    } else if (result.status === KYCStatus.REJECTED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, result);
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_DENIED_EVENT, {
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: updatedConsumer.props.displayEmail,
      });
    } else {
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT, {
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: updatedConsumer.props.displayEmail,
      });
    }
    return result;
  }

  async processKycVerificationWebhookRequest(requestBody: CaseNotificationWebhookRequest) {
    const consumerID = requestBody.data.case.customerID;
    const result: ConsumerVerificationResult = this.idvProvider.processKycVerificationWebhookResult(requestBody);
    if (result.status === KYCStatus.APPROVED || result.status === KYCStatus.REJECTED) {
      const consumer = await this.consumerService.getConsumer(consumerID);
      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: result.status,
          kycVerificationTimestamp: new Date(),
        },
      };

      await this.consumerService.updateConsumer(newConsumerData);

      await this.idvProvider.postConsumerFeedback(requestBody.data.case.sessionKey, result);

      if (result.status === KYCStatus.APPROVED) {
        if (consumer.props.address.countryCode.toLocaleLowerCase() === "us") {
          await this.notificationService.sendNotification(
            NotificationEventType.SEND_KYC_APPROVED_US_EVENT,

            {
              firstName: consumer.props.firstName,
              lastName: consumer.props.lastName,
              nobaUserID: consumer.props.id,
              email: consumer.props.displayEmail,
            },
          );
        } else {
          await this.notificationService.sendNotification(
            NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,

            {
              firstName: consumer.props.firstName,
              lastName: consumer.props.lastName,
              nobaUserID: consumer.props.id,
              email: consumer.props.displayEmail,
            },
          );
        }
      } else if (result.status === KYCStatus.REJECTED) {
        await this.notificationService.sendNotification(
          NotificationEventType.SEND_KYC_DENIED_EVENT,

          {
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.displayEmail,
          },
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
    let id: string;
    let newConsumerData: ConsumerProps;
    try {
      id = await this.idvProvider.verifyDocument(sessionKey, documentInformation, consumer);
      newConsumerData = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentVerificationTimestamp: new Date(),
          documentCheckReference: id,
        },
      };
    } catch (e) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,

        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        },
      );
      throw e;
    }
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);
    await this.notificationService.sendNotification(
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,

      {
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: updatedConsumer.props.displayEmail,
      },
    );
    return id;
  }

  async getDocumentVerificationResult(consumerID: string, verificationID: string): Promise<DocumentVerificationResult> {
    const result = await this.idvProvider.getDocumentVerificationResult(verificationID);
    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
      },
    };
    await this.consumerService.updateConsumer(newConsumerData);

    if (
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: consumer.props.displayEmail,
      });
    } else if (
      result.status === DocumentVerificationStatus.REJECTED ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE
    ) {
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,

        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        },
      );
    }

    return result;
  }

  async getDocumentVerificationURL(
    sessionKey: string,
    consumerID: string,
    locale: IDVerificationURLRequestLocale,
    idBack: boolean,
    selfie: boolean,
    poa: boolean,
  ) {
    const consumer: Consumer = await this.consumerService.getConsumer(consumerID);
    return await this.idvProvider.getIdentityDocumentVerificationURL(sessionKey, consumer, locale, idBack, selfie, poa);
  }

  async processDocumentVerificationWebhookResult(
    documentVerificationResult: DocumentVerificationWebhookRequest,
  ): Promise<DocumentVerificationResult> {
    const consumerID = documentVerificationResult.data.case.customerID;
    const result: DocumentVerificationResult = this.idvProvider.processDocumentVerificationResult(
      documentVerificationResult.documentVerificationResult,
    );

    const consumer: Consumer = await this.consumerService.findConsumerById(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
        riskRating: result.riskRating,
      },
    };
    await this.consumerService.updateConsumer(newConsumerData);

    if (
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_KYC_APPROVED_US_EVENT,

        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        },
      );
    } else if (
      result.status === DocumentVerificationStatus.REJECTED ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY ||
      result.status == DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE
    ) {
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,

        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        },
      );
    }
    return result;
  }

  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionVerification: TransactionVerification,
  ): Promise<ConsumerVerificationResult> {
    const result = await this.idvProvider.transactionVerification(sessionKey, consumer, transactionVerification);

    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        kycCheckStatus: result.status,
      },
    };

    await this.consumerService.updateConsumer(newConsumerData);
    await this.verificationDataRepo.updateVerificationData(
      VerificationData.createVerificationData({
        id: sessionKey,
        transactionID: transactionVerification.transactionID,
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
    const verificationData = VerificationData.createVerificationData({ id: sessionKey });
    return await this.verificationDataRepo.saveVerificationData(verificationData);
  }

  private needsDocumentVerification(countryCode: string): boolean {
    return countryCode.toLocaleLowerCase() !== "us";
  }
}
