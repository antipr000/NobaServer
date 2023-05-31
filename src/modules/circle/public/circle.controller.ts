import { Controller, Get, HttpStatus, Inject, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CircleService } from "./circle.service";
import {
  CircleWalletBalanceResponseDTO,
  CircleWalletResponseDTO,
  GetCircleBalanceRequestDTO,
} from "../dto/circle.controller.dto";
import { AuthUser } from "../../../modules/auth/auth.decorator";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { getCommonHeaders } from "../../../core/utils/CommonHeaders";
import { Role } from "../../../modules/auth/role.enum";
import { Roles } from "../../../modules/auth/roles.decorator";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v1/circle") // This defines the path prefix
@ApiTags("Consumer") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@ApiHeaders(getCommonHeaders()) // Adds the requirement for all the X-Noba-xxx headers.
export class CircleController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleService: CircleService,
  ) {}

  @Post("/wallet")
  @ApiOperation({ summary: "Add circle wallet to current consumer" })
  @ApiResponse({ status: HttpStatus.CREATED, type: CircleWalletResponseDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async addConsumerWallet(@AuthUser() consumer: Consumer): Promise<CircleWalletResponseDTO> {
    const res = await this.circleService.getOrCreateWallet(consumer.props.id);
    return {
      walletID: res,
    };
  }

  @Get("/wallet/balance")
  @ApiOperation({ summary: "Get current consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK, type: CircleWalletBalanceResponseDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async getConsumerWalletBalance(
    @AuthUser() consumer: Consumer,
    @Query() query: GetCircleBalanceRequestDTO,
  ): Promise<CircleWalletBalanceResponseDTO> {
    const walletID = await this.circleService.getOrCreateWallet(consumer.props.id);
    const walletBalanceDTO = await this.circleService.getBalance(walletID, query.forceRefresh ?? false);
    return {
      walletID: walletID,
      balance: walletBalanceDTO.balance,
    };
  }
}
