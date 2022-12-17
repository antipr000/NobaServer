import { Body, Controller, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { CircleService } from "./circle.service";
import { CircleFundsMovementRequestDTO } from "./domain/CircleFundsMovementRequestDTO";

@Controller("wf/circle") // This defines the path prefix
@ApiTags("Workflow") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@IsNoApiKeyNeeded()
export class CircleWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleService: CircleService,
  ) {}

  @Get(`/wallets/consumers/:consumerID`)
  @ApiOperation({ summary: "Get consumer's wallet ID" })
  @ApiResponse({ status: HttpStatus.OK })
  async getConsumerWalletID(@Param("consumerID") consumerID: string): Promise<any> {
    const res = await this.circleService.getOrCreateWallet(consumerID);
    return {
      walletID: res,
    };
  }

  @Get(`/wallets`)
  @ApiOperation({ summary: "Get consumer's wallet ID" })
  @ApiResponse({ status: HttpStatus.OK })
  async getMasterWalletID(): Promise<any> {
    const res = await this.circleService.getMasterWalletID();
    return {
      walletID: res,
    };
  }

  @Get("/wallets/:walletID/balance")
  @ApiOperation({ summary: "Get consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async getWalletBalance(@Param("walletID") walletID: string) {
    const res = await this.circleService.getWalletBalance(walletID);
    return {
      walletID: walletID,
      balance: res,
    };
  }

  @Post("/wallets/:walletID/debit")
  @ApiOperation({ summary: "Debit consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async debitWalletBalance(
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleFundsMovementRequestDTO,
  ) {
    const res = await this.circleService.debitWalletBalance(walletID, fundsMovementRequest.amount);
    return {
      walletID: walletID,
      balance: res,
    };
  }

  @Post("/wallets/:walletID/credit")
  @ApiOperation({ summary: "Credit consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async creditWalletBalance(
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleFundsMovementRequestDTO,
  ) {
    const res = await this.circleService.creditWalletBalance(walletID, fundsMovementRequest.amount);
    return {
      walletID: walletID,
      balance: res,
    };
  }
}
