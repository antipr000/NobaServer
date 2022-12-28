import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";

import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { TransactionService } from "./transaction.service";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { AuthUser } from "../auth/auth.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionSubmissionException } from "../transactions/exceptions/TransactionSubmissionException";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { ExchangeRateDTO } from "./dto/ExchangeRateDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("v2")
@ApiTags("Transaction")
@ApiHeaders(getCommonHeaders())
export class TransactionController {
  @Inject()
  private readonly transactionService: TransactionService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Get("/transactions/:transactionRef")
  @ApiOperation({ summary: "Gets details of a transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @ApiNotFoundResponse({ description: "Requested transaction is not found" })
  async getTransaction(@Param("transactionRef") transactionRef: string, @AuthUser() consumer: Consumer) {
    const transaction = await this.transactionService.getTransaction(transactionRef, consumer.props.id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ref: ${transactionRef} not found for user`);
    }
  }

  @Get("/transactions/")
  @ApiOperation({ summary: "Get all transactions for logged in user" })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getAllTransactions(@Query() filters: TransactionFilterOptions, @AuthUser() consumer: Consumer) {
    filters.consumerID = consumer.props.id;
    return this.transactionService.getFilteredTransactions(filters);
  }

  @Get("/transactions/rate/")
  @ApiOperation({ summary: "Get exchange rate of conversion" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ExchangeRateDTO,
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getExchangeRate(
    @Query("numeratorCurrency") numeratorCurrency: string,
    @Query("denominatorCurrency") denominatorCurrency: string,
  ): Promise<ExchangeRateDTO> {
    const exchangeRate = await this.transactionService.calculateExchangeRate(numeratorCurrency, denominatorCurrency);
    return {
      numeratorCurrency: numeratorCurrency,
      denominatorCurrency: denominatorCurrency,
      exchangeRate: exchangeRate,
    };
  }

  @Post("/transactions/")
  @ApiOperation({ summary: "Submits a new transaction" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Transaction ID",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async initiateTransaction(
    @Query("sessionKey") sessionKey: string,
    @Body() requestBody: InitiateTransactionDTO,
    @AuthUser() consumer: Consumer,
  ) {
    this.logger.debug(`uid ${consumer.props.id}, transact input:`, JSON.stringify(requestBody));

    try {
      return await this.transactionService.initiateTransaction(requestBody, consumer, sessionKey);
    } catch (e) {
      if (e instanceof TransactionSubmissionException) {
        throw new BadRequestException(e.disposition, e.message);
      } else {
        this.logger.error(`Error in initiateTransaction: ${e.message}`);
        throw new BadRequestException("Failed to make the payment");
      }
    }
  }
}
