import { Controller, Get, HttpStatus, Inject, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloTransactionDTO, PomeloTransactionsDTO } from "../dto/pomelo.workflow.controller.dto";
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

  @Get("/users/:pomeloUserID/transactions")
  @ApiOperation({
    summary:
      "Returns PomeloTransactions for 'pomeloUserID' happened on 'settlementDate'. 'settlementDate' should be in format 'YYYY-MM-DD'",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PomeloTransactionsDTO,
  })
  async getPomeloUserTransasctions(
    @Param("pomeloUserID") pomeloUserID: string,
    @Query("settlementDate") settlementDate: string,
  ): Promise<PomeloTransactionsDTO> {
    const pomeloTransactions: PomeloTransaction[] =
      await this.pomeloWorkflowService.getPomeloUserTransactionsForSettlementDate(pomeloUserID, settlementDate);

    return {
      transactions: pomeloTransactions.map(txn => this.pomeloWorkflowMapper.mapToPomeloTransactionDTO(txn)),
    };
  }
}
