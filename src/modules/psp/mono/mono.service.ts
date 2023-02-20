import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { Logger } from "winston";
import {
  isTerminalState,
  MonoCurrency,
  MonoTransaction,
  MonoTransactionState,
  MonoTransactionType,
} from "../domain/Mono";
import {
  MonoClientCollectionLinkResponse,
  MonoTransferResponse,
  MonoTransferStatusResponse,
} from "../dto/mono.client.dto";
import { CreateMonoTransactionRequest, MonoWithdrawalDetails } from "../dto/mono.service.dto";
import { MonoClient } from "./mono.client";
import { IMonoRepo } from "./repo/mono.repo";
import { MONO_REPO_PROVIDER } from "./repo/mono.repo.module";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { MonoWebhookHandlers } from "./mono.webhook";
import {
  BankTransferApprovedEvent,
  BankTransferRejectedEvent,
  CollectionIntentCreditedEvent,
} from "../dto/mono.webhook.dto";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { SupportedBanksDTO } from "../dto/SupportedBanksDTO";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { KmsService } from "../../../modules/common/kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { MonoClientErrorCode, MonoClientException } from "./exception/mono.client.exception";

type CollectionLinkDepositRequest = {
  nobaTransactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumer: Consumer;
};

type WithdrawalRequest = {
  nobaTransactionID: string;
  nobaPublicTransactionRef: string;
  amount: number;
  currency: MonoCurrency;
  consumer: Consumer;
  withdrawalDetails: MonoWithdrawalDetails;
};

@Injectable()
export class MonoService {
  @Inject()
  protected readonly kmsService: KmsService;

  @Inject(MONO_REPO_PROVIDER)
  protected readonly monoRepo: IMonoRepo;

  @Inject(WINSTON_MODULE_PROVIDER)
  protected readonly logger: Logger;

  @Inject()
  protected readonly consumerService: ConsumerService;

  @Inject()
  protected readonly monoClient: MonoClient;

  @Inject()
  protected readonly monoWebhookHandlers: MonoWebhookHandlers;

  async checkMonoHealth(): Promise<HealthCheckResponse> {
    return this.monoClient.getHealth();
  }

