import { Body, Controller, Get, HttpStatus, Inject, Param, Put, Request } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Role } from '../auth/role.enum';
import { Roles, UserID } from '../auth/roles.decorator';
import { UserDTO } from './dto/UserDTO';
import { UserService } from './user.service';


@Roles(Role.User)
@ApiBearerAuth()
@Controller("user/:"+UserID)
export class UserController {

  @Inject(WINSTON_MODULE_PROVIDER) 
  private readonly logger: Logger;

  constructor(private readonly userService: UserService) {

  }
 
  @Get("/")
  @ApiOperation({ summary: 'Get noba user ID of currently logged in user' })
  @ApiResponse({status:HttpStatus.OK,   type: UserDTO, description: 'Returns the user ID of the currently logged in user'})
  @ApiBadRequestResponse({ description: 'Invalid request parameters' })
  async getUser(@Param(UserID)id: string): Promise<UserDTO>{
    return await this.userService.getUser(id);
  }

  @Put("/")
  @ApiOperation({ summary: 'Update user details for currently logged in user' })
  @ApiResponse({ status: HttpStatus.OK, type: UserDTO, description: 'Update user details on the Noba server for currrenly logged in user' })
  @ApiBadRequestResponse({ description: 'Invalid request parameters' })
  async updateUser(@Param(UserID)id: string, @Request() request, @Body() requestBody): Promise<UserDTO> {
    const userProps = {
      ...request.user._doc,
      ...requestBody
    };
    return await this.userService.updateUser(userProps);
  }

}