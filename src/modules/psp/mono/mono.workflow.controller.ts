import { Body, Controller, Get, Headers, HttpStatus, Inject, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";
import { MonoService } from "./mono.service";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";

@Controller() // This defines the path prefix
@ApiTags("Workflow")
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
}
