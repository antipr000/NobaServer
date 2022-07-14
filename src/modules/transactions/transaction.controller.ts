import {
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
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import * as fs from "fs";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { CheckTransactionDTO } from "./dto/CheckTransactionDTO";
import { CreateTransactionDTO } from "./dto/CreateTransactionDTO";
import { DownloadFormat, DownloadTransactionsDTO } from "./dto/DownloadTransactionsDTO";
import { TransactionFilterDTO } from "./dto/TransactionFilterDTO";

import { AuthUser } from "../auth/auth.decorator";
import { CsvService } from "../common/csv.service";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionAllowedStatus } from "./domain/TransactionAllowedStatus";
import { CheckTransactionQueryDTO } from "./dto/CheckTransactionQueryDTO";
import { TransactionDTO } from "./dto/TransactionDTO";
import { LimitsService } from "./limits.service";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";
import { ConsumerLimitsDTO } from "./dto/ConsumerLimitsDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller()
export class TransactionController {
  // @Inject(WINSTON_MODULE_PROVIDER)
  // private readonly logger: Logger;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly configService: CustomConfigService,
    private readonly limitsService: LimitsService,
    private readonly zerohashService: ZeroHashService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get("/transactions/check")
  @ApiTags("Transactions")
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
  async getTransactionStatus(
    @Param("transactionID") transactionID: string,
    @AuthUser() authUser: Consumer,
  ): Promise<TransactionDTO> {
    const dto = await this.transactionService.getTransactionStatus(transactionID);
    if (dto.userID !== authUser.props._id) {
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
    type: TransactionDTO,
    description: "Transaction details",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async transact(
    @Query("sessionKey") sessionKey: string,
    @Body() orderDetails: CreateTransactionDTO,
    @AuthUser() user: Consumer,
  ): Promise<TransactionDTO> {
    this.logger.info(`uid ${user.props._id}, transact input:`, orderDetails);

    return this.transactionService.transact(user.props._id, sessionKey, orderDetails);
  }

  //TODO take filter options, pagination token etc?
  @Get("/transactions/")
  @ApiTags("Transactions")
  @ApiOperation({ summary: "Gets all transactions for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "List of all transactions",
  })
  async getTransactions(
    @Query() transactionFilters: TransactionFilterDTO,
    @AuthUser() authUser: Consumer,
  ): Promise<TransactionDTO[]> {
    const fromDateInUTC = new Date(transactionFilters.startDate).toUTCString();
    const toDateInUTC = new Date(transactionFilters.endDate).toUTCString();

    return this.transactionService.getTransactionsInInterval(
      authUser.props._id,
      new Date(fromDateInUTC),
      new Date(toDateInUTC),
    );
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
  async getConsumerLimits(@AuthUser() authUser: Consumer): Promise<ConsumerLimitsDTO> {
    return this.limitsService.getConsumerLimits(authUser);
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
    @Query() downloadParames: DownloadTransactionsDTO,
    @AuthUser() authUser: Consumer,
    @Response() response,
  ) {
    const fromDateInUTC = new Date(downloadParames.startDate).toUTCString();
    const toDateInUTC = new Date(downloadParames.endDate).toUTCString();

    let filePath = "";
    const transactions: TransactionDTO[] = await this.transactionService.getTransactionsInInterval(
      authUser.props._id,
      new Date(fromDateInUTC),
      new Date(toDateInUTC),
    );

    if (downloadParames.reportFormat == DownloadFormat.CSV) {
      filePath = await CsvService.convertToCsvAndSaveToDisk(transactions);
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
