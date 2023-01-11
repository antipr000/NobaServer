import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoClientCollectionLinkResponse } from "../dto/mono.client.dto";
import { CreateMonoTransactionRequest } from "../dto/mono.service.dto";
import { MonoClient } from "./mono.client";
import { IMonoRepo } from "./repo/mono.repo";
import { MONO_REPO_PROVIDER } from "./repo/mono.repo.module";

@Injectable()
export class MonoService {
  constructor(
    @Inject(MONO_REPO_PROVIDER) private readonly monoRepo: IMonoRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoClient: MonoClient,
  ) {}

  async getTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction | null> {
    return await this.monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
  }

  async getTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction | null> {
    return await this.monoRepo.getMonoTransactionByCollectionLinkID(collectionLinkID);
  }

  async createMonoTransaction(request: CreateMonoTransactionRequest): Promise<MonoTransaction> {
    const monoCollectionResponse: MonoClientCollectionLinkResponse = await this.monoClient.createCollectionLink({
      transactionID: request.nobaTransactionID,
      amount: request.amount,
      currency: request.currency,
      consumerEmail: request.consumerEmail,
      consumerPhone: request.consumerPhone,
      consumerName: request.consumerName,
    });

    const monoTransaction: MonoTransaction = await this.monoRepo.createMonoTransaction({
      collectionLinkID: monoCollectionResponse.collectionLinkID,
      nobaTransactionID: request.nobaTransactionID,
      collectionURL: monoCollectionResponse.collectionLink,
    });
    return monoTransaction;
  }
}
