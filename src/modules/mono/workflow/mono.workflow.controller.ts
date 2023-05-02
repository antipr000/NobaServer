import { Controller, Get, HttpStatus, Inject, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoTransaction } from "../domain/Mono";
import { MonoTransactionDTO } from "../dto/mono.workflow.controller.dto";
import { MonoService } from "../public/mono.service";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";

@Controller("/wf/v1") // This defines the path prefix
export class MonoWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly monoService: MonoService,
    private readonly monoWorkflowControllerMappers: MonoWorkflowControllerMappers,
  ) {}

  @Get("/mono/nobatransactions/:nobaTransactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Fetches the Mono Transaction for the specified 'nobaTransactionID'" })
  @ApiResponse({ status: HttpStatus.OK, type: MonoTransactionDTO })
  async getMonoTransactionByNobaTransactionID(
    @Param("nobaTransactionID") nobaTransactionID: string,
  ): Promise<MonoTransactionDTO> {
    const monoTransaction: MonoTransaction = await this.monoService.getTransactionByNobaTransactionID(
      nobaTransactionID,
    );
    if (!monoTransaction) {
      throw new NotFoundException(`Mono Transaction not found for nobaTransactionID: ${nobaTransactionID}`);
    }

    return this.monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);
  }
}
