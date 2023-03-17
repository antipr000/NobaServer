import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../consumer/consumer.service";
import { IDVProvider } from "./integrations/IDVProvider";
import { ConsumerInformation, KYCFlow } from "./domain/ConsumerInformation";
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
import { TransactionVerification } from "./domain/TransactionVerification";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { SeverityLevel } from "../../core/exception/base.exception";
import { HealthCheckResponse } from "../../core/domain/HealthCheckTypes";
import { AlertKey } from "../common/alerts/alert.dto";
import { AlertService } from "../../modules/common/alerts/alert.service";

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

  constructor(private consumerService: ConsumerService, private readonly alertService: AlertService) {}

  async getHealth(): Promise<HealthCheckResponse> {
    return this.idvProvider.getHealth();
  }

  async verifyConsumerInformationForLogin(consumerID: string, sessionKey: string): Promise<KYCStatus> {
    const verifiedConsumerData = await this.verifyConsumerInformationInternal(consumerID, sessionKey, [KYCFlow.LOGIN]);
    await this.consumerService.updateConsumer(verifiedConsumerData);
    const status = verifiedConsumerData.verificationData.kycCheckStatus;
    if (status === KYCStatus.APPROVED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, consumerID, status);
    } else if (status === KYCStatus.REJECTED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, consumerID, status);
    } else {
      // This means it's pending. Do we want to do anything more here?
    }
    return status;
  }

  async verifyConsumerInformation(consumerID: string, sessionKey: string): Promise<KYCStatus> {
    const verifiedConsumerData = await this.verifyConsumerInformationInternal(consumerID, sessionKey, [
      KYCFlow.CUSTOMER,
    ]);
    const updatedConsumer = await this.consumerService.updateConsumer(verifiedConsumerData);
    const status = verifiedConsumerData.verificationData.kycCheckStatus;

    if (status === KYCStatus.APPROVED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, consumerID, status);
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
        locale: updatedConsumer.props.locale,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props.id,
        email: updatedConsumer.props.displayEmail,
      });
    } else if (status === KYCStatus.REJECTED) {
      await this.idvProvider.postConsumerFeedback(sessionKey, consumerID, status);
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_DENIED_EVENT, {
        locale: updatedConsumer.props.locale,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props.id,
        email: updatedConsumer.props.displayEmail,
      });
    } else {
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT, {
        locale: updatedConsumer.props.locale,
        firstName: updatedConsumer.props.firstName,
        lastName: updatedConsumer.props.lastName,
        nobaUserID: updatedConsumer.props.id,
        email: updatedConsumer.props.displayEmail,
      });
    }
    return status;
  }

  private async verifyConsumerInformationInternal(
    consumerID: string,
    sessionKey: string,
    kycFlow: KYCFlow[],
  ): Promise<ConsumerProps> {
    const consumer: Consumer = await this.consumerService.getConsumer(consumerID);

    // Augment request with created timestamp info for verification provider
    const consumerInformation: ConsumerInformation = {
      userID: consumerID,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      dateOfBirth: consumer.props.dateOfBirth,
      address: consumer.props.address,
      email: consumer.props.email,
      phoneNumber: consumer.props.phone,
      createdTimestampMillis: consumer.props.createdTimestamp.getTime(),
    };
    const result: ConsumerVerificationResult = await this.idvProvider.verifyConsumerInformation(
      sessionKey,
      consumerInformation,
      kycFlow,
    );
    const verifiedConsumerData: ConsumerProps = {
      ...consumer.props,
      address: consumerInformation.address,
      verificationData: {
        ...consumer.props.verificationData,
        kycCheckStatus: result.status,
        kycVerificationTimestamp: new Date(),
        riskRating: result.idvProviderRiskLevel,
        // This may change depending on the response from the IDV provider
        documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
      },
    };
    return verifiedConsumerData;
  }

  async processKycVerificationWebhookRequest(requestBody: CaseNotificationWebhookRequest) {
    const consumerID = requestBody.data.case.customerID;
    const result: ConsumerVerificationResult = this.idvProvider.processKycVerificationWebhookResult(requestBody);
    if (result.status === KYCStatus.APPROVED || result.status === KYCStatus.REJECTED) {
      const consumer = await this.consumerService.getConsumer(consumerID);
      const newConsumerData: Partial<ConsumerProps> = {
        id: consumer.props.id,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: result.status,
          kycVerificationTimestamp: new Date(),
        },
      };

      await this.consumerService.updateConsumer(newConsumerData);

      await this.idvProvider.postConsumerFeedback(requestBody.data.case.sessionKey, consumerID, result.status);

      if (result.status === KYCStatus.APPROVED) {
        await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
          locale: consumer.props.locale,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        });
      } else if (result.status === KYCStatus.REJECTED) {
        await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_DENIED_EVENT, {
          locale: consumer.props.locale,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        });
      }
    }
  }

  async verifyDocument(
    consumerID: string,
    sessionKey: string,
    documentInformation: DocumentInformation,
  ): Promise<string> {
    const consumer: Consumer = await this.consumerService.getConsumer(consumerID);
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
          locale: consumer.props.locale,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.id,
          email: consumer.props.displayEmail,
        },
      );
      throw e;
    }
    const updatedConsumer = await this.consumerService.updateConsumer(newConsumerData);
    await this.notificationService.sendNotification(NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT, {
      locale: updatedConsumer.props.locale,
      firstName: updatedConsumer.props.firstName,
      lastName: updatedConsumer.props.lastName,
      nobaUserID: consumer.props.id,
      email: updatedConsumer.props.displayEmail,
    });
    return id;
  }

  async getDocumentVerificationResult(consumerID: string, verificationID: string): Promise<DocumentVerificationStatus> {
    const result = await this.idvProvider.getDocumentVerificationResult(verificationID);
    const consumer: Consumer = await this.consumerService.getConsumer(consumerID);
    const newConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
        documentVerificationTimestamp: new Date(),
      },
    };
    await this.consumerService.updateConsumer(newConsumerData);

    if (
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
        locale: consumer.props.locale,
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
      await this.notificationService.sendNotification(NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT, {
        locale: consumer.props.locale,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: consumer.props.displayEmail,
      });
    }

    return result.status;
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
    const consumer: Consumer = await this.consumerService.getConsumer(consumerID);
    if (!consumer) {
      this.alertService.raiseAlert({
        key: AlertKey.WEBHOOK_CONSUMER_NOT_FOUND,
        message: `Failed to find consumer with ID ${consumerID}`,
      });
      return null;
    }

    const result: DocumentVerificationResult = this.idvProvider.processDocumentVerificationResult(
      documentVerificationResult.documentVerificationResult,
    );

    const updateConsumerData: ConsumerProps = {
      ...consumer.props,
      verificationData: {
        ...consumer.props.verificationData,
        documentVerificationStatus: result.status,
        documentVerificationTimestamp: new Date(),
        riskRating: result.riskRating,
      },
    };
    await this.consumerService.updateConsumer(updateConsumerData);

    if (
      result.status === DocumentVerificationStatus.APPROVED ||
      result.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED
    ) {
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
      await this.notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
        locale: consumer.props.locale,
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
      await this.idvProvider.postDocumentFeedback(documentVerificationResult.data.case.sessionKey, result);
      await this.notificationService.sendNotification(NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT, {
        locale: consumer.props.locale,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
        email: consumer.props.displayEmail,
      });
    }
    return result;
  }

  async transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionVerification: TransactionVerification,
  ): Promise<ConsumerVerificationResult> {
    let result;
    try {
      result = await this.idvProvider.transactionVerification(sessionKey, consumer, transactionVerification);
    } catch (error) {
      throw new ServiceException({
        message: error.message,
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        severity: SeverityLevel.HIGH,
      });
    }

    if (!result) {
      throw new ServiceException({
        message: "Unknown error performing transaction verification against IDV provider",
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        severity: SeverityLevel.HIGH,
      });
    }

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
        transactionID: transactionVerification.transactionRef,
      }),
    );

    return result;
  }

  async provideTransactionFeedback(
    errorCode: string,
    errorDescription: string,
    transactionRef: string,
    processor: string,
  ): Promise<void> {
    const sessionKey = await this.verificationDataRepo.getSessionKeyFromFilters({ transactionID: transactionRef });
    await this.idvProvider.postTransactionFeedback(sessionKey, errorCode, errorDescription, transactionRef, processor);
  }

  async getDeviceVerificationResult(sessionKey: string): Promise<SardineDeviceInformationResponse> {
    return await this.idvProvider.getDeviceVerificationResult(sessionKey);
  }

  async createSession(consumerID?: string): Promise<VerificationData> {
    const sessionKey = Entity.getNewID();
    const verificationData = VerificationData.createVerificationData({ id: sessionKey, userID: consumerID });
    return await this.verificationDataRepo.saveVerificationData(verificationData);
  }
}
