import { Body, Controller, Get, HttpStatus, Inject, Param, Post, Request } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadGatewayResponse, ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Role } from '../auth/role.enum';
import { Roles, UserID } from '../auth/roles.decorator';
import { CreateTransactionDTO } from './dto/CreateTransactionDTO';
import { TransactionDTO } from './dto/TransactionDTO';
import { TransactionService } from './transaction.service';
import { LimitsService } from './limits.service';
import { CheckTransactionDTO } from './dto/CheckTransactionDTO';
import { TransactionAllowedStatus } from './domain/TransactionAllowedStatus';

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("user/:"+UserID+"/transactions")
export class TransactionController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(
    private readonly transactionService: TransactionService, 
    private readonly configService: ConfigService,
    private readonly limitsService: LimitsService) {
      
  }

 
  @Get("/status/:transactionId")
  @ApiOperation({ summary: 'Get transaction details for a given transactionID' })
  @ApiResponse({status:HttpStatus.OK, type: TransactionDTO, description:"Transaction details for the given transactionId"})
  async getTransactionStatus(@Param(UserID) userID: string, @Param("transactionId") transactionId: string): Promise<TransactionDTO>{
    return this.transactionService.getTransactionStatus(transactionId); //TODO check that transactionId belongs to this user?
  }

  @Get("/check/:transactionAmount")
  @ApiResponse({status: HttpStatus.OK, type: CheckTransactionDTO })
  async checkIfTransactionPossible(
    @Param(UserID) userID: string, 
    @Param("transactionAmount") transactionAmount: string,
    @Request() request): Promise<CheckTransactionDTO> {
    const tAmount = parseInt(transactionAmount);
    const status: TransactionAllowedStatus = await this.limitsService.canMakeTransaction(request.user, tAmount);
    return {
      status: status
    };
  }

  //We should create buy sell api differently otherwise lot of if else logic in core logic. basically different api for on-ramp and off-ramp
  @Post("/trasact")
  @ApiOperation({ summary: 'Place a transaction with Noba' })
  @ApiResponse({status:HttpStatus.OK , type: TransactionDTO, description: "Returns transaction id if transaction is placed successfully"})
  @ApiBadGatewayResponse({ description: 'Bad gateway. Something went wrong.' })
  @ApiBadRequestResponse({ description: 'Bad request. Invalid input.' })
  async transact(@Param(UserID) userID: string, @Body() orderDetails: CreateTransactionDTO): Promise<TransactionDTO>{
    console.log("raw transaction input", orderDetails); //TODO better logging

    return this.transactionService.transact(userID, orderDetails); 
  }

  //TODO take filter options, pagitination token etc?
  @Get("/")
  @ApiOperation({ summary: 'Get all transactions for a particular user' })
  @ApiResponse({status:HttpStatus.OK, type: [TransactionDTO], description: "List of all transactions that happened through Noba for given userID"})
  async getTransactions(@Param(UserID) userID: string): Promise<TransactionDTO[]>{
    return this.transactionService.getUserTransactions(userID);
  }

  @Get("/all")
  @ApiOperation({ summary: 'Get all transactions on Noba' })
  @ApiResponse({status:HttpStatus.OK, type: [TransactionDTO], description: "Returns all transactions that took place on Noba (aggregated transations from all users) TODO: We need to move the to admin service"})
  async getAllTransactions(): Promise<TransactionDTO[]>{
      // TODO move this to admin service (very important to secure per user data) !! BEFORE MVP LAUNCH !!
      // TODO No need of keeping this under /user route.
    return this.transactionService.getAllTransactions();
  }
}
