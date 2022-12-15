import { Body, Controller, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { CircleService } from "./circle.service";
import { CircleFundsMovementRequestDTO } from "./domain/CircleFundsMovementRequestDTO";

@Controller("circle") // This defines the path prefix
@ApiTags("Workflow") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@IsNoApiKeyNeeded()
export class CircleWorkflowController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleService: CircleService,
  ) {}

  @Get(`/:consumerID/wallet`)
  @ApiOperation({ summary: "Get consumer's wallet ID" })
  @ApiResponse({ status: HttpStatus.OK })
  async getConsumerWalletID(@Param("consumerID") consumerID: string): Promise<string> {
    const res = await this.circleService.getOrCreateWallet(consumerID);
    return res;
  }

  @Get("/:consumerID/wallet/:walletID/balance")
  @ApiOperation({ summary: "Get consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async getWalletBalance(@Param("consumerID") consumerID: string, @Param("walletID") walletID: string) {
    const res = await this.circleService.getWalletBalance(consumerID, walletID);
    return res;
  }

  @Post("/:consumerID/wallet/:walletID/debit")
  @ApiOperation({ summary: "Debit consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async debitWalletBalance(
    @Param("consumerID") consumerID: string,
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleFundsMovementRequestDTO,
  ) {
    const res = await this.circleService.debitWalletBalance(consumerID, walletID, fundsMovementRequest.amount);
    return res;
  }

  @Post("/:consumerID/wallet/:walletID/credit")
  @ApiOperation({ summary: "Credit consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async creditWalletBalance(
    @Param("consumerID") consumerID: string,
    @Param("walletID") walletID: string,
    @Body() fundsMovementRequest: CircleFundsMovementRequestDTO,
  ) {
    const res = await this.circleService.creditWalletBalance(consumerID, walletID, fundsMovementRequest.amount);
    return res;
  }
}
