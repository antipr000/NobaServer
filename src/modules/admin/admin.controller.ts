import {
  Controller,
  Get,
  Inject,
  HttpStatus,
  Query,
  Param,
  Post,
  Body,
  ConflictException,
  Delete,
  Request,
  ForbiddenException,
  Patch,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AdminId } from "../auth/roles.decorator";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { TransactionsFilterDTO } from "./dto/TransactionsFilterDTO";
import { NobaAdminDTO } from "./dto/NobaAdminDTO";
import { Admin } from "./domain/Admin";
import { AdminMapper } from "./mappers/AdminMapper";
import { Public } from "../auth/public.decorator";
import { UpdateNobaAdminDTO } from "./dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "./dto/DeleteNobaAdminDTO";
import { ConsumerDTO } from "../consumer/dto/ConsumerDTO";
import { AdminUpdateConsumerRequestDTO } from "./dto/AdminUpdateConsumerRequestDTO";
import { ConsumerService } from "../consumer/consumer.service";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { AddNobaAdminDTO } from "./dto/AddNobaAdminDTO";
import { TransactionService } from "../transactions/transaction.service";
import { ExchangeRateService } from "../common/exchangerate.service";
import { ExchangeRateDTO } from "../common/dto/ExchangeRateDTO";
import { ServiceException } from "src/core/exception/ServiceException";

