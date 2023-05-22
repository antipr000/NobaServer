import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PomeloConfigs } from "../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import {
  PomeloTransactionAuthzResponse,
  PomeloTransactionAuthzDetailStatus,
  PomeloTransactionAuthzSummaryStatus,
  PomeloTransactionAuthzRequest,
  PomeloTransactionAdjustmentRequest,
  PomeloAdjustmentType,
} from "../dto/pomelo.transaction.service.dto";
import { createHmac, timingSafeEqual } from "crypto";
import { Logger } from "winston";
import { TransactionService } from "../../transaction/transaction.service";
import { PomeloTransaction, PomeloTransactionSaveRequest, PomeloTransactionStatus } from "../domain/PomeloTransaction";
import { PomeloRepo } from "../repos/pomelo.repo";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { uuid } from "uuidv4";
import { CircleService } from "../../../modules/circle/public/circle.service";
import {
  CardReversalTransactionType,
  InitiateTransactionRequest,
} from "../../../modules/transaction/dto/transaction.service.dto";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";
import { Transaction, WorkflowName } from "../../../modules/transaction/domain/Transaction";
import { UpdateWalletBalanceServiceDTO } from "../../../modules/psp/domain/UpdateWalletBalanceServiceDTO";
import { CircleTransferStatus } from "../../../modules/psp/domain/CircleTypes";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Utils } from "../../../core/utils/Utils";
import { ExchangeRateService } from "../../../modules/exchangerate/exchangerate.service";
import { ExchangeRateDTO } from "../../../modules/exchangerate/dto/exchangerate.dto";

@Injectable()
export class PomeloTransactionService {
  private readonly transactionAuthzEndpoint = "/transactions/authorizations";
  private readonly transactionAdjustmentEndpointPrefix = "/transactions/adjustments";
  private readonly detailStatusToSummaryStatusMap: Record<
    PomeloTransactionAuthzDetailStatus,
    PomeloTransactionAuthzSummaryStatus
  > = {
    [PomeloTransactionAuthzDetailStatus.APPROVED]: PomeloTransactionAuthzSummaryStatus.APPROVED,
    [PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS]: PomeloTransactionAuthzSummaryStatus.REJECTED,
    [PomeloTransactionAuthzDetailStatus.INVALID_AMOUNT]: PomeloTransactionAuthzSummaryStatus.REJECTED,
    [PomeloTransactionAuthzDetailStatus.INVALID_MERCHANT]: PomeloTransactionAuthzSummaryStatus.REJECTED,
    [PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR]: PomeloTransactionAuthzSummaryStatus.REJECTED,
    [PomeloTransactionAuthzDetailStatus.OTHER]: PomeloTransactionAuthzSummaryStatus.REJECTED,
  };
  private readonly nobaPomeloStatusToPublicDetailStatusMap: Record<
    PomeloTransactionStatus,
    PomeloTransactionAuthzDetailStatus
  > = {
    [PomeloTransactionStatus.PENDING]: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
    [PomeloTransactionStatus.APPROVED]: PomeloTransactionAuthzDetailStatus.APPROVED,
    [PomeloTransactionStatus.INSUFFICIENT_FUNDS]: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
    [PomeloTransactionStatus.INVALID_AMOUNT]: PomeloTransactionAuthzDetailStatus.INVALID_AMOUNT,
    [PomeloTransactionStatus.INVALID_MERCHANT]: PomeloTransactionAuthzDetailStatus.INVALID_MERCHANT,
    [PomeloTransactionStatus.SYSTEM_ERROR]: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
  };
  private readonly adjustmentTypeToCardReversalTypeMap: Record<PomeloAdjustmentType, CardReversalTransactionType> = {
    [PomeloAdjustmentType.CREDIT]: CardReversalTransactionType.CREDIT,
    [PomeloAdjustmentType.DEBIT]: CardReversalTransactionType.DEBIT,
  };

  private pomeloApiSecret: Buffer;

