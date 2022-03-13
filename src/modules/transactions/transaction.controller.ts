import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@Roles(Role.User)
@Controller("user/:"+UserID+"/transactions")
export class TransactionController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly transactionService: TransactionService, private readonly configService: ConfigService) {
      
  }

 
  @Get("/:transaction_id")
  @ApiResponse({status:HttpStatus.OK})
  async getTransactionStatus(@Param(UserID) userID: string, @Param("transaction_id") transactionId: string): Promise<string>{
    return null;
  }

  @Post("/:trasact")
  @ApiResponse({status:HttpStatus.OK})
  async transact(@Param(UserID) userID: string, @Body() orderDetails: any): Promise<string>{
    return null;
  }

  @Get("/")
  @ApiResponse({status:HttpStatus.OK})
  async getTransactions(@Param(UserID) userID: string): Promise<string>{
    return null;
  }


}