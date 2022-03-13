import { Controller, Get, Inject, Param, Body, Post, Put, HttpStatus, Delete} from '@nestjs/common';
import { UserService } from './user.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserDTO } from './dto/UserDTO';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ApiResponse } from '@nestjs/swagger';
import { PaymentMethodDTO, PaymentMethodsDTO } from './dto/PaymentMethodDTO';
import { AddPaymentMethodDTO } from './dto/AddPaymentMethodDTO';
import { PaymentMethodType } from './domain/Types';

@Roles(Role.User)
@Controller("user/:"+UserID)
export class UserController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly userService: UserService) {

  }
 
  @Get("/")
  @ApiResponse({status:HttpStatus.OK,   type: UserDTO})
  async getUser(@Param(UserID)id: string): Promise<UserDTO>{
    return await this.userService.getUser(id);
  }

  @Get("/paymentMethods")
  @ApiResponse({status:HttpStatus.OK,   type: PaymentMethodsDTO})
  async getUserPaymentMethods(@Param(UserID) id: string): Promise<PaymentMethodsDTO>{
      return {
        paymentMethods: [ 
          {
            paymentMethodId: "1",
            cardNumber: "1234********1234",
            paymentMethodType: PaymentMethodType.CARD
          },
          {
            paymentMethodId: "2",
            cardNumber: "1236********1235",
            paymentMethodType: PaymentMethodType.CARD
          }
        ]
      }
  }

  @Post("/addPaymentMethod")
  @ApiResponse({status:HttpStatus.OK,   type: PaymentMethodDTO})
  async addPaymentMethod(@Body() methodDetails: AddPaymentMethodDTO): Promise<PaymentMethodDTO>{
    return null;
  }

  @Delete("/removePaymentMethod/:paymentMethodId")
  @ApiResponse({status:HttpStatus.OK,  type: String})
  async removePaymentMethod(@Param('paymentMethodId') paymentMethodId): Promise<string>{
    return null;
  }

  @Put("/updatePaymentMethod")
  @ApiResponse({status:HttpStatus.OK,   type: UserDTO})
  async updatePaymentMethod(@Body() methodDetails: string): Promise<UserDTO>{ //TODO add UPDATE PAYMENT METHOD DTO
    return null;
  }

}