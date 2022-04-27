import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Role } from '../auth/role.enum';
import { PaymentMethodId, Roles, UserID } from '../auth/roles.decorator';
import { AddPaymentMethodDTO } from './dto/AddPaymentMethodDTO';
import { PaymentMethodDTO } from './dto/PaymentMethodDTO';
import { PaymentMethodsService } from './paymentmethods.service';

@Roles(Role.User)
@ApiBearerAuth()
@Controller("paymentmethods/:"+UserID)
export class PaymentMethodsController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly paymentMethodService: PaymentMethodsService) {

  }
 
  @Get()
  @ApiResponse({status:HttpStatus.OK,   type: [PaymentMethodDTO], description: 'Returns a list of all payment methods for the given user ID'})
  async getUserPaymentMethods(@Param(UserID) userID: string): Promise<PaymentMethodDTO[]>{
      return this.paymentMethodService.getPaymentMethods(userID);
  }

  @Post()
  @ApiResponse({status:HttpStatus.OK,   type: PaymentMethodDTO, description: 'Add a payment method for the desired user'})
  async addPaymentMethod(@Param(UserID) userID: string,  @Body() methodDetails: AddPaymentMethodDTO): Promise<PaymentMethodDTO>{
    console.log("validations passed and method Details is ", methodDetails);
    return this.paymentMethodService.addPaymentMethod(userID, methodDetails);
  }
}


// Write as a separate controller as this doesn't need userID
@Roles(Role.User)
@ApiBearerAuth()
@Controller("paymentmethods/:"+PaymentMethodId)
export class DetachPaymentMethodController {
  
    @Inject(WINSTON_MODULE_PROVIDER) 
    private readonly logger: Logger;
  
    constructor(private readonly paymentMethodService: PaymentMethodsService) {
  
    }
  
    @Delete()
    @ApiResponse({status:HttpStatus.OK,  type: String, description: 'Remove a previously added payment method'})
    async removePaymentMethod(@Param(PaymentMethodId) paymentMethodId: string): Promise<string>{
      await this.paymentMethodService.removePaymentMethod(paymentMethodId);
      return "Payment method removed";
    }

    // TODO add a endpoint to delete all payment methods for a user
    // Simple to implement as we can just call the above endpoint for each payment method
}
