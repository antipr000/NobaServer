import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { TransactionInformation } from "../domain/TransactionInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";

export interface IDVProvider {
  verifyConsumerInformation(sessionKey: string, consumerInfo: ConsumerInformation): Promise<ConsumerVerificationResult>;

  verifyDocument(sessionKey: string, documentInfo: DocumentInformation, consumer: Consumer): Promise<string>;

  getDocumentVerificationResult(sessionKey: string, id: string, userID: string): Promise<DocumentVerificationResult>;

  transactionVerification(
    sessionKey: string,
    consumer: Consumer,
    transactionInformation: TransactionInformation,
  ): Promise<ConsumerVerificationResult>;
}
