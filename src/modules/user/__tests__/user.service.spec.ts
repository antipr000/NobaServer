import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { UserController } from "../user.controller";
import { UserService } from "../user.service";
import { mockedUserRepo } from "../mocks/userrepomock";
import { userID, userDTO, userEmail } from "../../../core/tests/constants";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IUserRepo } from "../repos/UserRepo";
import { StripeService } from "../../common/stripe.service";
import { User } from "../domain/User";
import { STRIPE_CONFIG_KEY, STRIPE_SECRET_KEY } from "../../../config/ConfigurationUtils";

describe("UserService", () => {
  let userService: UserService;
  let userRepo: IUserRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    const UserRepoProvider = {
      provide: "IUserRepo",
      useFactory: () => instance(mockedUserRepo),
    };

    // TODO: Add mock for 'StripeService'
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [STRIPE_CONFIG_KEY]: {
            [STRIPE_SECRET_KEY]: "Dummy Stripe Secret"
          }
        }),
        getTestWinstonModule(),
      ],
      controllers: [UserController],
      providers: [UserRepoProvider, UserService, StripeService],
    }).compile();

    userService = app.get<UserService>(UserService);
    userRepo = app.get<IUserRepo>("IUserRepo");
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
