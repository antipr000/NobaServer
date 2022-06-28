import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Post, Request } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PaymentMethodID } from "../auth/roles.decorator";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { PaymentMethodDTO } from "./dto/PaymentMethodDTO";
import { StripePaymentMethodsService } from "./paymentmethods.service";

@ApiBearerAuth("JWT-auth")
@Controller("users/paymentmethods/")
@ApiTags("User")
export class PaymentMethodsController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly paymentMethodService: StripePaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: "Get all payment methods for a user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PaymentMethodDTO],
    description: "List of all payment methods for the given user ID",
  })
  @ApiBadRequestResponse({ description: "Invalid payment method ID / request parameters" })
  async getUserPaymentMethods(@Request() request): Promise<PaymentMethodDTO[]> {
    const userID: string = request.user.props._id;
    return this.paymentMethodService.getPaymentMethods(userID);
  }

  @Post()
  @ApiOperation({ summary: "Attach a payment method to a user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaymentMethodDTO,
    description: "Add a payment method for the desired user",
  })
  @ApiBadRequestResponse({ description: "Invalid payment method ID / request parameters" })
  async addPaymentMethod(@Request() request, @Body() methodDetails: AddPaymentMethodDTO): Promise<PaymentMethodDTO> {
    const userID: string = request.user.props._id;
    return this.paymentMethodService.addPaymentMethod(userID, methodDetails);
  }
}

// Write as a separate controller as this doesn't need userID
@ApiBearerAuth()
@ApiTags("User")
@Controller("users/paymentmethods/:" + PaymentMethodID)
export class DetachPaymentMethodController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly paymentMethodService: StripePaymentMethodsService) {}

  @Delete()
  @ApiOperation({ summary: "Remove a payment method from a user" })
  @ApiResponse({ status: HttpStatus.OK, type: String, description: "Remove a previously added payment method" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async removePaymentMethod(@Param(PaymentMethodID) paymentMethodID: string): Promise<string> {
    await this.paymentMethodService.removePaymentMethod(paymentMethodID);
    return "Payment method with ID " + paymentMethodID + " removed";
  }

  // TODO add a endpoint to delete all payment methods for a user
  // Simple to implement as we can just call the above endpoint for each payment method
}
