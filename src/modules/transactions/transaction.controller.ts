import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CreateTransactionDTO } from './dto/CreateTransactionDTO';
import { TransactionStatusDTO } from './dto/TransactionStatusDTO';

@Roles(Role.User)
@Controller("user/:"+UserID+"/transactions")
export class TransactionController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly transactionService: TransactionService, private readonly configService: ConfigService) {
      
  }

 
  @Get("/status/:transactionId")
  @ApiResponse({status:HttpStatus.OK, type: TransactionStatusDTO})
  async getTransactionStatus(@Param(UserID) userID: string, @Param("transactionId") transactionId: string): Promise<string>{
    return "pending";
  }

  @Post("/:trasact")
  @ApiResponse({status:HttpStatus.OK , description: "Returns transaction id if transaction is placed successfully"})
  async transact(@Param(UserID) userID: string, @Body() orderDetails: CreateTransactionDTO): Promise<string>{
    //TODO implement
    /* 
    1. check the slippage within limit if in limit then save the transaction with status pending
    2. charge the selected payment method with stripe api
    3. if 2 succeeds check the slippage again
    4. if slippage within limit then create the transaction else revert the transaction and update the status
    5. wait for the transaction to be placed
    6. return the transaction id
    
    */
    return "transaction_id_1544242424";
  }

  @Get("/")
  @ApiResponse({status:HttpStatus.OK, type: [TransactionStatusDTO]})
  async getTransactions(@Param(UserID) userID: string): Promise<TransactionStatusDTO[]>{
    return null;
  }
}