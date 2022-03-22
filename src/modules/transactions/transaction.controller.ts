import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CreateTransactionDTO } from './dto/CreateTransactionDTO';
import { TransactionDTO } from './dto/TransactionDTO';

@Roles(Role.User)
@Controller("user/:"+UserID+"/transactions")
export class TransactionController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly transactionService: TransactionService, private readonly configService: ConfigService) {
      
  }

 
  @Get("/status/:transactionId")
  @ApiResponse({status:HttpStatus.OK, type: TransactionDTO})
  async getTransactionStatus(@Param(UserID) userID: string, @Param("transactionId") transactionId: string): Promise<TransactionDTO>{
    return this.transactionService.getTransactionStatus(transactionId); //TODO check that transactionId belongs to this user?
  }

  //We should create buy sell api differently otherwise lot of if else logic in core logic. basically different api for on-ramp and off-ramp
  @Post("/trasact")
  @ApiResponse({status:HttpStatus.OK , description: "Returns transaction id if transaction is placed successfully"})
  async transact(@Param(UserID) userID: string, @Body() orderDetails: CreateTransactionDTO): Promise<TransactionDTO>{
    console.log("raw transaction input", orderDetails); //TODO better logging

    return this.transactionService.transact(userID, orderDetails); 
  }

  //TODO take filter options, pagitination token etc?
  @Get("/")
  @ApiResponse({status:HttpStatus.OK, type: [TransactionDTO]})
  async getTransactions(@Param(UserID) userID: string): Promise<TransactionDTO[]>{
    return this.transactionService.getUserTransactions(userID);
  }

  //TODO move this to admin service
  @Get("/all")
  @ApiResponse({status:HttpStatus.OK, type: [TransactionDTO]})
  async getAllTransactions(@Param(UserID) userID: string): Promise<TransactionDTO[]>{
    return this.transactionService.getAllTransactions();
  }
}