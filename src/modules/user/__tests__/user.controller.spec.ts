import { TestingModule, Test } from "@nestjs/testing";
import { instance } from "ts-mockito";
import { UserController } from "../user.controller";
import { UserService } from "../user.service";
import { mockedUserService } from "../mocks/userservicemock";
import { userID, userDTO } from "../../../core/tests/constants";
import { getTestWinstonModule, getWinstonModule } from "../../../core/utils/WinstonModule";
import { getAppConfigModule, TestConfigModule } from "../../../core/utils/AppConfigModule";

describe("UserController", () => {
  let userController: UserController;
  let spyService: UserService;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    const UserServiceProvider = {
      provide: UserService,
      useFactory: () => instance(mockedUserService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [UserController],
      providers: [UserServiceProvider],
    }).compile();

    userController = app.get<UserController>(UserController);
    spyService = app.get<UserService>(UserService);
  });

  describe("user controller tests", () => {
    it("should get user data", async () => {
      const result = await userController.getUser(userID);
      expect(result).toBe(userDTO);
    });
  });
});
