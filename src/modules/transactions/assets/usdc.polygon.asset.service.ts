import { Injectable } from "@nestjs/common";
import { FundsAvailabilityRequest, ConsumerAccountTransferRequest, ConsumerWalletTransferRequest } from "../domain/AssetTypes";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQuery.DTO";
import { AssetService } from "./asset.service";

@Injectable()
export class USDCPolygonAssetService implements AssetService {
  getQuote(quoteQuery: TransactionQuoteQueryDTO) {
    throw new Error("Method not implemented.");
  }

  makeFundsAvailable(request: FundsAvailabilityRequest) {
    throw new Error("Method not implemented.");
  }

  pollFundsAvailableStatus(id: string) {
    throw new Error("Method not implemented.");
  }

  transferToConsumerAccount(request: ConsumerAccountTransferRequest) {
    throw new Error("Method not implemented.");
  }

  pollAccountTransferStatus(id: string) {
    throw new Error("Method not implemented.");
  }

  transferToConsumerWallet(request: ConsumerWalletTransferRequest) {
    throw new Error("Method not implemented.");
  }

  pollConsumerWalletTransferStatus(id: string) {
    throw new Error("Method not implemented.");
  }
};