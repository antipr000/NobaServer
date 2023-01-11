import { BadRequestException, Body, Controller, HttpStatus, Inject, Param, Patch } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { TransactionService } from "./transaction.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionMapper } from "./mapper/transaction.mapper";
import { LimitsService } from "./limits.service";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { TransactionDTO, UpdateTransactionDTO } from "./dto/TransactionDTO";

@Controller("wf/v1")
@ApiTags("Workflow")
@IsNoApiKeyNeeded()
export class TransactionWorkflowController {
  @Inject()
  private readonly transactionService: TransactionService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly limitsService: LimitsService;

  private readonly mapper: TransactionMapper;

  constructor() {
    this.mapper = new TransactionMapper();
  }

  @Patch("/transactions/:transactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Updates the transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  @ApiBadRequestResponse({ description: "Improper or misformatted request" })
  async patchTransaction(
    @Body() requestBody: UpdateTransactionDTO,
    @Param("transactionID") transactionID: string,
  ): Promise<TransactionDTO> {
    if (!requestBody.transactionEvent && !requestBody.status) {
      throw new BadRequestException("Nothing to update");
    }

    if (requestBody.transactionEvent) {
      await this.transactionService.addTransactionEvent(transactionID, requestBody.transactionEvent);
    }

    const updatedTransaction = await this.transactionService.updateTransaction(transactionID, requestBody);
    return this.mapper.toDTO(updatedTransaction);
  }
}
