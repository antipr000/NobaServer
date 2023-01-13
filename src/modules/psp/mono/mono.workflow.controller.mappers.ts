import { Injectable } from "@nestjs/common";
import { MonoTransaction } from "../domain/Mono";
import { MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";

@Injectable()
export class MonoWorkflowControllerMappers {
  convertToMonoTransactionDTO(monoTransaction: MonoTransaction): MonoTransactionDTO {
    return {
      id: monoTransaction.id,
      collectionLinkID: monoTransaction.collectionLinkID,
      nobaTransactionID: monoTransaction.nobaTransactionID,
      state: monoTransaction.state,
      monoTransactionID: monoTransaction.monoTransactionID,
      createdTimestamp: monoTransaction.createdTimestamp,
      updatedTimestamp: monoTransaction.updatedTimestamp,
    };
  }
}
