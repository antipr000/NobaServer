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
} from "../dto/pomelo.transaction.service.dto";
import { createHmac, timingSafeEqual } from "crypto";
import { Logger } from "winston";
import { TransactionService } from "../../transaction/transaction.service";
import { PomeloTransaction, PomeloTransactionStatus } from "../domain/PomeloTransaction";
import { PomeloRepo } from "../repos/pomelo.repo";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { uuid } from "uuidv4";
import { CircleService } from "../../../modules/circle/public/circle.service";
import { InitiateTransactionRequest } from "../../../modules/transaction/dto/transaction.service.dto";
import { WorkflowName } from "../../../infra/temporal/workflow";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";
import { ExchangeRateDTO } from "../../../modules/common/dto/ExchangeRateDTO";
import { Transaction } from "../../../modules/transaction/domain/Transaction";
import { UpdateWalletBalanceServiceDTO } from "../../../modules/psp/domain/UpdateWalletBalanceServiceDTO";
import { CircleWithdrawalStatus } from "../../../modules/psp/domain/CircleTypes";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class PomeloTransactionService {
  private readonly transactionAuthzEndpoint = "/transactions/authorizations";
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
      const pomeloTransaction: PomeloTransaction = await this.getOrCreatePomeloTransaction(request);
      if (pomeloTransaction.status !== PomeloTransactionStatus.PENDING) {
        const detailAuthzStatus: PomeloTransactionAuthzDetailStatus =
          this.nobaPomeloStatusToPublicDetailStatusMap[pomeloTransaction.status];
        return this.prepareAuthorizationResponse(detailAuthzStatus);
      }

      const nobaConsumerID = await this.pomeloRepo.getNobaConsumerIDHoldingPomeloCard(
        pomeloTransaction.pomeloCardID,
        request.pomeloUserID,
      );
      if (!nobaConsumerID) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: `Requested card '${pomeloTransaction.pomeloCardID}' doesn't belong to the specified pomeloUserID: '${request.pomeloUserID}'`,
        });
      }

      const circleWalletID: string = await this.circleService.getOrCreateWallet(nobaConsumerID);
      const walletBalanceInUSD: number = await this.circleService.getWalletBalance(circleWalletID);

      const exchangeRate: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
        Currency.USD,
        Currency.COP,
      );

      const amountToDebitInUSD = Utils.roundTo2DecimalNumber(
        pomeloTransaction.amountInLocalCurrency / exchangeRate.nobaRate,
      );

      if (walletBalanceInUSD < amountToDebitInUSD) {
        await this.pomeloRepo.updatePomeloTransactionStatus(
          pomeloTransaction.pomeloTransactionID,
          PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        );
        return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);
      }

      const nobaTransaction: Transaction = await this.getOrCreateCardWithdrawalNobaTransaction({
        type: WorkflowName.CARD_WITHDRAWAL,
        cardWithdrawalRequest: {
          debitAmountInUSD: amountToDebitInUSD,
          debitConsumerID: nobaConsumerID,
          exchangeRate: exchangeRate.nobaRate,
          nobaTransactionID: pomeloTransaction.nobaTransactionID,
          memo: `Transfer of ${request.localAmount} ${request.localCurrency} to ${request.merchantName}`,
        },
      });

      const fundTransferStatus: UpdateWalletBalanceServiceDTO = await this.circleService.debitWalletBalance(
        nobaTransaction.id,
        circleWalletID,
        nobaTransaction.debitAmount,
      );
      // TODO: Return more granular status from Circle service and return an appropriate error.
      if (fundTransferStatus.status === CircleWithdrawalStatus.FAILURE) {
        await this.pomeloRepo.updatePomeloTransactionStatus(
          pomeloTransaction.pomeloTransactionID,
          PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        );
        return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS);
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

  signTransactionAuthorizationResponse(timestamp: string, rawBodyBuffer: Buffer): string {
    return this.computeSignature(timestamp, this.transactionAuthzEndpoint, rawBodyBuffer);
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

  private async getOrCreatePomeloTransaction(request: PomeloTransactionAuthzRequest): Promise<PomeloTransaction> {
    let pomeloTransaction: PomeloTransaction;
    try {
      const nobaTransactionID = uuid();

      pomeloTransaction = await this.pomeloRepo.createPomeloTransaction({
        pomeloTransactionID: request.pomeloTransactionID,
        amountInLocalCurrency: request.localAmount,
        localCurrency: request.localCurrency,
        amountInUSD: request.settlementAmount,
        nobaTransactionID: nobaTransactionID,
        pomeloCardID: request.pomeloCardID,
        pomeloIdempotencyKey: request.idempotencyKey,
      });
    } catch (err) {
      pomeloTransaction = await this.pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(request.idempotencyKey);
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
    cardWithdrawalRequest: InitiateTransactionRequest,
  ): Promise<Transaction> {
    let nobaTransaction: Transaction;
    try {
      nobaTransaction = await this.transactionService.initiateTransaction(cardWithdrawalRequest);
    } catch (err) {
      nobaTransaction = await this.transactionService.getTransactionByTransactionID(
        cardWithdrawalRequest.cardWithdrawalRequest.nobaTransactionID,
      );
      if (nobaTransaction === null) {
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: "Error while fetching Noba Transaction after creating it",
        });
      }
    }
    return nobaTransaction;
  }
}
