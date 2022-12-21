import { Controller, ForbiddenException, Get, Headers, HttpStatus, Inject, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "src/core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { CircleService } from "./circle.service";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("circle") // This defines the path prefix
@ApiTags("Consumer") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@ApiHeaders(getCommonHeaders()) // Adds the requirement for all the X-Noba-xxx headers.
export class CircleController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly circleService: CircleService,
  ) {}

  @Post("/wallet")
  @ApiTags("Wallet")
  @ApiOperation({ summary: "Add circle wallet to current consumer" })
  @ApiResponse({ status: HttpStatus.CREATED })
  async addConsumerWallet(@Request() request, @Headers() headers) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const res = await this.circleService.getOrCreateWallet(consumer.props.id);
    return res;
  }

  @Get("/wallet/balance")
  @ApiTags("Wallet")
  @ApiOperation({ summary: "Get current consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  async getConsumerWalletBalance(@Request() request, @Headers() headers) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const walletBalance = await this.circleService.getWalletBalance(consumer.props.id);
    return walletBalance;
  }
}
