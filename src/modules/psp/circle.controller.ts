import { Controller, Get, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { CircleService } from "./circle.service";
import { AuthUser } from "../auth/auth.decorator";

@Roles(Role.User)
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
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async addConsumerWallet(@AuthUser() consumer: Consumer) {
    const res = await this.circleService.getOrCreateWallet(consumer.props.id);
    return res;
  }

  @Get("/wallet/balance")
  @ApiOperation({ summary: "Get current consumer's circle wallet balance" })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async getConsumerWalletBalance(@AuthUser() consumer: Consumer) {
    const walletID = await this.circleService.getOrCreateWallet(consumer.props.id);
    const walletBalance = await this.circleService.getWalletBalance(walletID);
    return walletBalance;
  }
}
