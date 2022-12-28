import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Response,
  Request,
  Headers,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import fs from "fs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { DownloadFormat, DownloadTransactionsDTO } from "./dto/DownloadTransactionsDTO";
import { TransactionFilterOptions, TransactionType } from "./domain/Types";

import { AuthUser } from "../auth/auth.decorator";
import { Public } from "../auth/public.decorator";
import { CsvService } from "../common/csv.service";
import { Consumer } from "../consumer/domain/Consumer";
import { CheckTransactionQueryDTO } from "./dto/CheckTransactionQueryDTO";
import { ConsumerBalanceDTO, ConsumerLimitsDTO } from "./dto/ConsumerLimitsDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { TransactionQuoteDTO } from "./dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "./dto/TransactionQuoteQueryDTO";
import { LimitsService } from "./limits.service";
import { TransactionService } from "./transaction.service";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { TransactionSubmissionException } from "./exceptions/TransactionSubmissionException";
import { TransactionsQueryResultsDTO } from "./dto/TransactionsQueryResultsDTO";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { ConsumerLimitsQueryDTO } from "./dto/ConsumerLimitsQueryDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("v1")
@ApiHeaders(getCommonHeaders())
export class TransactionController {
  // @Inject(WINSTON_MODULE_PROVIDER)
  // private readonly logger: Logger;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly limitsService: LimitsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Public()
  @Get("/transactions/quote")
  @ApiTags("Transactions")
  @ApiOperation({
    summary: "Get transaction quote (exchange rate, provider fees, network fees etc.)",
  })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionQuoteDTO })
  @ApiBadRequestResponse({ description: "Invalid currency code (fiat or crypto)" })
  @ApiServiceUnavailableResponse({ description: "Unable to connect to underlying service provider" })
  async getTransactionQuote(
    @Headers() headers,
    @Request() request,
    @Query() transactionQuoteQuery: TransactionQuoteQueryDTO,
  ): Promise<TransactionQuoteDTO> {
    const transactionQuote = await this.transactionService.requestTransactionQuote(transactionQuoteQuery);
    return transactionQuote;
  }

  @Get("/transactions/check")
  @ApiTags("Transactions")
  @ApiOperation({
    summary: "Checks if the transaction parameters are valid",
  })
  @ApiResponse({ status: HttpStatus.OK, type: CheckTransactionDTO })
  async checkIfTransactionPossible(
    @Query() checkTransactionQuery: CheckTransactionQueryDTO,
    @AuthUser() authUser: Consumer,
    @Request() request,
  ): Promise<CheckTransactionDTO> {
    const tAmount = checkTransactionQuery.transactionAmount;
    const checkTransactionResponse: CheckTransactionDTO = await this.limitsService.canMakeTransaction(
      authUser,
      tAmount,
      checkTransactionQuery.type,
    );

    return checkTransactionResponse;
  }

  @Get("/transactions/:transactionID")
  @ApiTags("Transactions")
  @ApiOperation({ summary: "Gets details of a transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
    description: "Details of a transaction",
  })
  @ApiNotFoundResponse({ description: "Transaction does not exist" })
  async getTransaction(
    @Request() request,
    @Param("transactionID") transactionID: string,
    @AuthUser() authUser: Consumer,
  ): Promise<TransactionDTO> {
    const dto = await this.transactionService.getTransaction(transactionID);
    return dto;
  }

  //We should create buy sell api differently otherwise lot of if else logic in core logic. basically different api for on-ramp and off-ramp
  @Post("/transactions/")
  @ApiTags("Transactions")
  @ApiOperation({ summary: "Submits a new transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Transaction ID",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async transact(
    @Request() request,
    @Query("sessionKey") sessionKey: string,
    @Body() orderDetails: CreateTransactionDTO,
    @AuthUser() user: Consumer,
  ): Promise<string> {
    this.logger.debug(`uid ${user.props.id}, transact input:`, orderDetails);

    try {
      return (await this.transactionService.initiateTransaction(user.props.id, sessionKey, orderDetails))._id;
    } catch (e) {
      if (e instanceof TransactionSubmissionException) {
        throw new BadRequestException(e.disposition, e.message);
      } else {
        this.logger.error(`Error in initiateTransaction: ${e.message}`);
        throw new BadRequestException("Failed to make the payment");
      }
    }
  }

  @Get("/transactions/")
  @ApiTags("Transactions")
  @ApiOperation({ summary: "Gets all transactions for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsQueryResultsDTO,
    description: "List of all transactions",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getTransactions(
    @Request() request,
    @Query() transactionFilters: TransactionFilterOptions,
    @AuthUser() authUser: Consumer,
  ): Promise<TransactionsQueryResultsDTO> {
    return (await this.transactionService.getUserTransactions(
      authUser.props.id,
      transactionFilters,
    )) as TransactionsQueryResultsDTO;
  }

  @Get("/consumers/balances/")
  @ApiTags("Consumer")
  @ApiOperation({ summary: "Gets all wallet balances for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ConsumerBalanceDTO],
    description: "Get all consumer balances",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getConsumerBalance(@AuthUser() authUser: Consumer): Promise<ConsumerBalanceDTO[]> {
    const balances =
      authUser.props.zhParticipantCode !== undefined
        ? await this.transactionService.getParticipantBalance(authUser.props.zhParticipantCode, authUser.props._id)
        : [];

    const dto: ConsumerBalanceDTO[] = [];
    balances.forEach(balance => {
      dto.push({
        balance: balance.balance,
        accountType: balance.accountType,
        asset: balance.asset,
      });
    });

    return dto;
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
    @Request() request,
  ): Promise<ConsumerLimitsDTO> {
    if (!consumerLimitsQuery.transactionType) consumerLimitsQuery.transactionType = TransactionType.ONRAMP;
    return this.limitsService.getConsumerLimits(authUser, consumerLimitsQuery.transactionType);
  }

  @Get("/transactions/download")
  @ApiTags("Transactions")
  @ApiOperation({ summary: "Downloads all the transactions of a particular consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "A CSV or PDF file containing details of all the transactions made by the consumer",
  })
  async downloadTransactions(
    @Request() request,
    @Query() params: DownloadTransactionsDTO,
    @AuthUser() authUser: Consumer,
    @Response() response,
  ) {
    let filePath = "";
    const transactions: PaginatedResult<TransactionDTO> = await this.transactionService.getUserTransactions(
      authUser.props.id,
      { ...params, pageLimit: params.pageLimit ?? 10000 },
    );

    if (params.reportFormat == DownloadFormat.CSV) {
      filePath = await CsvService.convertToCsvAndSaveToDisk(transactions.items);
      response.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=${filePath}`,
        "Content-Length": fs.statSync(filePath).size,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      });
      fs.createReadStream(filePath)
        .on("finish", () => {
          this.logger.debug(`Deleting the file '${filePath}'...`);
          fs.unlinkSync(filePath);
        })
        .pipe(response);
    } else {
      throw new BadRequestError({ messageForClient: "Only 'CSV' format is supported." });
    }
  }
}