  constructor(
    private configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly transactionService: TransactionService,
    private readonly exchangeRateService: ExchangeRateService,
    @Inject(POMELO_REPO_PROVIDER) private readonly pomeloRepo: PomeloRepo,
    private readonly circleService: CircleService,
  ) {
    // TODO: Check if the ApiKey & ClientSecret are same and we just need to handle encodings :)
    // this.pomeloApiSecret = Buffer.from(pomeloConfigs.clientSecret, "base64");
    const pomeloConfigs: PomeloConfigs = this.configService.get<PomeloConfigs>(POMELO_CONFIG_KEY);
    this.pomeloApiSecret = Buffer.from(pomeloConfigs.clientSecret, "utf8");
  }

  async authorizeTransaction(request: PomeloTransactionAuthzRequest): Promise<PomeloTransactionAuthzResponse> {
    if (request.endpoint !== this.transactionAuthzEndpoint) {
      this.logger.error(
        `'endpoint' mismatch. Received '${request.endpoint}' and expected '${this.transactionAuthzEndpoint}'`,
      );
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    const expectedSignature = this.computeSignature(
      request.timestamp,
      this.transactionAuthzEndpoint,
      request.rawBodyBuffer,
    );
    // TODO: Check if it is cryptographically safe to return a "valid" response
    if (!this.verifySignature(request.rawSignature, expectedSignature)) {
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    try {
      const pomeloTransaction: PomeloTransaction = await this.getOrCreatePomeloTransaction({
        pomeloTransactionID: request.pomeloTransactionID,
        parentPomeloTransactionID: null,
        localAmount: request.localAmount,
        localCurrency: request.localCurrency,
        amountInUSD: request.settlementAmount,
        nobaTransactionID: uuid(),
        pomeloCardID: request.pomeloCardID,
        pomeloIdempotencyKey: request.idempotencyKey,
        countryCode: request.countryCode,
        entryMode: request.entryMode,
        origin: request.origin,
        pointType: request.pointType,
        pomeloTransactionType: request.transactionType,
        pomeloUserID: request.pomeloUserID,
        settlementAmount: request.settlementAmount,
        settlementCurrency: request.settlementCurrency,
        transactionAmount: request.transactionAmount,
        transactionCurrency: request.transactionCurrency,
        source: request.source,
        merchantName: request.merchantName,
        merchantMCC: request.merchantMCC,
      });
      if (pomeloTransaction.status !== PomeloTransactionStatus.PENDING) {
        const detailAuthzStatus: PomeloTransactionAuthzDetailStatus =
          this.nobaPomeloStatusToPublicDetailStatusMap[pomeloTransaction.status];
        return this.prepareAuthorizationResponse(detailAuthzStatus);
      }

      const nobaConsumerID = await this.getNobaConsumerIDHoldingPomeloCard(
        pomeloTransaction.pomeloCardID,
        request.pomeloUserID,
      );
      const circleWalletID: string = await this.circleService.getOrCreateWallet(nobaConsumerID);
      const walletBalanceInUSD: number = await this.circleService.getWalletBalance(circleWalletID);
      const { amountInUSD: amountToDebitInUSD, exchangeRate } = await this.getCOPEquivalentUSDAmountToDeduct(
        pomeloTransaction.localAmount,
      );

      if (walletBalanceInUSD < amountToDebitInUSD) {
        await this.pomeloRepo.updatePomeloTransactionStatus(
          pomeloTransaction.pomeloTransactionID,
          PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        );
        return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);
      }

      const nobaTransaction: Transaction = await this.getOrCreateCardWithdrawalNobaTransaction(
        {
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: amountToDebitInUSD,
            debitConsumerID: nobaConsumerID,
            creditCurrency: Currency.COP,
            creditAmount: pomeloTransaction.localAmount,
            exchangeRate: exchangeRate,
            nobaTransactionID: pomeloTransaction.nobaTransactionID,
            memo: `Transfer of ${request.localAmount} ${request.localCurrency} to ${request.merchantName}`,
          },
        },
        pomeloTransaction.nobaTransactionID,
      );

      const fundTransferStatus: UpdateWalletBalanceServiceDTO = await this.circleService.debitWalletBalance(
        nobaTransaction.id,
        circleWalletID,
        nobaTransaction.debitAmount,
      );

      switch (fundTransferStatus.status) {
        case CircleTransferStatus.INSUFFICIENT_FUNDS:
          await this.pomeloRepo.updatePomeloTransactionStatus(
            pomeloTransaction.pomeloTransactionID,
            PomeloTransactionStatus.INSUFFICIENT_FUNDS,
          );
          return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);

        case CircleTransferStatus.TRANSFER_FAILED:
          await this.pomeloRepo.updatePomeloTransactionStatus(
            pomeloTransaction.pomeloTransactionID,
            PomeloTransactionStatus.SYSTEM_ERROR,
          );
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
            message: "Circle Transfer failed.",
          });

