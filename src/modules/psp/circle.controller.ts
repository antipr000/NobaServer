import { Body, Controller, ForbiddenException, Headers, HttpStatus, Inject, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "src/core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { CircleService } from "./circle.service";

@Controller()
@Roles(Role.User)
@ApiBearerAuth("JWT-auth") 
@Controller("circle") // This defines the path prefix 
@ApiTags("Consumer") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping. 
@ApiHeaders(getCommonHeaders()) // Adds the requirement for all the X-Noba-xxx headers.
export class CircleController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
		private readonly circleService: CircleService,
  ) {
	  }

  @Post("/wallets")
  @ApiTags("Wallets")
  @ApiOperation({ summary: "Checks if the transaction parameters are valid" })
  @ApiResponse({ status: HttpStatus.CREATED })
  async addConsumerWallet(@Request() request, @Headers() headers) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const res = await this.circleService.createWallet(consumer.props._id);
    return res;
  }
}
