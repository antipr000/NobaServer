import { Body, Controller, Get, HttpStatus, Inject, NotFoundException, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";

import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { TransactionService } from "./transaction.service";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { AuthUser } from "../auth/auth.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionFilterOptionsDTO } from "./dto/TransactionFilterOptionsDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TRANSACTION_MAPPING_SERVICE_PROVIDER, TransactionMappingService } from "./mapper/transaction.mapper.service";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";
import { CheckTransactionQueryDTO } from "./dto/CheckTransactionQueryDTO";
import { LimitsService } from "./limits.service";
import { ConsumerLimitsQueryDTO } from "./dto/ConsumerLimitsQueryDTO";
import { ConsumerLimitsDTO } from "./dto/ConsumerLimitsDTO";
import { TransactionType } from "@prisma/client";
import { TransactionQueryResultDTO } from "./dto/TransactionQueryResultDTO";
import { QuoteResponseDTO } from "./dto/QuoteResponseDTO";
import { QuoteRequestDTO } from "./dto/QuoteRequestDTO";
import { Public } from "../auth/public.decorator";
import { IncludeEventTypes } from "./dto/TransactionEventDTO";
import { TransactionEvent } from "./domain/TransactionEvent";
import { Transaction } from "./domain/Transaction";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v2")
@ApiHeaders(getCommonHeaders())
export class TransactionController {
  @Inject()
  private readonly transactionService: TransactionService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly limitsService: LimitsService;

  @Inject(TRANSACTION_MAPPING_SERVICE_PROVIDER)
  private readonly transactionMapper: TransactionMappingService;

  @Get("/transactions/")
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Get all transactions for logged in user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionQueryResultDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getAllTransactions(
    @Query() filters: TransactionFilterOptionsDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<TransactionQueryResultDTO> {
    filters.consumerID = consumer.props.id;
    filters.pageLimit = Number(filters.pageLimit) || 10;
    filters.pageOffset = Number(filters.pageOffset) || 1;
    const allTransactions = await this.transactionService.getFilteredTransactions(filters);

    if (allTransactions == null) return null;

    const transactions = allTransactions.items;

    const transactionDTOPromises: Promise<TransactionDTO>[] = transactions.map(
      async transaction => await this.transactionMapper.toTransactionDTO(transaction, consumer),
    );

    const transactionDTOs = await Promise.all(transactionDTOPromises);
    return {
      ...allTransactions,
      items: transactionDTOs,
    };
  }

  @Post("/transactions/")
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Submits a new transaction" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Transaction ID",
    type: TransactionDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async initiateTransaction(
    @Query("sessionKey") sessionKey: string,
    @Body() requestBody: InitiateTransactionDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<TransactionDTO> {
    this.logger.debug(`uid ${consumer.props.id}, transact input:`, JSON.stringify(requestBody));

    const transaction: Transaction = await this.transactionService.deprecatedInitiateTransaction(
      requestBody,
      consumer.props.id,
      sessionKey,
    );
    return this.transactionMapper.toTransactionDTO(transaction, consumer);
  }

  @Get("/transactions/quote")
  @Public()
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Gets a quote in specified currency" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: QuoteResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Quote for given currency not found" })
  async getQuote(@Query() quoteQuery: QuoteRequestDTO): Promise<QuoteResponseDTO> {
    return await this.transactionService.getTransactionQuote(
      quoteQuery.amount,
      quoteQuery.currency,
      quoteQuery.desiredCurrency,
      quoteQuery.workflowName,
      quoteQuery.options ?? [],
    );
  }

  @Get("/transactions/check")
  @ApiTags("Transaction")
  @ApiOperation({
    summary: "Checks if the transaction parameters are valid",
  })
  @ApiResponse({ status: HttpStatus.OK, type: CheckTransactionDTO })
  async checkIfTransactionPossible(
    @Query() checkTransactionQuery: CheckTransactionQueryDTO,
    @AuthUser() authUser: Consumer,
  ): Promise<CheckTransactionDTO> {
    const tAmount = checkTransactionQuery.transactionAmount;
    const checkTransactionResponse: CheckTransactionDTO = await this.limitsService.canMakeTransaction(
      authUser,
      tAmount,
      checkTransactionQuery.type,
    );

    return checkTransactionResponse;
  }

  @Get("/transactions/:transactionRef")
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Gets details of a transaction" })
  @ApiQuery({ name: "includeEvents", enum: IncludeEventTypes, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  async getTransaction(
    @Query("includeEvents") includeEvents: IncludeEventTypes,
    @Param("transactionRef") transactionRef: string,
    @AuthUser() consumer: Consumer,
  ): Promise<TransactionDTO> {
    const transaction = await this.transactionService.getTransactionByTransactionRef(transactionRef, consumer.props.id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ref: ${transactionRef} not found for user`);
    }

    let transactionEvents: TransactionEvent[];
    if (includeEvents && includeEvents !== IncludeEventTypes.NONE) {
      transactionEvents = await this.transactionService.getTransactionEvents(
        transaction.id,
        includeEvents === IncludeEventTypes.ALL,
      );
    }

    return await this.transactionMapper.toTransactionDTO(transaction, consumer, transactionEvents);
  }

  @Get("/consumers/limits/")
  @ApiTags("Consumer")
  @ApiOperation({ summary: "Gets transaction limit details for logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerLimitsDTO,
    description: "Consumer limit details",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getConsumerLimits(
    @Query() consumerLimitsQuery: ConsumerLimitsQueryDTO,
    @AuthUser() authUser: Consumer,
  ): Promise<ConsumerLimitsDTO> {
    if (!consumerLimitsQuery.transactionType) consumerLimitsQuery.transactionType = TransactionType.NOBA_WALLET;
    return this.limitsService.getConsumerLimits(authUser, consumerLimitsQuery.transactionType);
  }
}
