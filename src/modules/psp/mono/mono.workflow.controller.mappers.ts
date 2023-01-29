import { Injectable } from "@nestjs/common";
import { MonoTransaction } from "../domain/Mono";
import { MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";

@Injectable()
export class MonoWorkflowControllerMappers {
  convertToMonoTransactionDTO(monoTransaction: MonoTransaction): MonoTransactionDTO {
    const result: MonoTransactionDTO = {
      id: monoTransaction.id,
      type: monoTransaction.type,
      nobaTransactionID: monoTransaction.nobaTransactionID,
      state: monoTransaction.state,
      createdTimestamp: monoTransaction.createdTimestamp,
      updatedTimestamp: monoTransaction.updatedTimestamp,
    };

    if (monoTransaction.collectionLinkDepositDetails) {
      result.collectionLinkDepositDetails = {
        collectionLinkID: monoTransaction.collectionLinkDepositDetails.collectionLinkID,
        monoPaymentTransactionID: monoTransaction.collectionLinkDepositDetails.monoPaymentTransactionID,
      };
    }
    if (monoTransaction.withdrawalDetails) {
      result.withdrawalDetails = {
        transferID: monoTransaction.withdrawalDetails.transferID,
        batchID: monoTransaction.withdrawalDetails.batchID,
        declinationReason: monoTransaction.withdrawalDetails.declinationReason,
      };
    }

    return result;
  }
}
