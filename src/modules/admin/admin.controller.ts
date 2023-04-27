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
import { AdminId, Roles } from "../auth/roles.decorator";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { NobaAdminDTO } from "./dto/NobaAdminDTO";
import { Admin } from "./domain/Admin";
import { AdminMapper } from "./mappers/AdminMapper";
import { Public } from "../auth/public.decorator";
import { UpdateNobaAdminDTO } from "./dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "./dto/DeleteNobaAdminDTO";
import { AdminUpdateConsumerRequestDTO } from "./dto/AdminUpdateConsumerRequestDTO";
import { ConsumerService } from "../consumer/consumer.service";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";
import { AddNobaAdminDTO } from "./dto/AddNobaAdminDTO";
import { Role } from "../auth/role.enum";
import { AccountBalanceFiltersDTO } from "./dto/AccountBalanceFiltersDTO";
import { AccountBalanceDTO } from "./dto/AccountBalanceDTO";
import { ConsumerSearchDTO } from "../consumer/dto/consumer.search.dto";
import { ConsumerInternalDTO } from "../consumer/dto/ConsumerInternalDTO";
import { UpdatePayrollRequestDTO } from "../employer/dto/payroll.workflow.controller.dto";
import { PayrollDTO } from "../employer/dto/PayrollDTO";
import { EmployerService } from "../employer/employer.service";
import {
  TransactionMappingService,
  TRANSACTION_MAPPING_SERVICE_PROVIDER,
} from "../transaction/mapper/transaction.mapper.service";
import { TransactionDTO } from "../transaction/dto/TransactionDTO";
import { TransactionFilterOptionsDTO } from "../transaction/dto/TransactionFilterOptionsDTO";
import { TransactionQueryResultDTO } from "../transaction/dto/TransactionQueryResultDTO";
import { IncludeEventTypes } from "../transaction/dto/TransactionEventDTO";
import { TransactionEvent } from "../transaction/domain/TransactionEvent";
import { ExchangeRateService } from "../exchangerate/exchangerate.service";
import { ExchangeRateDTO } from "../exchangerate/dto/exchangerate.dto";

