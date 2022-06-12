import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { PaymentMethodId, Roles, UserID } from "../auth/roles.decorator";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { PaymentMethodDTO } from "./dto/PaymentMethodDTO";
import { StripePaymentMethodsService } from "./paymentmethods.service";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("paymentmethods/:" + UserID)
@ApiTags("Payment Methods")
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
  async getUserPaymentMethods(@Param(UserID) userID: string): Promise<PaymentMethodDTO[]> {
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
  async addPaymentMethod(
    @Param(UserID) userID: string,
    @Body() methodDetails: AddPaymentMethodDTO,
  ): Promise<PaymentMethodDTO> {
    console.log("validations passed and method Details is ", methodDetails);
    return this.paymentMethodService.addPaymentMethod(userID, methodDetails);
  }
}

// Write as a separate controller as this doesn't need userID
@Roles(Role.User)
@ApiBearerAuth()
@ApiTags("Payment Methods")
@Controller("paymentmethods/:" + PaymentMethodId)
export class DetachPaymentMethodController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly paymentMethodService: StripePaymentMethodsService) {}

  @Delete()
  @ApiOperation({ summary: "Remove a payment method from a user" })
  @ApiResponse({ status: HttpStatus.OK, type: String, description: "Remove a previously added payment method" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async removePaymentMethod(@Param(PaymentMethodId) paymentMethodId: string): Promise<string> {
    await this.paymentMethodService.removePaymentMethod(paymentMethodId);
    return "Payment method removed";
  }

  // TODO add a endpoint to delete all payment methods for a user
  // Simple to implement as we can just call the above endpoint for each payment method
}
