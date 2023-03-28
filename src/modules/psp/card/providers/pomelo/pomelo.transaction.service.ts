import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PomeloConfigs } from "../../../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../../../core/utils/AppConfigModule";
import { PomeloTransactionAuthzResponse, PomeloTransactionAuthzDetailStatus, PomeloTransactionAuthzSummaryStatus, PomeloTransactionAuthzRequest } from "./dto/pomelo.transaction.service.dto";
import { createHmac, timingSafeEqual } from "crypto";
import { Logger } from "winston";

@Injectable()
export class PomeloTransactionService {
  private readonly transactionAuthzEndpoint = "/transactions/authorizations";
  private readonly detailStatusToSummaryStatusMap: Record<PomeloTransactionAuthzDetailStatus, PomeloTransactionAuthzSummaryStatus> = {
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
  ) {
    // TODO: Check if the ApiKey & ClientSecret are same and we just need to handle encodings :)
    // this.pomeloApiSecret = Buffer.from(pomeloConfigs.clientSecret, "base64");
    const pomeloConfigs: PomeloConfigs = this.configService.get<PomeloConfigs>(POMELO_CONFIG_KEY);
    this.pomeloApiSecret = Buffer.from(pomeloConfigs.clientSecret, "utf8");
  }

  async authorizeTransaction(request: PomeloTransactionAuthzRequest): Promise<PomeloTransactionAuthzResponse> {
    if (request.endpoint !== this.transactionAuthzEndpoint) {
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    const expectedSignature = this.computeSignature(request.timestamp, request.rawBodyBuffer);
    // TODO: Check if it is cryptographically safe to return a "valid" response
    if (!this.verifySignature(request.rawSignature, expectedSignature)) {
      return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.OTHER);
    }

    return this.prepareAuthorizationResponse(PomeloTransactionAuthzDetailStatus.APPROVED);
  }

  private prepareAuthorizationResponse(detailedStatus: PomeloTransactionAuthzDetailStatus): PomeloTransactionAuthzResponse {
    const response: PomeloTransactionAuthzResponse = {
      detailedStatus: detailedStatus,
      summaryStatus: this.detailStatusToSummaryStatusMap[detailedStatus],
      message: "",
      endpoint: this.transactionAuthzEndpoint,
      timestamp: "" + Math.floor(Date.now() / 1000),
      signature: null,
    };

    response.signature = this.signTransactionAuthorizationResponse(response);
    return response;
  }

  private signTransactionAuthorizationResponse(result: PomeloTransactionAuthzResponse): string {
    const responseBody = this.convertToTransactionAuthzResponseStructure(result);
    const timestamp = result.timestamp;

    return this.computeSignature(timestamp, Buffer.from(JSON.stringify(responseBody)));
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
      this.logger.info(
        `Signature mismatch. Received ${receivedSignature}, calculated ${expectedSignature}`
      );
      return false;
    }
    return true;
  }

  private computeSignature(timestamp: string, rawBodyBuffer: Buffer): string {
    const hash = createHmac("sha256", this.pomeloApiSecret)
      .update(timestamp)
      .update(this.transactionAuthzEndpoint)
      .update(rawBodyBuffer)
      .digest("base64");

    return `hmac-sha256 ${hash}`;
  }

  // TODO: "balance" is required for BALANCE_ENQUIRY which is not supported for COL.
  private convertToTransactionAuthzResponseStructure(result: PomeloTransactionAuthzResponse): Record<string, any> {
    return {
      status: result.summaryStatus,
      message: result.message,
      status_detail: result.detailedStatus,
    };
  }
}