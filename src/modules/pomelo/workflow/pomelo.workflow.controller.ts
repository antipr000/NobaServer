import { Controller, Get, HttpStatus, Inject, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloTransactionDTO } from "../dto/pomelo.workflow.controller.dto";
import { PomeloWorkflowMapper } from "./pomelo.workflow.mapper";
import { PomeloWorkflowService } from "./pomelo.workflow.service";

@Controller("wf/v1/pomelo")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class PomeloWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly pomeloWorkflowService: PomeloWorkflowService,
    private readonly pomeloWorkflowMapper: PomeloWorkflowMapper,
  ) {}

  @Get("/transactions/:pomeloTransactionID")
  @ApiOperation({ summary: "Fetches a Pomelo Transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PomeloTransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested Transaction is not found" })
  async getPomeloTransasction(
    @Param("pomeloTransactionID") pomeloTransactionID: string,
  ): Promise<PomeloTransactionDTO> {
    const pomeloTransaction: PomeloTransaction =
      await this.pomeloWorkflowService.getPomeloTransactionByPomeloTransactionID(pomeloTransactionID);
    if (!pomeloTransaction) {
      throw new NotFoundException(`PomeloTransaction with ID '${pomeloTransactionID}' not found.`);
    }

    return this.pomeloWorkflowMapper.mapToPomeloTransactionDTO(pomeloTransaction);
  }
}
