import { IClient } from "../../../core/domain/IClient";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { ConsumerInformation, KYCFlow } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { TransactionVerification } from "../domain/TransactionVerification";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import {
  CaseNotificationWebhookRequest,
  DocumentVerificationSardineResponse,
  IdentityDocumentURLResponse,
  SardineDeviceInformationResponse,
} from "./SardineTypeDefinitions";

export interface IDVProvider extends IClient {
  verifyConsumerInformation(
    sessionKey: string,
    consumerInfo: ConsumerInformation,
    kycFlow: KYCFlow[],
  ): Promise<ConsumerVerificationResult>;

  verifyDocument(sessionKey: string, documentInfo: DocumentInformation, consumer: Consumer): Promise<string>;

  getDocumentVerificationResult(id: string): Promise<DocumentVerificationResult>;

  transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionVerification: TransactionVerification,
  ): Promise<ConsumerVerificationResult>;

  getIdentityDocumentVerificationURL(
    sessionKey: string,
    consumer: Consumer,
    locale: IDVerificationURLRequestLocale,
    idBack: boolean,
    selfie: boolean,
    poa: boolean,
  ): Promise<IdentityDocumentURLResponse>;

  getDeviceVerificationResult(sessionKey: string): Promise<SardineDeviceInformationResponse>;

  processDocumentVerificationResult(
    documentVerificationSardineResponse: DocumentVerificationSardineResponse,
  ): DocumentVerificationResult;

  processKycVerificationWebhookResult(resultData: CaseNotificationWebhookRequest): ConsumerVerificationResult;

  postConsumerFeedback(sessionKey: string, consumerID: string, status: string): Promise<void>;

  postDocumentFeedback(sessionKey: string, result: DocumentVerificationResult): Promise<void>;

  postTransactionFeedback(
    sessionKey: string,
    errorCode: string,
    errorDescription: string,
    transactionID: string,
    processor: string,
  ): Promise<void>;
}
