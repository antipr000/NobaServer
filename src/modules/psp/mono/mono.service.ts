import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { Logger } from "winston";
import { MonoCurrency, MonoTransaction, MonoTransactionState, MonoWithdrawal } from "../domain/Mono";
import { MonoClientCollectionLinkResponse } from "../dto/mono.client.dto";
import { CreateMonoTransactionRequest, WithdrawMonoRequest } from "../dto/mono.service.dto";
import { MonoClient } from "./mono.client";
import { IMonoRepo } from "./repo/mono.repo";
import { MONO_REPO_PROVIDER } from "./repo/mono.repo.module";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { MonoWebhookHandlers } from "./mono.webhook";
import { CollectionIntentCreditedEvent } from "../dto/mono.webhook.dto";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { SupportedBanksDTO } from "../dto/SupportedBanksDTO";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";

@Injectable()
export class MonoService {
  constructor(
    @Inject(MONO_REPO_PROVIDER) private readonly monoRepo: IMonoRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly consumerService: ConsumerService,
    private readonly monoClient: MonoClient,
    private readonly monoWebhookHandlers: MonoWebhookHandlers,
  ) {}

  async getTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction | null> {
    return await this.monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
  }

  async getSupportedBanks(): Promise<Array<SupportedBanksDTO>> {
    const supportedBanks = await this.monoClient.getSupportedBanks();
    supportedBanks.forEach(bank => {
      bank.name = bank.name.replace(/\w\S*/g, function (txt) {
        if (txt === "DE") return txt.toLowerCase();
        else if (txt.length <= 3 || txt.includes(".") || txt === "BBVA") {
          return txt;
        }
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
      });
    });
    return supportedBanks;
  }

  async getTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction | null> {
    return await this.monoRepo.getMonoTransactionByCollectionLinkID(collectionLinkID);
  }

  async withdrawFromNoba(request: WithdrawMonoRequest): Promise<MonoWithdrawal> {
    if (request.currency !== MonoCurrency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Invalid currency: ${request.currency}. Only COP is supported.`,
      });
    }

    const consumer: Consumer = await this.consumerService.getConsumer(request.consumerID);
    if (!consumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Consumer not found",
      });
    }

    return await this.monoClient.transfer({
      transactionID: request.transactionID,
      transactionRef: request.transactionRef,
      amount: request.amount,
      currency: request.currency,
      bankCode: request.bankCode,
      accountNumber: request.accountNumber,
      accountType: request.accountType,
      documentNumber: request.documentNumber,
      documentType: request.documentType,
      consumerEmail: consumer.props.email,
      consumerName: `${consumer.props.firstName} ${consumer.props.lastName}`,
    });
  }

  async createMonoTransaction(request: CreateMonoTransactionRequest): Promise<MonoTransaction> {
    const consumer: Consumer = await this.consumerService.getConsumer(request.consumerID);

    const monoCollectionResponse: MonoClientCollectionLinkResponse = await this.monoClient.createCollectionLink({
      transactionID: request.nobaTransactionID,
      amount: request.amount,
      currency: request.currency,
      consumerEmail: consumer.props.email,
      consumerPhone: consumer.props.phone,
      consumerName: `${consumer.props.firstName} ${consumer.props.lastName}`,
    });

    const monoTransaction: MonoTransaction = await this.monoRepo.createMonoTransaction({
      collectionLinkID: monoCollectionResponse.collectionLinkID,
      nobaTransactionID: request.nobaTransactionID,
      collectionURL: monoCollectionResponse.collectionLink,
    });
    return monoTransaction;
  }

  async processWebhookEvent(requestBody: Record<string, any>, monoSignature: string): Promise<void> {
    switch (requestBody.event.type) {
      case "collection_intent_credited":
        await this.processCollectionIntentCreditedEvent(
          this.monoWebhookHandlers.convertCollectionLinkCredited(requestBody, monoSignature),
        );
        break;

      default:
        this.logger.error(`Unknown Mono webhook event: ${JSON.stringify(requestBody)}`);
        throw new InternalServiceErrorException({
          message: `Unknown Mono webhook event: ${JSON.stringify(requestBody)}`,
        });
    }
  }

  private async processCollectionIntentCreditedEvent(event: CollectionIntentCreditedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByCollectionLinkID(
      event.collectionLinkID,
    );
    if (!monoTransaction) {
      this.logger.error(`Mono transaction not found for collectionLinkID: ${event.collectionLinkID}`);
      throw new InternalServiceErrorException({
        message: `Mono transaction not found for collectionLinkID: ${event.collectionLinkID}`,
      });
    }

    // TODO: Verify that the amount and currency match the expected amount and currency.

    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      monoTransactionID: event.monoTransactionID,
      state: MonoTransactionState.SUCCESS,
    });
  }
}
