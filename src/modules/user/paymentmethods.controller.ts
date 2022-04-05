import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Role } from '../auth/role.enum';
import { Roles, UserID } from '../auth/roles.decorator';
import { AddPaymentMethodDTO } from './dto/AddPaymentMethodDTO';
import { PaymentMethodDTO } from './dto/PaymentMethodDTO';
import { PaymentMethodsService } from './paymentmethods.service';

@Roles(Role.User)
@Controller("paymentmethods/:"+UserID)
export class PaymentMethodsController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly paymentMethodService: PaymentMethodsService) {

  }
 
  @Get()
  @ApiResponse({status:HttpStatus.OK,   type: [PaymentMethodDTO]})
  async getUserPaymentMethods(@Param(UserID) userID: string): Promise<PaymentMethodDTO[]>{
      return this.paymentMethodService.getPaymentMethods(userID);
  }

  @Post()
  @ApiResponse({status:HttpStatus.OK,   type: PaymentMethodDTO})
  async addPaymentMethod(@Param(UserID) userID: string,  @Body() methodDetails: AddPaymentMethodDTO): Promise<PaymentMethodDTO>{
    console.log("validations passed and method Details is ", methodDetails);
    return this.paymentMethodService.addPaymentMethod(userID, methodDetails);
  }

  @Delete("/:paymentMethodId")
  @ApiResponse({status:HttpStatus.OK,  type: String})
  async removePaymentMethod(@Param(UserID) userID: string, @Param('paymentMethodId') paymentMethodId): Promise<string>{
    await this.paymentMethodService.removePaymentMethod(userID, paymentMethodId);
    return "Payment method removed";
  }

  //we don't need update payment method endpoint for now (user can delete and add new payment method)
/*   @Put("/:paymentMethodId")
  @ApiResponse({status:HttpStatus.OK,   type: UserDTO})
  async updatePaymentMethod(@Param(UserID) userID: string, @Param()@Body() methodDetails: string): Promise<UserDTO>{ //TODO add UPDATE PAYMENT METHOD DTO
    return null;
  } */

}