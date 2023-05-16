import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
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
import {
  CreateTransactionDTO,
  DebitBankRequestDTO,
  WorkflowTransactionDTO,
} from "./dto/transaction.workflow.controller.dto";
import { DebitBankResponse, Transaction, TransactionStatus } from "./domain/Transaction";
import { TransactionWorkflowMapper } from "./mapper/transaction.workflow.mapper";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { TransactionEvent } from "./domain/TransactionEvent";
import { ServiceErrorCode, ServiceException } from "../../../src/core/exception/service.exception";
import { WorkflowName } from "../../infra/temporal/workflow";
import { InitiateTransactionRequest } from "./dto/transaction.service.dto";

@Controller("wf/v1/transactions")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class TransactionWorkflowController {
  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly transactionWorkflowMapper: TransactionWorkflowMapper;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Post("/")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Creates a transaction from disbursement" })
  @ApiResponse({
    description: "Transaction created",
    status: HttpStatus.CREATED,
    type: WorkflowTransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested disbursement is not found" })
  @ApiBadRequestResponse({ description: "Failed to create transaction" })
  async createTransaction(@Body() requestBody: CreateTransactionDTO): Promise<WorkflowTransactionDTO> {
    const transaction = await this.transactionService.initiateTransaction(
      this.convertToInitiateTransactionRequest(requestBody),
    );
    return this.transactionWorkflowMapper.toWorkflowTransactionDTO(transaction, []);
  }

  @Patch("/:transactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Updates the transaction" })
  @ApiResponse({
    description: "Transaction updated",
    status: HttpStatus.OK,
    type: BlankResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  @ApiBadRequestResponse({ description: "Improper or misformatted request" })
  async patchTransaction(
    @Body() requestBody: UpdateTransactionRequestDTO,
    @Param("transactionID") transactionID: string,
  ): Promise<BlankResponseDTO> {
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
    return {};
  }

  @Get("/:transactionID")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Fetches the transaction for the specified 'transactionID'" })
  @ApiResponse({ status: HttpStatus.OK, type: WorkflowTransactionDTO })
  async getTransactionByTransactionID(@Param("transactionID") transactionID: string): Promise<WorkflowTransactionDTO> {
    const transaction: Transaction = await this.transactionService.getTransactionByTransactionID(transactionID);
    const transactionEvents: TransactionEvent[] = await this.transactionService.getTransactionEvents(
      transaction.id,
      /*includeInternalEvents=*/ true,
    );

    return this.transactionWorkflowMapper.toWorkflowTransactionDTO(transaction, transactionEvents);
  }

  @Post("/debitfrombank")
  @ApiTags("Workflow")
  @ApiOperation({ summary: "Debit money from Noba bank account into consumer account" })
  @ApiResponse({ status: HttpStatus.OK, type: WorkflowTransactionDTO })
  async debitFromBank(@Body() requestBody: DebitBankRequestDTO): Promise<DebitBankResponse> {
    try {
      return await this.transactionService.debitFromBank(requestBody.transactionID);
    } catch (e) {
      if (e instanceof ServiceException && e.errorCode === ServiceErrorCode.ALREADY_EXISTS) {
        this.logger.error(`Error while debiting from bank: ${e.message}`);
        throw new ConflictException(e.message);
      }
    }
  }

  private convertToInitiateTransactionRequest(request: CreateTransactionDTO): InitiateTransactionRequest {
    return {
      type: request.transactionType,
      ...(request.payrollTransactionRequest && {
        payrollDepositRequest: {
          disbursementID: request.payrollTransactionRequest.disbursementID,
        },
      }),
      ...(request.pomeloTransactionRequest && {}),
    };
  }
}
