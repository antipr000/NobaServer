import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "../../consumer/domain/Consumer";
import { Logger } from "winston";
import { MonoCurrency, MonoTransaction, MonoTransactionType } from "../domain/Mono";
import { MonoClientCollectionLinkResponse, MonoTransferResponse } from "../dto/mono.client.dto";
import { MonoClient } from "./mono.client";
import { IMonoRepo } from "../repo/mono.repo";
import { MONO_REPO_PROVIDER } from "../repo/mono.repo.module";
import { ConsumerService } from "../../consumer/consumer.service";
import { SupportedBanksDTO } from "../../psp/dto/SupportedBanksDTO";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { KmsService } from "../../common/kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { MonoClientException } from "../exception/mono.client.exception";
import { PhoneNumberUtil } from "google-libphonenumber";
import { BalanceDTO } from "../../psp/dto/balance.dto";
import { IBank } from "../../psp/factory/ibank";
import { DebitBankFactoryRequest, DebitBankFactoryResponse } from "../../psp/domain/BankFactoryTypes";
import { AlertService } from "../../common/alerts/alert.service";
import { CreateMonoTransactionRequest, MonoWithdrawalDetails } from "../dto/mono.service.dto";

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
export class MonoService implements IBank {
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
  private readonly alertService: AlertService;

  async checkMonoHealth(): Promise<HealthCheckResponse> {
    return this.monoClient.getHealth();
  }

  async getTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction | null> {
    const monoTransaction: MonoTransaction = await this.monoRepo.getMonoTransactionByNobaTransactionID(
      nobaTransactionID,
    );
    if (!monoTransaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
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

  async getBalance(accountNumber: string): Promise<BalanceDTO> {
    try {
      const balance = await this.monoClient.getAccountBalance(accountNumber);
      return {
        balance: balance.amount,
        currency: balance.currency,
      };
    } catch (e) {
      this.alertService.raiseError(
        `Error obtaining balance for account ending in ${accountNumber.slice(-4)}: ${e.message}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Error obtaining Mono account balance",
      });
    }
  }

  public async debit(request: DebitBankFactoryRequest): Promise<DebitBankFactoryResponse> {
    const withdrawal = await this.createMonoTransaction({
      type: MonoTransactionType.WITHDRAWAL,
      amount: request.amount,
      currency: request.currency as MonoCurrency,
      nobaTransactionID: request.transactionID,
      nobaPublicTransactionRef: request.transactionRef,
      consumerID: request.consumerID,
      withdrawalDetails: {
        bankCode: request.bankCode,
        encryptedAccountNumber: request.accountNumber,
        accountType: request.accountType,
        documentNumber: request.documentNumber,
        documentType: request.documentType,
      },
    });

    return {
      withdrawalID: withdrawal.id,
      state: withdrawal.state,
      declinationReason: withdrawal.withdrawalDetails.declinationReason,
    };
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

    const phoneUtil = PhoneNumberUtil.getInstance();
    if (!phoneUtil.isValidNumberForRegion(phoneUtil.parse(request.consumer.props.phone, "CO"), "CO")) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Invalid Colombian phone number: ${request.consumer.props.phone}`,
      });
    }
  }

  private async executeWithdrawal(request: WithdrawalRequest): Promise<MonoTransaction> {
    this.validateWithdrawalRequest(request);

    const [decryptedAccountNumber, monoTransaction] = await Promise.all([
      this.kmsService.decryptString(request.withdrawalDetails.encryptedAccountNumber, KmsKeyType.SSN),
      this.monoRepo.getMonoTransactionByNobaTransactionID(request.nobaTransactionID),
    ]);

    if (!decryptedAccountNumber) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Account number failed decryption: ${request.withdrawalDetails.encryptedAccountNumber}`,
      });
    }

    if (monoTransaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.ALREADY_EXISTS,
        message: `Mono transaction already exists for nobaTransactionID: ${request.nobaTransactionID}`,
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
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: e.message,
        });
      }

      this.alertService.raiseError(`Mono collection link creation failed: ${e}`);
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
