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



@Injectable()
export class UserService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly userRepo: IUserRepo;
  private readonly userMapper: UserMapper;

  constructor(dbProvider: DBProvider) {
    this.userRepo = new DyanamoDBUserRepo(dbProvider);
    this.userMapper = new UserMapper();
  }

  async getUser(id: string): Promise<UserDTO> {
    const res: User = await this.userRepo.getUser(id);
    return this.userMapper.toDTO(res);
  }
}
