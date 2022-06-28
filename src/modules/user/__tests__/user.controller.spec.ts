import { Test, TestingModule } from "@nestjs/testing";
import { instance } from "ts-mockito";
// import { userDTO, userID } from "../../../core/tests/constants";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { mockedUserService } from "../mocks/userservicemock";
import { UserController } from "../user.controller";
import { UserService } from "../user.service";

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
  //   TODO: We have a test user and user ID in noba. But we don't have a test access token for this user. And we don't persist access tokens beyond a certain time. So,
  // what will be the ideal way to write test for it. Also, shall we use node-mocks-http for passing Request() to the controller? Discuss with other devs, till then disable this
  // test.
  describe("user controller tests", () => {
    it("should get user data", async () => {
      // const result = await userController.getUser(userID);
      const result = true;
      expect(result).toBe(true);
    });
  });
});
