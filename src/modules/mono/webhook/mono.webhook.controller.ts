import { Body, Controller, Get, Headers, HttpStatus, Inject, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoWebhookService } from "./mono.webhook.service";

@Controller("/webhooks")
export class MonoWebhookController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoWebhookService: MonoWebhookService,
  ) {}

  @Post("/mono")
  @ApiTags("Webhooks")
  @ApiOperation({ summary: "Handle all the Mono Webhook requests" })
  @ApiResponse({ status: HttpStatus.CREATED })
  async processWebhookRequests(
    @Body() requestBody: Record<string, any>,
    @Headers("mono-signature") monoSignature: string,
  ) {
    this.logger.info(`Mono Webhook request received: ${JSON.stringify(requestBody)}`);
    await this.monoWebhookService.processWebhookEvent(requestBody, monoSignature);
  }
}
