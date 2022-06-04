import { Controller, Get, Inject, HttpStatus, Query, Param, Post, Body, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserID } from '../auth/roles.decorator';
import { Admin } from '../auth/admin.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionStatsDTO } from './dto/TransactionStats';
import { TransactionDTO } from '../transactions/dto/TransactionDTO';
import { TransactionsFilterDTO } from './dto/TransactionsFilterDTO';
import { NobaAdminDTO } from './dto/NobaAdminDTO';
import { Admin as AdminDomain } from './domain/Admin';
import { OutputNobaAdminDTO } from './dto/OutputNobaAdminDTO';
import { AdminMapper } from './mappers/AdminMapper';


@Admin()
@Controller("admin/:" + UserID)
@ApiTags("Admin")
export class AdminController {

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly adminService: AdminService;

  @Inject()
  private readonly adminMapper: AdminMapper;

  constructor() { }

  @Get("/transaction_metrics")
  @ApiOperation({ summary: 'Get all transaction metrics for a given partner.' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionStatsDTO, description: 'Get transaction statistics' })
  async getTransactionMetrics(@Param(UserID) userID: string): Promise<TransactionStatsDTO> {
    return await this.adminService.getTransactionStatus();
  }

  @Get("/transactions")
  @ApiOperation({ summary: "Get all transactions filtered by the specified date range" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransactionDTO] })
  async getAllTransactions(
    @Param(UserID) userID: string,
    @Query() filterQuery: TransactionsFilterDTO): Promise<TransactionDTO[]> {
    return await this.adminService.getAllTransactions(filterQuery.startDate, filterQuery.endDate);
  }

  // TODO: Decide the different URLs for NobaAdmins, Partners & PartnerAdmins.
  @Post('/')
  @ApiOperation({ summary: "Creates a new NobaAdmin with a specified role." })
  @ApiResponse({ status: HttpStatus.OK, type: OutputNobaAdminDTO, description: "The newly created Noba Admin." })
  async createNobaAdmin(@Body() nobaAdmin: NobaAdminDTO): Promise<OutputNobaAdminDTO> {
    const savedAdmin: AdminDomain = await this.adminService.addNobaAdmin(this.adminMapper.toDomain(nobaAdmin));

    if (savedAdmin === undefined)
      throw new ConflictException('User is already registerd as a NobaAdmin');

    return this.adminMapper.toOutputDto(savedAdmin);
  }

}