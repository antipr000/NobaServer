import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
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
import { PartnerService } from "../partner/partner.service";
import { X_NOBA_API_KEY } from "../auth/domain/HeaderConstants";
import { AuthenticatedUser } from "../auth/domain/AuthenticatedUser";
import { ConsumerLimitsQueryDTO } from "./dto/ConsumerLimitsQueryDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller()
@ApiHeaders(getCommonHeaders())
export class TransactionController {
  // @Inject(WINSTON_MODULE_PROVIDER)
  // private readonly logger: Logger;

  @Inject()
  private readonly partnerService: PartnerService;

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
    if (transactionQuoteQuery.partnerID === undefined) {
      transactionQuoteQuery.partnerID = request.user?.partnerId;
      if (!transactionQuoteQuery.partnerID) {
        // If still empty, it means we're unauthenticated. Get by API key instead.
        const partnerId = (await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY])).props._id;
        transactionQuoteQuery.partnerID = partnerId;
      }
    }
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
    const partnerID = (request.user as AuthenticatedUser).partnerId;
    const checkTransactionResponse: CheckTransactionDTO = await this.limitsService.canMakeTransaction(
      authUser,
      tAmount,
      partnerID,
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
    if (dto.userID !== authUser.props._id || dto.partnerID !== request.user.partnerId) {
      // We can't return forbidden, as that would tell the user there IS a transaction - they just can't see it. So "pretend" it's not found.
      throw new NotFoundException("Transaction does not exist");
    }
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
    this.logger.debug(`uid ${user.props._id}, transact input:`, orderDetails);

    try {
      return (
        await this.transactionService.initiateTransaction(
          user.props._id,
          request.user.partnerId,
          sessionKey,
          orderDetails,
        )
      )._id;
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
      authUser.props._id,
      request.user.partnerId,
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
    const balances = await this.transactionService.getParticipantBalance(authUser.props.zhParticipantCode);

    const dto: ConsumerBalanceDTO[] = [];
    balances.forEach(balance => {
      dto.push({
        balance: balance.balance,
        accountType: balance.accountType,
        asset: balance.asset,
        accountID: balance.accountID,
        lastUpdate: balance.lastUpdate,
        name: balance.name,
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
    const partnerID = (request.user as AuthenticatedUser).partnerId;
    if (!consumerLimitsQuery.transactionType) consumerLimitsQuery.transactionType = TransactionType.ONRAMP;
    return this.limitsService.getConsumerLimits(authUser, partnerID, consumerLimitsQuery.transactionType);
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
      authUser.props._id,
      request.user.partnerId,
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