@Roles(Role.NOBA_ADMIN)
@Controller("v1/admins")
@ApiBearerAuth("JWT-auth")
@ApiTags("Admin")
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
  private readonly exchangeRateService: ExchangeRateService;

  @Inject()
  private readonly consumerMapper: ConsumerMapper;

  @Inject()
  private readonly employerService: EmployerService;

  @Inject(TRANSACTION_MAPPING_SERVICE_PROVIDER)
  private readonly transactionMapper: TransactionMappingService;

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

  // TODO: Needs to be rewritten for new Transaction model
  /* @Public()
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
  }*/

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

  @Get("/current")
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

  @Get("/")
  @ApiOperation({ summary: "Gets the details of all Noba admins" })
  @ApiResponse({ status: HttpStatus.OK, type: [NobaAdminDTO], description: "All Noba admins" })
  @ApiForbiddenResponse({ description: "User forbidden from retrieving details of all Noba admin" })
  async getAllNobaAdmins(@Request() request): Promise<NobaAdminDTO[]> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canViewAllAdmins()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't retrieve NobaAdmins.`);
    }

    const allAdmins = await this.adminService.getAllNobaAdmins();
    return allAdmins.map(admin => this.adminMapper.toDTO(admin));
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
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerInternalDTO, description: "Updated consumer record" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating consumer record",
  })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  async updateConsumer(
    @Param("consumerID") consumerID: string,
    @Body() requestBody: AdminUpdateConsumerRequestDTO,
    @Request() request,
  ): Promise<ConsumerInternalDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canUpdateConsumerData()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update a Consumer.`);
    }

    return this.adminService.updateConsumer(consumerID, requestBody);
  }

  @Get("/balances")
  @ApiOperation({ summary: "Gets the balances of accounts based on providers" })
  @ApiResponse({ status: HttpStatus.OK, description: "Balances of accounts" })
  @ApiForbiddenResponse({
    description: "User forbidden from getting account balances",
  })
  async getAccountBalances(
    @Request() request,
    @Query() filters: AccountBalanceFiltersDTO,
  ): Promise<AccountBalanceDTO[]> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    if (typeof filters.accountIDs === "string") {
      filters.accountIDs = [filters.accountIDs];
    }

    return this.adminService.getBalanceForAccounts(filters.accountBalanceType, filters.accountIDs);
  }

  @Patch("/payrolls/:payrollID")
  @ApiOperation({ summary: "Updates the payroll status" })
  @ApiResponse({ status: HttpStatus.OK, description: "Payroll status is updated successfully" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating the Payroll status",
  })
  async updatePayrollStatus(
    @Request() request,
    @Param("payrollID") payrollID: string,
    @Body() requestBody: UpdatePayrollRequestDTO,
  ): Promise<PayrollDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    const payroll = await this.employerService.updatePayroll(payrollID, requestBody);
    return {
      id: payroll.id,
      employerID: payroll.employerID,
      reference: payroll.referenceNumber,
      payrollDate: payroll.payrollDate,
      totalDebitAmount: payroll.totalDebitAmount,
      totalCreditAmount: payroll.totalCreditAmount,
      exchangeRate: payroll.exchangeRate,
      debitCurrency: payroll.debitCurrency,
      creditCurrency: payroll.creditCurrency,
      status: payroll.status,
    };
  }

  @Post("/payrolls/:payrollID/retry")
  @ApiOperation({ summary: "Retries an existing payroll" })
  @ApiResponse({ status: HttpStatus.OK, description: "Payroll is retried successfully" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating the Payroll status",
  })
  async retryPayroll(@Request() request, @Param("payrollID") payrollID: string): Promise<PayrollDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    const payroll = await this.employerService.retryPayroll(payrollID);
    return {
      id: payroll.id,
      employerID: payroll.employerID,
      reference: payroll.referenceNumber,
      payrollDate: payroll.payrollDate,
      totalDebitAmount: payroll.totalDebitAmount,
      totalCreditAmount: payroll.totalCreditAmount,
      exchangeRate: payroll.exchangeRate,
      debitCurrency: payroll.debitCurrency,
      creditCurrency: payroll.creditCurrency,
      status: payroll.status,
    };
  }

  @Get("/consumers")
  @ApiOperation({ summary: "Gets all consumers or a subset based on query parameters" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerInternalDTO, description: "List of consumers", isArray: true })
  @ApiForbiddenResponse({ description: "User forbidden from getting consumers" })
  async getConsumers(@Request() request, @Query() filters: ConsumerSearchDTO): Promise<ConsumerInternalDTO[]> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    return this.adminService.findConsumersFullDetails(filters);
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
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    if (exchangeRate.bankRate === 0 || exchangeRate.nobaRate === 0) {
      throw new BadRequestException("Exchange rate cannot be zero");
    }

    const insertedExchangeRates = [];

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

  @Get("/transactions/")
  @ApiOperation({ summary: "Gets all transactions for supplied filters" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionQueryResultDTO,
  })
  @ApiForbiddenResponse({ description: "User forbidden from getting all transactions" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getAllTransactions(
    @Request() request,
    @Query() filters: TransactionFilterOptionsDTO,
  ): Promise<TransactionQueryResultDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    filters.pageLimit = Number(filters.pageLimit) || 10;
    filters.pageOffset = Number(filters.pageOffset) || 1;
    const allTransactions = await this.adminService.getFilteredTransactions(filters);
    if (allTransactions == null) return null;

    const transactions = allTransactions.items;

    const transactionDTOPromises: Promise<TransactionDTO>[] = transactions.map(
      async transaction => await this.transactionMapper.toTransactionDTO(transaction),
    );

    const transactionDTOs = await Promise.all(transactionDTOPromises);
    return {
      ...allTransactions,
      items: transactionDTOs,
    };
  }

  @Get("/transactions/:transactionRef")
  @ApiOperation({ summary: "Gets details of any transaction" })
  @ApiQuery({ name: "includeEvents", enum: IncludeEventTypes, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  async getTransaction(
    @Request() request,
    @Query("includeEvents") includeEvents: IncludeEventTypes,
    @Param("transactionRef") transactionRef: string,
  ): Promise<TransactionDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    const transaction = await this.adminService.getTransactionByTransactionRef(transactionRef);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ref: ${transactionRef} not found for user`);
    }

    let transactionEvents: TransactionEvent[];
    if (includeEvents && includeEvents !== IncludeEventTypes.NONE) {
      transactionEvents = await this.adminService.getTransactionEvents(
        transaction.id,
        includeEvents === IncludeEventTypes.ALL,
      );
    }

    return this.transactionMapper.toTransactionDTO(transaction, undefined, transactionEvents);
  }

  @Get("exchangerates")
  @ApiOperation({ summary: "Get exchange rate between a currency pair" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExchangeRateDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiNotFoundResponse({ description: "Exchange rate not found" })
  async getExchangeRate(
    @Query("numeratorCurrency") numeratorCurrency: string,
    @Query("denominatorCurrency") denominatorCurrency: string,
    @Request() request,
  ): Promise<ExchangeRateDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("User is forbidden from calling this API.");
    }

    if (!numeratorCurrency) {
      throw new BadRequestException("Numerator currency is required");
    } else if (!denominatorCurrency) {
      throw new BadRequestException("Denominator currency is required");
    }

    if (numeratorCurrency.length !== 3) {
      throw new BadRequestException("Numerator currency must be a 3 letter ISO code");
    } else if (denominatorCurrency.length !== 3) {
      throw new BadRequestException("Denominator currency must be a 3 letter ISO code");
    }

    const exchangeRate = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      numeratorCurrency,
      denominatorCurrency,
    );

    if (!exchangeRate) {
      throw new NotFoundException("Exchange rate not found");
    }

    return exchangeRate;
  }
}
