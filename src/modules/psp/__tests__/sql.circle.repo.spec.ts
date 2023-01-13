import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { ICircleRepo } from "../repos/circle.repo";
import { SQLCircleRepo } from "../repos/sql.circle.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { IConsumerRepo } from "../../consumer/repos/consumer.repo";
import { SQLConsumerRepo } from "../../consumer/repos/sql.consumer.repo";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { v4 } from "uuid";
import { Utils } from "../../../core/utils/Utils";

describe("CircleRepoTests", () => {
  jest.setTimeout(20000);

  let consumerRepo: IConsumerRepo;
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
      providers: [PrismaService, SQLCircleRepo, SQLConsumerRepo],
    }).compile();

    consumerRepo = app.get<SQLConsumerRepo>(SQLConsumerRepo);
    circleRepo = app.get<SQLCircleRepo>(SQLCircleRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.cryptoWallet.deleteMany();
    await prismaService.address.deleteMany();
    await prismaService.verification.deleteMany();
    await prismaService.consumer.deleteMany();
    await prismaService.circle.deleteMany();
    app.close();
  });

  describe("getCircleWalletID", () => {
    it("should get a circle wallet id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await consumerRepo.createConsumer(consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      const result = await circleRepo.addConsumerCircleWalletID(consumerID, walletID);
      const circleResult = await circleRepo.getCircleWalletID(consumerID);
      expect(circleResult.isSuccess).toBe(true);
      expect(circleResult.getValue()).toEqual(walletID);
    });

    it("should fail to get a circle wallet id", async () => {
      const circleResult = await circleRepo.getCircleWalletID("does-not-exist");
      expect(circleResult.isFailure).toBe(true);
    });
  });

  describe("addConsumerCircleWalletID", () => {
    it("should add a consumer circle wallet id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await consumerRepo.createConsumer(consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      const result = await circleRepo.addConsumerCircleWalletID(consumerID, walletID);
      expect(result.props.consumerID).toEqual(consumerID);
      expect(result.props.walletID).toEqual(walletID);
      const circleResult = await circleRepo.getCircleWalletID(consumerID);
      expect(circleResult.isSuccess).toBe(true);
      expect(circleResult.getValue()).toEqual(walletID);
    });

    it("should fail to add duplicate consumer circle wallet id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await consumerRepo.createConsumer(consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      await circleRepo.addConsumerCircleWalletID(consumerID, walletID);
      expect(circleRepo.addConsumerCircleWalletID(consumerID, walletID)).rejects.toThrow();
    });

    it("should fail to add a consumer circle wallet id", async () => {
      expect(circleRepo.addConsumerCircleWalletID(null, null)).rejects.toThrow();
    });
  });
});

// Consider refactoring this into a test utils file
const getRandomUser = (): Consumer => {
  const email = `${v4()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: `${v4()}_${new Date().valueOf()}`,
    firstName: "Noba",
    lastName: "lastName",
    email: email,
    displayEmail: email,
    referralCode: Utils.getAlphaNanoID(15),
    handle: `@${v4()}`,
  };
  return Consumer.createConsumer(props);
};
