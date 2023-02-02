import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { v4 } from "uuid";
import { Utils } from "../../../core/utils/Utils";
import { IPushTokenRepo } from "../repos/pushtoken.repo";
import { SQLPushTokenRepo } from "../repos/sql.pushtoken.repo";
import { when } from "ts-mockito";
import { RepoException } from "../../../core/exception/repo.exception";

describe("PushtokenRepoTests", () => {
  jest.setTimeout(20000);

  let pushTokenRepo: IPushTokenRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLPushTokenRepo],
    }).compile();

    pushTokenRepo = app.get<SQLPushTokenRepo>(SQLPushTokenRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.pushToken.deleteMany();
    app.close();
  });

  describe("getPushToken", () => {
    it("should return a push token", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const createdPushToken = await pushTokenRepo.addPushToken(createdConsumer.props.id, "token");

      const pushToken = await pushTokenRepo.getPushToken(createdConsumer.props.id, "token");
      expect(pushToken).toBeDefined();
    });

    it("should return null if push token does not exist", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const pushToken = await pushTokenRepo.getPushToken(createdConsumer.props.id, "fcm");
      expect(pushToken).toBeNull();
    });
  });

  describe("addPushToken", () => {
    it("should add a push token", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const createdPushToken = await pushTokenRepo.addPushToken(createdConsumer.props.id, "token");

      expect(createdPushToken).toBeDefined();
    });
  });

  describe("deletePushToken", () => {
    it("should delete a push token", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const createdPushToken = await pushTokenRepo.addPushToken(createdConsumer.props.id, "token");

      const deletedPushToken = await pushTokenRepo.deletePushToken(createdConsumer.props.id, "token");
      expect(deletedPushToken).toBeDefined();
    });

    it("should return null if push token does not exist", async () => {
      const consumer = getRandomUser();
      const createdConsumer = await createConsumer(prismaService, consumer);
      const deletedPushToken = await pushTokenRepo.deletePushToken(createdConsumer.props.id, "token");
      expect(deletedPushToken).toBeNull();
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
