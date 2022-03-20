import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { User } from "./domain/User";
import { IUserRepo, DyanamoDBUserRepo } from "./repos/UserRepo";
import { UserDTO } from "./dto/UserDTO";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserMapper } from "./mappers/UserMapper";
import { StripeService } from "../common/stripe.service";



@Injectable()
export class UserService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly userRepo: IUserRepo;
  private readonly userMapper: UserMapper;
  

  constructor(dbProvider: DBProvider, private readonly stripeService: StripeService) {
    this.userRepo = new DyanamoDBUserRepo(dbProvider);
    this.userMapper = new UserMapper();
  }

  async getUser(id: string): Promise<UserDTO> {
    const res: User = await this.userRepo.getUser(id);
    return this.userMapper.toDTO(res);
  }

  async createUserIfFirstTimeLogin(emailID: string): Promise<UserDTO> {
    const userResult = await this.userRepo.getUserByEmail(emailID);
    if (userResult.isFailure) { //user doesn't exist already
      //first create stripe customer
      this.logger.info(`Creating user for first time for ${emailID}`);
      const stripeCustomer = await this.stripeService.stripeApi.customers.create({ email: emailID});
      const stripeCustomerID = stripeCustomer.id;
      const newUser = User.createUser({email: emailID, stripeCustomerID});
      await this.userRepo.createUser(newUser);
      return this.userMapper.toDTO(newUser);
    }

    return this.userMapper.toDTO(userResult.getValue());
  }


}
