import { Injectable } from "@nestjs/common";
import { PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloTransactionDTO } from "../dto/pomelo.workflow.controller.dto";

@Injectable()
export class PomeloWorkflowMapper {
  mapToPomeloTransactionDTO(pomeloTransaction: PomeloTransaction): PomeloTransactionDTO {
    return {
      id: pomeloTransaction.id,
      pomeloCardID: pomeloTransaction.pomeloCardID,
      pomeloTransactionID: pomeloTransaction.pomeloTransactionID,
      pomeloUserID: pomeloTransaction.pomeloUserID,
      pomeloIdempotencyKey: pomeloTransaction.pomeloIdempotencyKey,
      parentPomeloTransactionID: pomeloTransaction.parentPomeloTransactionID,
      nobaTransactionID: pomeloTransaction.nobaTransactionID,
      pomeloTransactionType: pomeloTransaction.pomeloTransactionType,
      amountInUSD: pomeloTransaction.amountInUSD,
      amountInLocalCurrency: pomeloTransaction.localAmount,
      localCurrency: pomeloTransaction.localCurrency,
      settlementAmount: pomeloTransaction.settlementAmount,
      settlementCurrency: pomeloTransaction.settlementCurrency,
      countryCode: pomeloTransaction.countryCode,
      entryMode: pomeloTransaction.entryMode,
      pointType: pomeloTransaction.pointType,
      origin: pomeloTransaction.origin,
      source: pomeloTransaction.source,
      status: pomeloTransaction.status,
      createdTimestamp: pomeloTransaction.createdTimestamp,
      updatedTimestamp: pomeloTransaction.updatedTimestamp,
    };
  }
}
