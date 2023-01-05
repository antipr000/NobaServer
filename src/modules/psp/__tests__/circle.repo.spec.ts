import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { ICircleRepo } from "../repos/CircleRepo";
import { SQLCircleRepo } from "../repos/SQLCircleRepo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Entity } from "../../../core/domain/Entity";

describe("CircleRepoTests", () => {
  jest.setTimeout(20000);

  let circleRepo: ICircleRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLCircleRepo],
    }).compile();

    circleRepo = app.get<SQLCircleRepo>(SQLCircleRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  describe("getCircleWalletID", () => {
    it("should get a circle wallet id", async () => {
      const consumerID = Entity.getNewID();
      const walletID = Math.random().toString(36).substring(7);
      const result = await circleRepo.addConsumerCircleWalletID(consumerID, walletID);
      const circleResult = await circleRepo.getCircleWalletID(consumerID);
      expect(circleResult.isSuccess).toBe(true);
      expect(circleResult.getValue()).toEqual(walletID);
    });
  });

  // describe("addConsumerCircleWalletID", () => {
  //   it("should add a consumer circle wallet id", async () => {
  //     const consumer = getRandomUser();
  //     const result = await consumerRepo.createConsumer(consumer);
  //     const savedResult = await consumerRepo.getConsumer(result.props.id);
  //     const circle = await circleRepo.addConsumerCircleWalletID(consumerID, circleWalletID);
  //     expect(circle.props.consumerID).toEqual(consumerID);
  //     expect(circle.props.walletID).toEqual(circleWalletID);
  //   });
  // });
});
