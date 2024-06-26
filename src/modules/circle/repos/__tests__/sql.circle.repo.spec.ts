import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { ICircleRepo } from "../circle.repo";
import { SQLCircleRepo } from "../sql.circle.repo";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { Consumer, ConsumerProps } from "../../../consumer/domain/Consumer";
import { v4 } from "uuid";
import { Utils } from "../../../../core/utils/Utils";
import { RepoErrorCode } from "../../../../core/exception/repo.exception";
import { AlertService } from "../../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

describe("CircleRepoTests", () => {
  jest.setTimeout(20000);

  let circleRepo: ICircleRepo;
  let app: TestingModule;
  let prismaService: PrismaService;
  let mockAlertService: AlertService;

  beforeAll(async () => {
    mockAlertService = getMockAlertServiceWithDefaults();
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        PrismaService,
        SQLCircleRepo,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

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
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });
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
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      const result = await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });
      expect(result.consumerID).toEqual(consumerID);
      expect(result.walletID).toEqual(walletID);
      expect(result.currentBalance).toBeUndefined();
      const circleResult = await circleRepo.getCircleWalletID(consumerID);
      expect(circleResult.isSuccess).toBe(true);
      expect(circleResult.getValue()).toEqual(walletID);
    });

    it("should fail to add duplicate consumer circle wallet id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });
      expect(
        circleRepo.addConsumerCircleWalletID({
          consumerID,
          walletID,
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should fail to add a consumer circle wallet id", async () => {
      expect(
        circleRepo.addConsumerCircleWalletID({
          consumerID: null,
          walletID: null,
        }),
      ).rejects.toThrowError();
    });

    it("should fail if consumer does not exist", async () => {
      const walletID = Math.random().toString(36).substring(7);
      expect(
        circleRepo.addConsumerCircleWalletID({
          consumerID: "does-not-exist",
          walletID,
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });
  });

  describe("updateCurrentBalance", () => {
    it("should update current balance", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      const circleData = await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });
      expect(circleData.currentBalance).toBeUndefined();

      // Update the balance
      const updatedCircleData = await circleRepo.updateCurrentBalance(walletID, {
        currentBalance: 100,
      });

      expect(updatedCircleData.currentBalance).toBe(100);

      const balance = await circleRepo.getCircleBalance(consumerID);
      expect(balance).toBe(100);
    });

    it("should throw RepoException if it fails to update", async () => {
      await expect(
        circleRepo.updateCurrentBalance("fake-wallet-id", {
          currentBalance: 100,
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.NOT_FOUND);
    });
  });

  describe("getCircleBalance", () => {
    it("should get circle balance by wallet id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });

      let balance = await circleRepo.getCircleBalance(walletID);
      expect(balance).toBeNull();

      await circleRepo.updateCurrentBalance(walletID, {
        currentBalance: 200,
      });

      balance = await circleRepo.getCircleBalance(walletID);

      expect(balance).toBe(200);
    });

    it("should get circle balance by consumer id", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);
      await circleRepo.addConsumerCircleWalletID({
        consumerID,
        walletID,
      });

      let balance = await circleRepo.getCircleBalance(consumerID);
      expect(balance).toBeNull();

      await circleRepo.updateCurrentBalance(walletID, {
        currentBalance: 200,
      });

      balance = await circleRepo.getCircleBalance(consumerID);

      expect(balance).toBe(200);
    });

    it("should return null if consumerOrWallet id does not exist", async () => {
      await expect(circleRepo.getCircleBalance("fake-wallet")).resolves.toBeNull();
    });

    it("should return null when balance is not populated", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const consumerID = createdConsumer.props.id;
      const walletID = Math.random().toString(36).substring(7);

      await prismaService.circle.create({
        data: {
          id: v4(),
          consumerID: consumerID,
          walletID: walletID,
        },
      });

      await expect(circleRepo.getCircleBalance(consumerID)).resolves.toBeNull();
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

const createConsumer = async (prismaService: PrismaService, consumer: Consumer): Promise<Consumer> => {
  const createdConsumer = await prismaService.consumer.create({
    data: {
      id: consumer.props.id,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      email: consumer.props.email,
      displayEmail: consumer.props.displayEmail,
      phone: consumer.props.phone,
      handle: consumer.props.handle,
      referralCode: consumer.props.referralCode,
    },
  });

  return Consumer.createConsumer(createdConsumer);
};
