import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Inject,
  Post,
  Response,
  Req,
  RawBodyRequest,
  Param,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IsNoApiKeyNeeded } from "../../auth/public.decorator";
import {
  PomeloAdjustmentType,
  PomeloTransactionAdjustmentRequest,
  PomeloTransactionAuthzRequest,
  PomeloTransactionAuthzResponse,
} from "../dto/pomelo.transaction.service.dto";
import { PomeloTransactionService } from "./pomelo.webhook.service";
import { PomeloWebhookMapper } from "./pomelo.webhook.mapper";

@Controller("/webhooks/pomelo")
@ApiTags("Webhooks")
@IsNoApiKeyNeeded()
export class PomeloTransactionWebhookController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly mapper: PomeloWebhookMapper,
    private readonly pomeloTransactionService: PomeloTransactionService,
  ) {}

  @Post("/transactions/authorizations")
  @ApiOperation({ summary: "Authorize the Pomelo Transaction" })
  @ApiResponse({ status: HttpStatus.OK })
  async authorizeTransactions(
    @Req() request: RawBodyRequest<ExpressRequest>,
    @Response() rawResponse,
    @Body() requestBody: Record<string, any>,
    @Headers() headers: Record<string, any>,
  ) {
    const parsedRequest: PomeloTransactionAuthzRequest = this.mapper.convertToPomeloTransactionAuthzRequest(
      requestBody,
      headers,
    );
    parsedRequest.rawBodyBuffer = request.rawBody;

    const serviceResponse: PomeloTransactionAuthzResponse = await this.pomeloTransactionService.authorizeTransaction(
      parsedRequest,
    );
    const result = {
      status: serviceResponse.summaryStatus,
      message: serviceResponse.message,
      status_detail: serviceResponse.detailedStatus,
    };

    const responseTimestamp = "" + Math.floor(Date.now() / 1000);
    return rawResponse
      .set({
        "X-Endpoint": "/transactions/authorizations",
        "X-Timestamp": responseTimestamp,
        "X-Signature": this.pomeloTransactionService.signTransactionAuthorizationResponse(
          responseTimestamp,
          Buffer.from(JSON.stringify(result)),
        ),
      })
      .json(result);
  }

  @Post("/transactions/adjustments/:type")
  @ApiOperation({ summary: "Authorize the Pomelo Transaction" })
  @ApiResponse({ status: HttpStatus.OK })
  async adjustTransactions(
    @Req() request: RawBodyRequest<ExpressRequest>,
    @Response() rawResponse,
    @Body() requestBody: Record<string, any>,
    @Headers() headers: Record<string, any>,
    @Param("type") adjustmentType: string,
  ) {
    const parsedRequest: PomeloTransactionAdjustmentRequest = this.mapper.convertToPomeloTransactionAdjustmentRequest(
      requestBody,
      headers,
      adjustmentType,
    );
    parsedRequest.rawBodyBuffer = request.rawBody;

    const serviceResponse: PomeloTransactionAuthzResponse = await this.pomeloTransactionService.adjustTransaction(
      parsedRequest,
    );
    const result = {
      status: serviceResponse.summaryStatus,
      message: serviceResponse.message,
      status_detail: serviceResponse.detailedStatus,
    };

    const responseTimestamp = "" + Math.floor(Date.now() / 1000);
    return rawResponse
      .set({
        "X-Endpoint": `/transactions/adjustments/${adjustmentType}`,
        "X-Timestamp": responseTimestamp,
        "X-Signature": this.pomeloTransactionService.signTransactionAdjustmentResponse(
          responseTimestamp,
          Buffer.from(JSON.stringify(result)),
          adjustmentType as PomeloAdjustmentType,
        ),
      })
      .json(result);
  }
}
