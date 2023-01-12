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
import { TransactionMapper } from "./mapper/transaction.mapper";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";
import { CheckTransactionQueryDTO } from "./dto/CheckTransactionQueryDTO";
import { LimitsService } from "./limits.service";
import { ConsumerLimitsQueryDTO } from "./dto/ConsumerLimitsQueryDTO";
import { ConsumerLimitsDTO } from "./dto/ConsumerLimitsDTO";
import { TransactionType } from "@prisma/client";
import { TransactionsQueryResultDTO } from "./dto/TransactionQueryResultDTO";
import { QuoteResponseDTO } from "./dto/QuoteResponseDTO";
import { QuoteRequestDTO } from "./dto/QuoteRequestDTO";
import { Public } from "../auth/public.decorator";
import { IncludeEventTypes, TransactionEventDTO } from "./dto/TransactionEventDTO";

@Roles(Role.User)
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

  private readonly mapper: TransactionMapper;

  constructor() {
    this.mapper = new TransactionMapper();
  }

  @Get("/transactions/")
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Get all transactions for logged in user" })
  @ApiQuery({ name: "resolveTags", type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsQueryResultDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getAllTransactions(
    @Query() filters: TransactionFilterOptionsDTO,
    @Query("resolveTags") resolveTags: boolean,
    @AuthUser() consumer: Consumer,
  ): Promise<TransactionsQueryResultDTO> {
    filters.consumerID = consumer.props.id;
    filters.pageLimit = Number(filters.pageLimit) || 10;
    filters.pageOffset = Number(filters.pageOffset) || 1;
    const allTransactions = await this.transactionService.getFilteredTransactions(filters);

    if (allTransactions == null) return null;

    return {
      ...allTransactions,
      items: allTransactions.items.map(transaction =>
        this.mapper.toDTO(transaction, consumer.props.handle, resolveTags),
      ),
    };
  }

  @Post("/transactions/")
  @ApiTags("Transaction")
  @ApiOperation({ summary: "Submits a new transaction" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Transaction ID",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async initiateTransaction(
    @Query("sessionKey") sessionKey: string,
    @Body() requestBody: InitiateTransactionDTO,
    @AuthUser() consumer: Consumer,
  ) {
    this.logger.debug(`uid ${consumer.props.id}, transact input:`, JSON.stringify(requestBody));

    return await this.transactionService.initiateTransaction(requestBody, consumer.props.id, sessionKey);
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
    return await this.transactionService.calculateExchangeRate(
      quoteQuery.amount,
      quoteQuery.currency,
      quoteQuery.desiredCurrency,
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
  @ApiQuery({ name: "resolveTags", type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  async getTransaction(
    @Query("includeEvents") includeEvents: IncludeEventTypes,
    @Query("resolveTags") resolveTags: boolean,
    @Param("transactionRef") transactionRef: string,
    @AuthUser() consumer: Consumer,
  ): Promise<TransactionDTO> {
    const transaction = await this.transactionService.getTransactionByTransactionRef(transactionRef, consumer.props.id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ref: ${transactionRef} not found for user`);
    }

    let transactionEvents: TransactionEventDTO[];
    if (includeEvents && includeEvents !== IncludeEventTypes.NONE) {
      transactionEvents = await this.transactionService.getTransactionEvents(
        transaction.id,
        includeEvents === IncludeEventTypes.ALL,
      );
    }

    return this.mapper.toDTO(transaction, consumer.props.handle, resolveTags, transactionEvents);
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
