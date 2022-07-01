import { Body, Controller, Get, HttpStatus, Inject, Patch, Request } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
//import { KMSUtil } from "src/core/utils/KMSUtil";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { UserDTO } from "./dto/UserDTO";
import { UserService } from "./user.service";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("users")
@ApiTags("User")
export class UserController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly userService: UserService) {}

  @Get("/")
  @ApiOperation({ summary: "Get noba user ID of currently logged in user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserDTO,
    description: "Returns the user ID of the currently logged in user",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getUser(@Request() request): Promise<UserDTO> {
    const userID: string = request.user.props._id;
    return await this.userService.getUser(userID);
  }

  @Patch("/")
  @ApiOperation({ summary: "Update user details for currently logged in user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserDTO,
    description: "Update user details on the Noba server for currrenly logged in user",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updateUser(@Request() request, @Body() requestBody): Promise<UserDTO> {
    const userProps = {
      ...request.user.props,
      ...requestBody,
    };
    return await this.userService.updateUser(userProps);
  }

  /* Example of how we can decrypt the SSN. This should only be available to the compliance team.
  @Get("/ssn")
  @ApiOperation({ summary: "Get SSN of currently logged in user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Get SSN of currently logged in user",
  })
  async getUserSSN(@Request() request): Promise<string> {
    const userID: string = request.user.props._id;
    const user = await this.userService.getUser(userID);
    const decrypted = await new KMSUtil("ssn-encryption-key").decryptString(user.socialSecurityNumber);
    return decrypted;
  }*/
}