  async getTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction | null> {
    let monoTransaction: MonoTransaction = await this.monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
    if (!monoTransaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (monoTransaction.type === MonoTransactionType.WITHDRAWAL && !isTerminalState(monoTransaction.state)) {
      monoTransaction = await this.refreshWithdrawalState(monoTransaction);
    }
    return monoTransaction;
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

  async createMonoTransaction(request: CreateMonoTransactionRequest): Promise<MonoTransaction> {
    const consumer: Consumer = await this.consumerService.getConsumer(request.consumerID);

    switch (request.type) {
      case MonoTransactionType.WITHDRAWAL:
        return this.executeWithdrawal({
          amount: request.amount,
          consumer: consumer,
          currency: request.currency,
          nobaPublicTransactionRef: request.nobaPublicTransactionRef,
          nobaTransactionID: request.nobaTransactionID,
          withdrawalDetails: request.withdrawalDetails,
        });

      case MonoTransactionType.COLLECTION_LINK_DEPOSIT:
        return this.executeDepositUsingCollectionLink({
          amount: request.amount,
          consumer: consumer,
          currency: request.currency,
          nobaTransactionID: request.nobaTransactionID,
        });

      default:
        throw new ServiceException({
          message: `Invalid MonoTransactionType: ${request.type}`,
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        });
    }
  }

  async processWebhookEvent(requestBody: Record<string, any>, monoSignature: string): Promise<void> {
    switch (requestBody.event.type) {
      case "collection_intent_credited":
        await this.processCollectionIntentCreditedEvent(
          this.monoWebhookHandlers.convertCollectionLinkCredited(requestBody, monoSignature),
        );
        break;

      case "bank_transfer_approved":
        await this.processBankTransferApprovedEvent(
          this.monoWebhookHandlers.convertBankTransferApproved(requestBody, monoSignature),
        );
        break;

      case "bank_transfer_rejected":
        await this.processBankTransferRejectedEvent(
          this.monoWebhookHandlers.convertBankTransferRejected(requestBody, monoSignature),
        );
        break;

      default:
        this.logger.error(`Unknown Mono webhook event: ${JSON.stringify(requestBody)}`);
        throw new InternalServiceErrorException({
          message: `Unknown Mono webhook event: ${JSON.stringify(requestBody)}`,
        });
    }
  }

  private async refreshWithdrawalState(monoTransaction: MonoTransaction): Promise<MonoTransaction> {
    const updatedState: MonoTransferStatusResponse = await this.monoClient.getTransferStatus(
      monoTransaction.withdrawalDetails.transferID,
    );

    if (updatedState.state !== monoTransaction.state) {
      await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
        state: updatedState.state,
        ...(updatedState.declinationReason && { declinationReason: updatedState.declinationReason }),
      });
      monoTransaction.state = updatedState.state;
    }

    return monoTransaction;
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
      monoPaymentTransactionID: event.monoTransactionID,
      state: MonoTransactionState.SUCCESS,
    });
  }

  private async processBankTransferApprovedEvent(event: BankTransferApprovedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByTransferID(
      event.transferID,
    );
    if (!monoTransaction) {
      this.logger.error(`Mono transaction not found for transferID: ${event.transferID}`);
      throw new InternalServiceErrorException({
        message: `Mono transaction not found for transferID: ${event.transferID}`,
      });
    }

    // TODO: Verify that the amount and currency match the expected amount and currency (maybe?)

    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      state: MonoTransactionState.SUCCESS,
    });
  }

  private async processBankTransferRejectedEvent(event: BankTransferRejectedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByTransferID(
      event.transferID,
    );
    if (!monoTransaction) {
      this.logger.error(`Mono transaction not found for transferID: ${event.transferID}`);
      throw new InternalServiceErrorException({
        message: `Mono transaction not found for transferID: ${event.transferID}`,
      });
    }

    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      state: event.state,
      declinationReason: event.declinationReason,
    });
  }

  private validateWithdrawalRequest(request: WithdrawalRequest): void {
    if (request.currency !== MonoCurrency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Invalid currency: ${request.currency}. Only COP is supported.`,
      });
    }

    if (!request.consumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Consumer not found.",
      });
    }

    if (!request.nobaPublicTransactionRef) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "nobaPublicTransactionRef is required",
      });
    }

    const requiredWithdrawalDetailsField = [
      "bankCode",
      "encryptedAccountNumber",
      "accountType",
      "documentNumber",
      "documentType",
    ];
    for (const field of requiredWithdrawalDetailsField) {
      if (!request.withdrawalDetails[field]) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: `Missing withdrawal details field: ${field}`,
        });
      }
    }
  }

  private validateCollectionLinkDepositRequest(request: CollectionLinkDepositRequest): void {
    if (request.currency !== MonoCurrency.COP) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Invalid currency: ${request.currency}. Only COP is supported.`,
      });
    }

    if (!request.consumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Consumer not found.",
      });
    }
  }

  private async executeWithdrawal(request: WithdrawalRequest): Promise<MonoTransaction> {
    this.validateWithdrawalRequest(request);

    const decryptedAccountNumber = await this.kmsService.decryptString(
      request.withdrawalDetails.encryptedAccountNumber,
      KmsKeyType.SSN,
    );
    if (!decryptedAccountNumber) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Account number failed decryption: ${request.withdrawalDetails.encryptedAccountNumber}`,
      });
    }

    const response: MonoTransferResponse = await this.monoClient.transfer({
      transactionID: request.nobaTransactionID,
      transactionRef: request.nobaPublicTransactionRef,
      amount: request.amount,
      currency: request.currency,
      bankCode: request.withdrawalDetails.bankCode,
      accountNumber: decryptedAccountNumber,
      accountType: request.withdrawalDetails.accountType,
      documentNumber: request.withdrawalDetails.documentNumber,
      documentType: request.withdrawalDetails.documentType,
      consumerEmail: request.consumer.props.email,
      consumerName: `${request.consumer.props.firstName} ${request.consumer.props.lastName}`,
    });

    return this.monoRepo.createMonoTransaction({
      nobaTransactionID: request.nobaTransactionID,
      type: MonoTransactionType.WITHDRAWAL,
      withdrawalDetails: {
        batchID: response.batchID,
        transferID: response.transferID,
        ...(response.declinationReason && { declinationReason: response.declinationReason }),
      },
    });
  }

  private async executeDepositUsingCollectionLink(request: CollectionLinkDepositRequest): Promise<MonoTransaction> {
    this.validateCollectionLinkDepositRequest(request);

    let monoCollectionResponse: MonoClientCollectionLinkResponse;
    try {
      monoCollectionResponse = await this.monoClient.createCollectionLink({
        transactionID: request.nobaTransactionID,
        amount: request.amount,
        currency: request.currency,
        consumerEmail: request.consumer.props.email,
        consumerPhone: request.consumer.props.phone,
        consumerName: `${request.consumer.props.firstName} ${request.consumer.props.lastName}`,
      });
    } catch (e) {
      if (e instanceof MonoClientException) {
        if (e.errorCode === MonoClientErrorCode.PHONE_NUMBER_INVALID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: e.message,
          });
        }
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: e.message,
        });
      }

      this.logger.error(`Mono collection link creation failed: ${e}`);
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Mono collection link creation failed: ${e}`,
      });
    }

    const monoTransaction: MonoTransaction = await this.monoRepo.createMonoTransaction({
      nobaTransactionID: request.nobaTransactionID,
      type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      collectionLinkDepositDetails: {
        collectionLinkID: monoCollectionResponse.collectionLinkID,
        collectionURL: monoCollectionResponse.collectionLink,
      },
    });
    return monoTransaction;
  }
}
