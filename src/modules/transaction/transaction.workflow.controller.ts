import { BadRequestException, Body, Controller, Get, HttpStatus, Inject, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TransactionService } from "./transaction.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UpdateTransactionRequestDTO } from "./dto/TransactionDTO";
import { DebitBankRequestDTO, WorkflowTransactionDTO } from "./dto/transaction.workflow.controller.dto";
import { Transaction } from "./domain/Transaction";
import { TransactionWorkflowMapper } from "./mapper/transaction.workflow.mapper";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";

@Controller("wf/v1/transactions")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
@IsNoApiKeyNeeded()
export class TransactionWorkflowController {
  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly transactionWorkflowMapper: TransactionWorkflowMapper;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Patch("/:transactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Updates the transaction" })
  @ApiResponse({
    description: "Transaction updated",
    status: HttpStatus.OK,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  @ApiBadRequestResponse({ description: "Improper or misformatted request" })
  async patchTransaction(
    @Body() requestBody: UpdateTransactionRequestDTO,
    @Param("transactionID") transactionID: string,
  ): Promise<void> {
    if (!requestBody.transactionEvent && !requestBody.status) {
      throw new BadRequestException("Nothing to update");
    }

    if (requestBody.transactionEvent) {
      await this.transactionService.addTransactionEvent(transactionID, requestBody.transactionEvent);
    }

    if (requestBody.status) {
      await this.transactionService.updateTransaction(transactionID, requestBody);
    }

    // No return as this method is intended to be called from a workflow. Also, if we returned
    // the transaction it would mean we would have to call updatTransaction or at least do a lookup
    // even if we are not updating any fields directly on the transaction (e.g. only adding events).
  }

  @Get("/:transactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Fetches the transaction for the specified 'transactionID'" })
  @ApiResponse({ status: HttpStatus.OK, type: WorkflowTransactionDTO })
  async getTransactionByTransactionID(@Param("transactionID") transactionID: string): Promise<WorkflowTransactionDTO> {
    const transaction: Transaction = await this.transactionService.getTransactionByTransactionID(transactionID);
    return this.transactionWorkflowMapper.toWorkflowTransactionDTO(transaction);
  }

  @Post("/debitFromBank")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Debit money from Noba bank account into consumer account" })
  @ApiResponse({ status: HttpStatus.OK, type: WorkflowTransactionDTO })
  async debitFromBank(@Body() requestBody: DebitBankRequestDTO) {
    return await this.transactionService.debitFromBank(requestBody);
  }
}
