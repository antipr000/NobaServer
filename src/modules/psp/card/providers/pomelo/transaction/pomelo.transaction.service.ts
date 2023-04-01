import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PomeloConfigs } from "../../../../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../../../../core/utils/AppConfigModule";
import {
  PomeloTransactionAuthzResponse,
  PomeloTransactionAuthzDetailStatus,
  PomeloTransactionAuthzSummaryStatus,
  PomeloTransactionAuthzRequest,
} from "../dto/pomelo.transaction.service.dto";
import { createHmac, timingSafeEqual } from "crypto";
import { Logger } from "winston";
import { TransactionService } from "../../../../../../modules/transaction/transaction.service";
import { PomeloService } from "../pomelo.service";
import { CircleService } from "../../../../../../modules/psp/circle.service";
import { PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloRepo } from "../repos/pomelo.repo";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { uuid } from "uuidv4";

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
  private pomeloApiSecret: Buffer;

  constructor(
    private configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly transactionService: TransactionService,
    private readonly pomeloService: PomeloService,
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
      this.logger.info(
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

    // let pomeloTransaction: PomeloTransaction;
    // try {
    //   const nobaTransactionID = uuid();

    //   pomeloTransaction = await this.pomeloRepo.createPomeloTransaction({
    //     pomeloTransactionID: request.pomeloTransactionID,
    //     amountInLocalCurrency: request.localAmount,
    //     localCurrency: request.localCurrency,
    //     amountInUSD: request.settlementAmount,
    //     nobaTransactionID: nobaTransactionID,
    //     pomeloCardID: request.pomeloCardID,
    //     pomeloIdempotencyKey: "",
    //   });
    // }
    // catch (err) {
    //   const
    // }
    return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.APPROVED);
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
}
