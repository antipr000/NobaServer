import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentInformation } from "../domain/DocumentInformation";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";

export interface IDVProvider {
  verifyConsumerInformation(sessionKey: string, consumerInfo: ConsumerInformation): Promise<ConsumerVerificationResult>;

  verifyDocument(sessionKey: string, documentInfo: DocumentInformation): Promise<string>;

  getDocumentVerificationResult(sessionKey: string, id: string, userID: string): Promise<DocumentVerificationResult>;
}