        case CircleTransferStatus.SUCCESS:
          await this.pomeloRepo.updatePomeloTransactionStatus(
            pomeloTransaction.pomeloTransactionID,
            PomeloTransactionStatus.APPROVED,
          );
          return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.APPROVED);
      }
    } catch (err) {
      this.logger.error(err.toString());
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR);
    }
  }

  signTransactionAuthorizationResponse(timestamp: string, rawBodyBuffer: Buffer): string {
    return this.computeSignature(timestamp, this.transactionAuthzEndpoint, rawBodyBuffer);
  }

  async adjustTransaction(request: PomeloTransactionAdjustmentRequest): Promise<PomeloTransactionAuthzResponse> {
    const expectedAdjustmentEndpoint = `${this.transactionAdjustmentEndpointPrefix}/${request.adjustmentType}`;
    if (request.endpoint !== expectedAdjustmentEndpoint) {
      this.logger.error(
        `'endpoint' mismatch. Received '${request.endpoint}' and expected '${expectedAdjustmentEndpoint}'`,
      );
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    const expectedSignature = this.computeSignature(
      request.timestamp,
      expectedAdjustmentEndpoint,
      request.rawBodyBuffer,
    );
    // TODO: Check if it is cryptographically safe to return a "valid" response
    if (!this.verifySignature(request.rawSignature, expectedSignature)) {
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    try {
      const pomeloTransaction: PomeloTransaction = await this.getOrCreatePomeloTransaction({
        pomeloTransactionID: request.pomeloTransactionID,
        parentPomeloTransactionID: request.pomeloOriginalTransactionID,
        localAmount: request.localAmount,
        localCurrency: request.localCurrency,
        amountInUSD: request.settlementAmount,
        nobaTransactionID: uuid(),
        pomeloCardID: request.pomeloCardID,
        pomeloIdempotencyKey: request.idempotencyKey,
        countryCode: request.countryCode,
        entryMode: request.entryMode,
        origin: request.origin,
        pointType: request.pointType,
        pomeloTransactionType: request.transactionType,
        pomeloUserID: request.pomeloUserID,
        settlementAmount: request.settlementAmount,
        settlementCurrency: request.settlementCurrency,
        transactionAmount: request.transactionAmount,
        transactionCurrency: request.transactionCurrency,
        source: request.source,
        merchantName: request.merchantName,
        merchantMCC: request.merchantMCC,
      });
      if (pomeloTransaction.status !== PomeloTransactionStatus.PENDING) {
        const detailAuthzStatus: PomeloTransactionAuthzDetailStatus =
          this.nobaPomeloStatusToPublicDetailStatusMap[pomeloTransaction.status];
        return this.prepareAuthorizationResponse(detailAuthzStatus);
      }

      const nobaConsumerID = await this.getNobaConsumerIDHoldingPomeloCard(
        pomeloTransaction.pomeloCardID,
        request.pomeloUserID,
      );
      const circleWalletID: string = await this.circleService.getOrCreateWallet(nobaConsumerID);
      const parentNobaTransaction: Transaction = await this.getParentNobaTransaction(
        request.pomeloOriginalTransactionID,
      );
      const exchangeRate: number = parentNobaTransaction.exchangeRate;
      const amountInUSD =
        parentNobaTransaction.workflowName === WorkflowName.CARD_WITHDRAWAL
          ? parentNobaTransaction.debitAmount
          : parentNobaTransaction.debitAmount || parentNobaTransaction.creditAmount;

      switch (request.adjustmentType) {
        case PomeloAdjustmentType.CREDIT:
          break;

        case PomeloAdjustmentType.DEBIT:
          const walletBalanceInUSD: number = await this.circleService.getWalletBalance(circleWalletID);
          if (walletBalanceInUSD < amountInUSD) {
            await this.pomeloRepo.updatePomeloTransactionStatus(
              pomeloTransaction.pomeloTransactionID,
              PomeloTransactionStatus.INSUFFICIENT_FUNDS,
            );
            return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);
          }
          break;
      }

      const nobaTransaction: Transaction = await this.getOrCreateCardWithdrawalNobaTransaction(
        {
          type: WorkflowName.CARD_REVERSAL,
          cardReversalRequest: {
            amountInUSD: amountInUSD,
            consumerID: nobaConsumerID,
            type: this.adjustmentTypeToCardReversalTypeMap[request.adjustmentType],
            exchangeRate: exchangeRate,
            nobaTransactionID: pomeloTransaction.nobaTransactionID,
            memo: `Transfer of ${request.localAmount} ${request.localCurrency} to ${request.merchantName}`,
          },
        },
        pomeloTransaction.nobaTransactionID,
      );

      let fundTransferStatus: UpdateWalletBalanceServiceDTO;
      switch (request.adjustmentType) {
        case PomeloAdjustmentType.CREDIT:
          fundTransferStatus = await this.circleService.creditWalletBalance(
            nobaTransaction.id,
            circleWalletID,
            amountInUSD,
          );
          break;

        case PomeloAdjustmentType.DEBIT:
          fundTransferStatus = await this.circleService.debitWalletBalance(
            nobaTransaction.id,
            circleWalletID,
            amountInUSD,
          );
          break;
      }

      if (fundTransferStatus.status === CircleTransferStatus.INSUFFICIENT_FUNDS) {
        await this.pomeloRepo.updatePomeloTransactionStatus(
          pomeloTransaction.pomeloTransactionID,
          PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        );
        return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);
      } else if (fundTransferStatus.status === CircleTransferStatus.TRANSFER_FAILED) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: "Circle Transfer failed.",
        });
      } else {
        await this.pomeloRepo.updatePomeloTransactionStatus(
          pomeloTransaction.pomeloTransactionID,
          PomeloTransactionStatus.APPROVED,
        );
        return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.APPROVED);
      }
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR);
    }
  }

  signTransactionAdjustmentResponse(
    timestamp: string,
    rawBodyBuffer: Buffer,
    adjustmentType: PomeloAdjustmentType,
  ): string {
    const adjustmentEndpoint = `${this.transactionAdjustmentEndpointPrefix}/${adjustmentType}`;
    return this.computeSignature(timestamp, adjustmentEndpoint, rawBodyBuffer);
  }

  private prepareAuthorizationResponse(
    detailedStatus: PomeloTransactionAuthzDetailStatus,
  ): PomeloTransactionAuthzResponse {
    const response: PomeloTransactionAuthzResponse = {
      detailedStatus: detailedStatus,
      summaryStatus: this.detailStatusToSummaryStatusMap[detailedStatus],
      message: "",
    };
    return response;
  }

  private verifySignature(receivedSignature: string, expectedSignature: string): boolean {
    if (!receivedSignature.startsWith("hmac-sha256")) {
      this.logger.error(`Unsupported signature algorithm, expecting hmac-sha256, got ${receivedSignature}`);
      return false;
    }

    receivedSignature = receivedSignature.replace("hmac-sha256 ", "");
    expectedSignature = expectedSignature.replace("hmac-sha256 ", "");

    const receivedSignatureBytes = Buffer.from(receivedSignature, "base64"); // bytes representation
    const expectedSignatureBytes = Buffer.from(expectedSignature, "base64"); // bytes representation

    // compare signatures using a cryptographically secure function
    const signaturesMatch = timingSafeEqual(receivedSignatureBytes, expectedSignatureBytes);
    if (!signaturesMatch) {
      this.logger.info(`Signature mismatch. Received ${receivedSignature}, calculated ${expectedSignature}`);
      return false;
    }
    return true;
  }

  private computeSignature(timestamp: string, endpoint: string, rawBodyBuffer: Buffer): string {
    const hash = createHmac("sha256", this.pomeloApiSecret)
      .update(timestamp)
      .update(endpoint)
      .update(rawBodyBuffer)
      .digest("base64");

    return `hmac-sha256 ${hash}`;
  }

  private async getOrCreatePomeloTransaction(request: PomeloTransactionSaveRequest): Promise<PomeloTransaction> {
    let pomeloTransaction: PomeloTransaction;
    try {
      pomeloTransaction = await this.pomeloRepo.createPomeloTransaction(request);
    } catch (err) {
      pomeloTransaction = await this.pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(
        request.pomeloIdempotencyKey,
      );
      if (pomeloTransaction === null) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: "Error while fetching the existing PomeloTransaction",
        });
      }
    }

    return pomeloTransaction;
  }

  private async getOrCreateCardWithdrawalNobaTransaction(
    request: InitiateTransactionRequest,
    nobaTransactionID: string,
  ): Promise<Transaction> {
    let nobaTransaction: Transaction;
    try {
      nobaTransaction = await this.transactionService.validateAndSaveTransaction(request);
    } catch (err) {
      nobaTransaction = await this.transactionService.getTransactionByTransactionID(nobaTransactionID);
      if (nobaTransaction === null) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: "Error while fetching Noba Transaction after creating it",
        });
      }
    }
    return nobaTransaction;
  }

  private async getNobaConsumerIDHoldingPomeloCard(pomeloCardID: string, pomeloUserID: string): Promise<string> {
    const nobaConsumerID = await this.pomeloRepo.getNobaConsumerIDHoldingPomeloCard(pomeloCardID, pomeloUserID);
    if (!nobaConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Requested card '${pomeloCardID}' doesn't belong to the specified pomeloUserID: '${pomeloUserID}' or doesn't exist`,
      });
    }

    return nobaConsumerID;
  }

  private async getCOPEquivalentUSDAmountToDeduct(copAmount: number): Promise<{
    amountInUSD: number;
    exchangeRate: number;
  }> {
    const exchangeRate: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      Currency.USD,
      Currency.COP,
    );
    return {
      amountInUSD: Utils.roundTo2DecimalNumber(copAmount / exchangeRate.nobaRate),
      exchangeRate: 1 / exchangeRate.nobaRate,
    };
  }

  private async getParentNobaTransaction(parentPomeloTransactionID: string): Promise<Transaction> {
    const parentPomeloTransaction: PomeloTransaction = await this.pomeloRepo.getPomeloTransactionByPomeloTransactionID(
      parentPomeloTransactionID,
    );
    if (!parentPomeloTransaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Parent PomeloTransaction with ID '${parentPomeloTransactionID}' is not found`,
      });
    }
    const parentNobaTransaction: Transaction = await this.transactionService.getTransactionByTransactionID(
      parentPomeloTransaction.nobaTransactionID,
    );
    if (!parentNobaTransaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Parent NobaTransaction with ID '${parentPomeloTransaction.nobaTransactionID}' is not found`,
      });
    }

    return parentNobaTransaction;
  }
}
