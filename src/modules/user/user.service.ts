import { Inject, Injectable } from "@nestjs/common";
import { User, UserProps } from "./domain/User";
import { UserDTO } from "./dto/UserDTO";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserMapper } from "./mappers/UserMapper";
import { StripeService } from "../common/stripe.service";
import { Result } from "src/core/logic/Result";
import { UserVerificationStatus } from "./domain/UserVerificationStatus";
import { VerificationStatusType } from "../../modules/user/domain/Types";
import { IUserRepo } from "./repos/UserRepo";

@Injectable()
export class UserService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  private readonly userMapper: UserMapper;

  constructor(private readonly userRepo: IUserRepo, private readonly stripeService: StripeService) {
    this.userMapper = new UserMapper();
  }

  async getUser(id: string): Promise<UserDTO> {
    const res: User = await this.userRepo.getUser(id);
    return this.userMapper.toDTO(res);
  }

  async createUserIfFirstTimeLogin(emailOrPhone: string): Promise<UserDTO> {
    const isEmail = emailOrPhone.includes("@");
    const email = isEmail ? emailOrPhone : null;
    const phone = !isEmail ? emailOrPhone : null;

    const userResult = await this.findUserByEmailOrPhone(emailOrPhone);
    if (userResult.isFailure) {
      //user doesn't exist already
      //first create stripe customer
      this.logger.info(`Creating user for first time for ${emailOrPhone}`);
      const stripeCustomer = await this.stripeService.stripeApi.customers.create({ email: email, phone: phone });
      const stripeCustomerID = stripeCustomer.id;
      const newUser = User.createUser({ email: email, phone: phone, stripeCustomerID });
      await this.userRepo.createUser(newUser);
      return this.userMapper.toDTO(newUser);
    }

    return this.userMapper.toDTO(userResult.getValue());
  }

  async updateUser(userProps: Partial<UserProps>): Promise<UserDTO> {
    const user = User.createUser(userProps);
    const updatedUser = await this.userRepo.updateUser(user);
    return this.userMapper.toDTO(updatedUser);
  }

  async findUserByEmailOrPhone(emailOrPhone: string): Promise<Result<User>> {
    const isEmail = emailOrPhone.includes("@");
    const userResult = isEmail
      ? await this.userRepo.getUserByEmail(emailOrPhone)
      : await this.userRepo.getUserByPhone(emailOrPhone);
    return userResult;
  }

  async findUserById(userId: string): Promise<User> {
    return this.userRepo.getUser(userId);
  }

  getVerificationStatus(user: UserProps): UserVerificationStatus {
    if (user.verificationStatus === VerificationStatusType.VERIFIED  && user.documentVerified) return UserVerificationStatus.VERIFIED;
    else if (user.verificationStatus === VerificationStatusType.VERIFIED) return UserVerificationStatus.PARTIALLY_VERIFIED;
    return UserVerificationStatus.NOT_VERIFIED;
  }
}
