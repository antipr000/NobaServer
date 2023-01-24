import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Request,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IsNoApiKeyNeeded } from "../../../modules/auth/public.decorator";
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoWithdrawlRequestDTO, MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";
import { MonoService } from "./mono.service";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";

@Controller() // This defines the path prefix
@ApiTags("Workflow")
@IsNoApiKeyNeeded()
export class MonoWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoService: MonoService,
    private readonly monoWorkflowControllerMappers: MonoWorkflowControllerMappers,
  ) {}

  @Post("/webhooks/mono")
  @ApiTags("Vendors")
  @ApiOperation({ summary: "Handle all the Mono Webhook requests" })
  @ApiResponse({ status: HttpStatus.CREATED })
  async processWebhookRequests(
    @Body() requestBody: Record<string, any>,
    @Headers("mono-signature") monoSignature: string,
  ) {
    this.logger.info(`Mono Webhook request received: ${JSON.stringify(requestBody)}`);
    await this.monoService.processWebhookEvent(requestBody, monoSignature);
  }

  @Get("/wf/v1/mono/nobatransactions/:nobaTransactionID")
  @ApiOperation({ summary: "Fetches the Mono Transaction for the specified 'nobaTransactionID'" })
  @ApiResponse({ status: HttpStatus.OK, type: MonoTransactionDTO })
  async getMonoTransactionByNobaTransactionID(@Param("nobaTransactionID") nobaTransactionID: string) {
    const monoTransaction: MonoTransaction = await this.monoService.getTransactionByNobaTransactionID(
      nobaTransactionID,
    );
    if (!monoTransaction) {
      throw new NotFoundException(`Mono Transaction not found for nobaTransactionID: ${nobaTransactionID}`);
    }

    return this.monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);
  }

  @Post("/wf/v1/mono/withdrawl")
  @ApiOperation({ summary: "Withdraw money from Noba Mono account into consumer account" })
  @ApiResponse({ status: HttpStatus.OK }) // What should be returned?
  async withdrawFromNoba(@Body() request: MonoWithdrawlRequestDTO) {
    const res = await this.monoService.withdrawFromNoba({
      transactionID: request.transactionID,
      transactionRef: request.transactionRef,
      amount: request.amount,
      currency: request.currency,
      bankCode: request.bankCode,
      accountNumber: request.accountNumber,
      accountType: request.accountType,
      documentNumber: request.documentNumber,
      documentType: request.documentType,
      consumerID: request.consumerID,
    });

    return res;
  }
}
