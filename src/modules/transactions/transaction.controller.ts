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
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
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

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("/transactions")
@ApiTags("Transactions")
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

  @Get("/check")
  @ApiOperation({
    summary:
      "Checks if a transaction with given input is possible for a user or not i.e. if they have reached some limit or if id verification is required.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: CheckTransactionDTO })
  async checkIfTransactionPossible(
    @Query() checkTransactionQuery: CheckTransactionQueryDTO,
    @AuthUser() authUser: Consumer,
  ): Promise<CheckTransactionDTO> {
    const tAmount = checkTransactionQuery.transactionAmount;
    const status: TransactionAllowedStatus = await this.limitsService.canMakeTransaction(authUser, tAmount);
    return {
      status: status,
    };
  }

  @Get("/:transactionID")
  @ApiOperation({ summary: "Get transaction details for a given transactionID" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
    description: "Transaction details for the given transactionId",
  })
  async getTransactionStatus(
    @Param("transactionID") transactionID: string,
    @AuthUser() authUser: Consumer,
  ): Promise<TransactionDTO> {
    const dto = await this.transactionService.getTransactionStatus(transactionID); //TODO check that transactionId belongs to this user?
    if (dto.userID !== authUser.props._id) {
      throw new UnauthorizedException("Not authorized to view this transaction");
    }
    return dto;
  }

  //We should create buy sell api differently otherwise lot of if else logic in core logic. basically different api for on-ramp and off-ramp
  @Post("/")
  @ApiOperation({ summary: "Place a transaction with Noba" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
    description: "Returns transaction id if transaction is placed successfully",
  })
  @ApiBadGatewayResponse({ description: "Bad gateway. Something went wrong." })
  @ApiBadRequestResponse({ description: "Bad request. Invalid input." })
  async transact(
    @Query("sessionKey") sessionKey: string,
    @Body() orderDetails: CreateTransactionDTO,
    @AuthUser() user: Consumer,
  ): Promise<TransactionDTO> {
    this.logger.info(`uid ${user.props._id}, transact input:`, orderDetails);

    return this.transactionService.transact(user.props._id, sessionKey, orderDetails);
  }

  //TODO take filter options, pagitination token etc?
  @Get("/")
  @ApiOperation({ summary: "Get all transactions for a particular user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "List of all transactions that happened through Noba for given userID",
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

  @Get("/download")
  @ApiOperation({ summary: "Download all the transactions of a particular user." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "A CSV or PDF file containing details of all the transactions made by the user.",
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
