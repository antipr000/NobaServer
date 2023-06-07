import { NobaCard as PrismaNobaCardModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { createTestConsumer } from "../../../../modules/consumer/test_utils/test.utils";
import { NobaCardRepo } from "../repos/card.repo";
import { SQLNobaCardRepo } from "../repos/sql.card.repo";
import { CardProvider, NobaCard } from "../domain/NobaCard";
import { createNobaCard } from "../test_utils/util";
import { AlertService } from "../../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

const getAllNobaCardsRecords = async (prismaService: PrismaService): Promise<PrismaNobaCardModel[]> => {
  return prismaService.nobaCard.findMany({});
};

describe("SqlNobaCardRepo", () => {
  jest.setTimeout(20000);

  let nobaCardRepo: NobaCardRepo;
  let app: TestingModule;
  let prismaService: PrismaService;
  let mockAlertService: AlertService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    mockAlertService = getMockAlertServiceWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        PrismaService,
        SQLNobaCardRepo,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    nobaCardRepo = app.get<SQLNobaCardRepo>(SQLNobaCardRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  beforeEach(async () => {
    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    await prismaService.nobaCard.deleteMany();
    await prismaService.pomeloCard.deleteMany();
    await prismaService.consumer.deleteMany();
  });

  describe("getCardsByConsumerID", () => {
    it("should return an empty array if there are no cards for specified consumerID", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);

      const response = await nobaCardRepo.getCardsByConsumerID(uuid());

      expect(response).toHaveLength(0);
    });

    it("should return all the cards for the specified consumerID", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const nobaCard11: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const nobaCard12: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);

      const consumerID2: string = await createTestConsumer(prismaService);
      const nobaCard21: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const nobaCard22: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const nobaCard23: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);

      const response = await nobaCardRepo.getCardsByConsumerID(consumerID2);

      expect(response).toHaveLength(3);
      expect(response).toContainEqual(nobaCard23);
      expect(response).toContainEqual(nobaCard22);
      expect(response).toContainEqual(nobaCard21);
    });
  });

  describe("getCardsByID", () => {
    it("should return null if NobaCard with specified 'id' is not found", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);

      const response = await nobaCardRepo.getCardByID(uuid());

      expect(response).toBeNull();
    });

    it("should return the NobaCard with the specified 'id'", async () => {
      const consumerID1: string = await createTestConsumer(prismaService);
      const nobaCard11: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const nobaCard12: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);

      const consumerID2: string = await createTestConsumer(prismaService);
      const nobaCard21: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const nobaCard22: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const nobaCard23: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);

      const response = await nobaCardRepo.getCardByID(nobaCard22.id);

      expect(response).toStrictEqual(nobaCard22);
    });
  });
});
