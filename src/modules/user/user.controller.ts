import { Controller, Get, Inject, Param,  HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserDTO } from './dto/UserDTO';
import { Roles, UserID } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { ApiResponse } from '@nestjs/swagger';


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

}