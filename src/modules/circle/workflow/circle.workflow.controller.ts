import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import {
  CircleWalletBalanceResponseDTO,
  CircleTransactionDTO,
  CircleWalletResponseDTO,
} from "../dto/circle.controller.dto";
import { CircleDepositOrWithdrawalRequest, CircleFundsTransferRequestDTO } from "../dto/circle.workflow.controller.dto";
import { CircleService } from "../public/circle.service";
import { CircleWorkflowService } from "./circle.workflow.service";

@Controller("wf/v1/circle") // This defines the path prefix
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
export class CircleWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleWorkflowService: CircleWorkflowService,
    private readonly circleService: CircleService,
  ) {}

  @Get("/wallets/consumers/:consumerID")
  @ApiOperation({ summary: "Get consumer's wallet ID" })
  @ApiResponse({ status: HttpStatus.OK, type: CircleWalletResponseDTO })
  async getConsumerWalletID(@Param("consumerID") consumerID: string): Promise<CircleWalletResponseDTO> {
    const res = await this.circleService.getOrCreateWallet(consumerID);
    return {
      walletID: res,
    };
  }

  @Get("/wallets/master")
  @ApiOperation({ summary: "Get master wallet ID" })
  @ApiResponse({ status: HttpStatus.OK, type: CircleWalletResponseDTO })
  async getMasterWalletID(): Promise<CircleWalletResponseDTO> {
    const res = await this.circleService.getMasterWalletID();
    return {
      walletID: res,
    };
  }

  @Get("/wallets/:walletID/balance")
  @ApiOperation({ summary: "Get consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK, type: CircleWalletBalanceResponseDTO })
  async getWalletBalance(@Param("walletID") walletID: string): Promise<CircleWalletBalanceResponseDTO> {
    const res = await this.circleService.getWalletBalance(walletID);
    return {
      walletID: walletID,
      balance: res,
    };
  }

  @Post("/wallets/:walletID/debit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Debit consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK, type: CircleTransactionDTO })
  async debitWalletBalance(
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleDepositOrWithdrawalRequest,
  ): Promise<CircleTransactionDTO> {
    const res = await this.circleService.debitWalletBalance(
      fundsMovementRequest.workflowID,
      walletID,
      fundsMovementRequest.amount,
    );
    return {
      id: res.id,
      status: res.status,
      createdAt: res.createdAt,
    };
  }

  @Post("/wallets/:walletID/credit")
  @ApiOperation({ summary: "Credit consumer's circle wallet balance" })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: CircleTransactionDTO })
  async creditWalletBalance(
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleDepositOrWithdrawalRequest,
  ): Promise<CircleTransactionDTO> {
    const res = await this.circleService.creditWalletBalance(
      fundsMovementRequest.workflowID,
      walletID,
      fundsMovementRequest.amount,
    );
    return {
      id: res.id,
      status: res.status,
      createdAt: res.createdAt,
    };
  }

  @Post("/wallets/:walletID/transfer")
  @ApiOperation({ summary: "Transfer funds between circle wallets" })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: CircleTransactionDTO })
  async transferFunds(
    @Param("walletID") sourceWalletID: string,
    @Body() transferRequest: CircleFundsTransferRequestDTO,
  ): Promise<CircleTransactionDTO> {
    const res = await this.circleService.transferFunds(
      transferRequest.workflowID,
      sourceWalletID,
      transferRequest.destinationWalletID,
      transferRequest.amount,
    );
    return {
      id: res.id,
      status: res.status,
      createdAt: res.createdAt,
    };
  }

  @Get("/wallets/master/balance/postdisbursementallocationamounts")
  @ApiOperation({
    summary:
      "Gets Circle master wallet balance post allocationAmount for all disbursements across Payroll with Invoiced status",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CircleWalletBalanceResponseDTO,
  })
  async getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls(): Promise<CircleWalletBalanceResponseDTO> {
    return this.circleWorkflowService.getCircleBalanceAfterPayingAllDisbursementForInvoicedPayrolls();
  }
}
