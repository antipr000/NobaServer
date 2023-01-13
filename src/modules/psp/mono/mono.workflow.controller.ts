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
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";
import { MonoService } from "./mono.service";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";

@Controller("wf/v1/mono") // This defines the path prefix
@ApiTags("Mono") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
export class MonoWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoService: MonoService,
    private readonly monoWorkflowControllerMappers: MonoWorkflowControllerMappers,
  ) {}

  @Post("/webhooks")
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

  @Get("/:collectionLinkID")
  @ApiOperation({ summary: "Fetches the Mono Transaction for the specified 'collectionLinkID'" })
  @ApiResponse({ status: HttpStatus.OK, type: MonoTransactionDTO })
  async getMonoTransaction(@Param("collectionLinkID") collectionLinkID: string) {
    const monoTransaction: MonoTransaction = await this.monoService.getTransactionByCollectionLinkID(collectionLinkID);
    if (!monoTransaction) {
      throw new NotFoundException(`Mono Transaction not found for collectionLinkID: ${collectionLinkID}`);
    }

    return this.monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);
  }
}
