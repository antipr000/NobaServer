import { Inject, Injectable } from "@nestjs/common";
import { UserDTO } from "../user/dto/UserDTO";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { consumerIdentityIdentifier } from "./domain/IdentityType";
import { OTPRepo } from "./repo/OTPRepo";

@Injectable()
export class UserAuthService extends AuthService {
  private readonly identityType: string = consumerIdentityIdentifier;

  @Inject()
  private readonly userService: UserService;

  getIdentityType() {
    return this.identityType;
  }

  async getUserId(emailOrPhone: string): Promise<string> {
    const userDto: UserDTO = await this.userService.createUserIfFirstTimeLogin(emailOrPhone);
    return userDto._id;
  }
}