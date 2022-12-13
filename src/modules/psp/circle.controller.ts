import { Body, Controller, ForbiddenException, Headers, HttpStatus, Inject, Post, Request } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Consumer } from "../consumer/domain/Consumer";
import { CircleService } from "./circle.service";

@Controller()
export class CircleController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
		private readonly circleService: CircleService,
  ) {
	  }

  @Post("/wallets")
  @ApiTags("Wallets")
  @ApiOperation({ summary: "Checks if the transaction parameters are valid" })
  @ApiResponse({ status: HttpStatus.OK })
  async addConsumerWallet(@Request() request, @Headers() headers) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const res = await this.circleService.createWallet(consumer.props._id);
    return res;
  }
}
