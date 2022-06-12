import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { UserController } from "../user.controller";
import { UserService } from "../user.service";
import { mockedUserRepo } from "../mocks/userrepomock";
import { userID, userDTO, userEmail } from "../../../core/tests/constants";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule } from "../../../core/utils/AppConfigModule";
import { IUserRepo } from "../repos/UserRepo";
import { CommonModule } from "../../common/common.module";
import { StripeService } from "../../common/stripe.service";
import { User } from "../domain/User";

describe("UserService", () => {
  let userService: UserService;
  let userRepo: IUserRepo;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };
    const UserRepoProvider = {
      provide: IUserRepo,
      useFactory: () => instance(mockedUserRepo),
    };
    const app: TestingModule = await Test.createTestingModule({
      imports: [getWinstonModule(), getAppConfigModule(), CommonModule],
      controllers: [UserController],
      providers: [UserRepoProvider, UserService, StripeService],
    }).compile();

    userService = app.get<UserService>(UserService);
    userRepo = app.get<IUserRepo>(IUserRepo);
  });

  describe("user service tests", () => {
    it("should create user", async () => {
      const result = await userService.createUserIfFirstTimeLogin(userEmail);
      expect(result).toStrictEqual(userDTO);
    });

    it("should get user given id", async () => {
      const result = await userService.getUser(userID);
      expect(result).toStrictEqual(userDTO);
    });
  });

  it("should get user given email", async () => {
    const result = await userService.findUserByEmailOrPhone(userEmail);
    const user = User.createUser(userDTO);
    expect(result.getValue()).toStrictEqual(user);
  });
});
