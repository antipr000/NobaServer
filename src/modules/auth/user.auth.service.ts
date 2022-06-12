import { Inject, Injectable } from "@nestjs/common";
import { UserDTO } from "../user/dto/UserDTO";
import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";
import { consumerIdentityIdentifier } from "./domain/IdentityType";

@Injectable()
export class UserAuthService extends AuthService {
  private readonly identityType: string = consumerIdentityIdentifier;

  @Inject()
  private readonly userService: UserService;

  protected getIdentityType(): string {
    return this.identityType;
  }

  protected async getUserId(emailOrPhone: string): Promise<string> {
    const userDto: UserDTO = await this.userService.createUserIfFirstTimeLogin(emailOrPhone);
    return userDto._id;
  }
}
