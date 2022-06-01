import { Controller, Get, Inject, HttpStatus, Query, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserID } from '../auth/roles.decorator';
import { Admin } from '../auth/admin.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionStatsDTO } from './dto/TransactionStats';
import { TransactionDTO } from '../transactions/dto/TransactionDTO';
import { TransactionsFilterDTO } from './dto/TransactionsFilterDTO';


@Admin()
@Controller("admin/:"+UserID)
@ApiTags("Admin")
export class AdminController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly adminService: AdminService) {

  }
  
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
    @Param(UserID)userID: string, 
    @Query()filterQuery: TransactionsFilterDTO): Promise<TransactionDTO[]> {
    return await this.adminService.getAllTransactions(filterQuery.startDate, filterQuery.endDate);
  }

}