@Controller("v1/admins")
@ApiBearerAuth("JWT-auth")
@ApiTags("Admin")
@ApiHeaders(getCommonHeaders())
export class AdminController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly adminService: AdminService;

  @Inject()
  private readonly adminMapper: AdminMapper;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly exchangeRateService: ExchangeRateService;

  private readonly consumerMapper: ConsumerMapper = new ConsumerMapper();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transactionmetrics`)
  @ApiOperation({ summary: "Gets all transaction metrics" })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionStatsDTO, description: "Transaction statistics" })
  async getTransactionMetrics(@Param(AdminId) adminId: string): Promise<TransactionStatsDTO> {
    return this.adminService.getTransactionStatus();
  }

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transactions`)
  @ApiOperation({ summary: "Gets all transactions filtered by the specified date range" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "All transactions within the specified date range",
  })
  async getAllTransactions(
    @Param(AdminId) adminId: string,
    @Query() filterQuery: TransactionsFilterDTO,
  ): Promise<TransactionDTO[]> {
    return this.adminService.getAllTransactions(filterQuery.startDate, filterQuery.endDate);
  }

  @Post("/")
  @ApiOperation({ summary: "Creates a new Noba admin with the specified role" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The newly created Noba admin" })
  @ApiForbiddenResponse({ description: "User forbidden from adding new Noba admin" })
  @ApiConflictResponse({ description: "User is already a Noba admin" })
  async createNobaAdmin(@Request() request, @Body() nobaAdmin: AddNobaAdminDTO): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canAddNobaAdmin()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't add a new Noba admin.`);
    }

    const savedAdmin: Admin = await this.adminService.addNobaAdmin(this.adminMapper.toDomain(nobaAdmin));
    if (savedAdmin === undefined) {
      throw new ConflictException("User is already registered as a NobaAdmin");
    }

    return this.adminMapper.toDTO(savedAdmin);
  }

  @Get("/")
  @ApiOperation({ summary: "Gets the details of the logged in Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The logged in Noba admin" })
  @ApiForbiddenResponse({ description: "User forbidden from retrieving details of the Noba admin" })
  async getNobaAdmin(@Request() request): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("This endpoint is only for Noba admins.");
    }

    return this.adminMapper.toDTO(authenticatedUser);
  }

  @Patch(`/:${AdminId}`)
  @ApiOperation({ summary: "Updates the details of a Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The updated NobaAdmin." })
  @ApiForbiddenResponse({
    description: "User forbidden from updating Noba admin or attempt to update one's own record",
  })
  @ApiNotFoundResponse({ description: "Noba admin not found" })
  async updateNobaAdmin(
    @Request() request,
    @Param(AdminId) adminId: string,
    @Body() req: UpdateNobaAdminDTO,
  ): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canChangeNobaAdminPrivileges()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update NobaAdmins.`);
    }

    if (authenticatedUser.props.id === adminId) {
      throw new ForbiddenException("You can't update your own identity.");
    }

    const adminToUpdate: Admin = await this.adminService.getAdminById(adminId);
    if (adminToUpdate === undefined) {
      throw new NotFoundException(`Admin with id ${adminId} not found.`);
    }

    const updatedAdmin: Admin = await this.adminService.updateNobaAdmin(
      adminId,
      req.role ?? adminToUpdate.props.role,
      req.name ?? adminToUpdate.props.name,
    );

    return this.adminMapper.toDTO(updatedAdmin);
  }

  @Delete(`/:${AdminId}`)
  @ApiOperation({ summary: "Deletes a Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: DeleteNobaAdminDTO, description: "The ID of the Noba admin to delete" })
  @ApiForbiddenResponse({
    description: "User forbidden from deleting Noba admin or attempt to delete one's own record",
  })
  @ApiNotFoundResponse({ description: "Noba admin not found" })
  async deleteNobaAdmin(@Request() request, @Param(AdminId) adminId: string): Promise<DeleteNobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRemoveNobaAdmin()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update privileges.`);
    }

    if (authenticatedUser.props.id === adminId) {
      throw new ForbiddenException("You can't delete your own account.");
    }

    try {
      const deletedAdminId: string = await this.adminService.deleteNobaAdmin(adminId);

      const result = new DeleteNobaAdminDTO();
      result.id = deletedAdminId;
      return result;
    } catch (e) {
      throw new NotFoundException();
    }
  }

  @Patch("/consumers/:consumerID")
  @ApiOperation({ summary: "Updates a consumer" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerDTO, description: "Updated consumer record" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating consumer record",
  })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  async updateConsumer(
    @Param("consumerID") consumerID: string,
    @Body() requestBody: AdminUpdateConsumerRequestDTO,
    @Request() request,
  ) {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canUpdateConsumerData()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update a Consumer.`);
    }

    const consumerData = await this.consumerService.getConsumer(consumerID);
    const updatedConsumerData = await this.consumerService.updateConsumer({
      id: consumerData.props.id,
      ...(requestBody.address && { address: requestBody.address }),
      ...(requestBody.dateOfBirth && { dateOfBirth: requestBody.dateOfBirth }),
      ...(requestBody.verificationData && {
        verificationData: {
          ...consumerData.props.verificationData,
          ...requestBody.verificationData,
        },
      }),
    });
    const paymentMethods = await this.consumerService.getAllPaymentMethodsForConsumer(consumerID);
    const cryptoWallets = await this.consumerService.getAllConsumerWallets(consumerID);
    return this.consumerMapper.toDTO(updatedConsumerData, paymentMethods, cryptoWallets);
  }

  @Post("/exchangerates")
  @ApiOperation({ summary: "Creates a new exchange rate entry" })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "The newly created exchange rate(s). Index [0] is the forward rate that was created, index [1] is the inverse rate if addInverse is true",
    type: [ExchangeRateDTO],
  })
  @ApiForbiddenResponse({ description: "User forbidden from adding new exchange rate" })
  @ApiQuery({ name: "addInverse", type: "boolean", description: "Whether to also add the inverse of this rate" })
  async createExchangeRate(
    @Request() request,
    @Body() exchangeRate: ExchangeRateDTO,
    @Query("addInverse") addInverse = "false",
  ): Promise<ExchangeRateDTO[]> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException(`User is forbidden from calling this API.`);
    }

    if (exchangeRate.bankRate === 0 || exchangeRate.nobaRate === 0) {
      throw new BadRequestException("Exchange rate cannot be zero");
    }

    const insertedExchangeRates = new Array();

    const savedExchangeRate: ExchangeRateDTO = await this.exchangeRateService.createExchangeRate(exchangeRate);
    if (savedExchangeRate == null) {
      throw new BadRequestException("Unable to add exchange rate");
    }
    insertedExchangeRates.push(savedExchangeRate);

    // Booleans are not handled well by Swagger, so we need to treat as a string
    if (addInverse == "true") {
      const inverseRate: ExchangeRateDTO = {
        numeratorCurrency: exchangeRate.denominatorCurrency,
        denominatorCurrency: exchangeRate.numeratorCurrency,
        bankRate: 1 / exchangeRate.bankRate,
        nobaRate: exchangeRate.nobaRate ? 1 / exchangeRate.nobaRate : undefined,
        expirationTimestamp: exchangeRate.expirationTimestamp,
      };
      const savedInverseExchangeRate = await this.exchangeRateService.createExchangeRate(inverseRate);

      if (savedInverseExchangeRate == null) {
        throw new BadRequestException("Unable to add exchange rate");
      }
      insertedExchangeRates.push(savedInverseExchangeRate);
    }

    return insertedExchangeRates;
  }
}
