import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { TransactionInformation } from "../domain/TransactionInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import {
  CaseNotificationWebhookRequest,
  DocumentVerificationSardineResponse,
  SardineDeviceInformationResponse,
} from "./SardineTypeDefinitions";

export interface IDVProvider {
  verifyConsumerInformation(sessionKey: string, consumerInfo: ConsumerInformation): Promise<ConsumerVerificationResult>;

  verifyDocument(sessionKey: string, documentInfo: DocumentInformation, consumer: Consumer): Promise<string>;

  getDocumentVerificationResult(id: string): Promise<DocumentVerificationResult>;

  transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionInformation: TransactionInformation,
  ): Promise<ConsumerVerificationResult>;

  getIdentityDocumentVerificationURL(
    sessionKey: string,
    consumer: Consumer,
    idBack: boolean,
    selfie: boolean,
    poa: boolean,
  ): Promise<string>;

  getDeviceVerificationResult(sessionKey: string): Promise<SardineDeviceInformationResponse>;

  processDocumentVerificationResult(
    documentVerificationSardineResponse: DocumentVerificationSardineResponse,
  ): DocumentVerificationResult;

  processKycVerificationWebhookResult(resultData: CaseNotificationWebhookRequest): ConsumerVerificationResult;

  postConsumerFeedback(sessionKey: string, result: ConsumerVerificationResult): Promise<void>;

  postDocumentFeedback(sessionKey: string, result: DocumentVerificationResult): Promise<void>;

  postTransactionFeedback(
    sessionKey: string,
    errorCode: string,
    errorDescription: string,
    transactionID: string,
    processor: string,
  ): Promise<void>;
}
