import {
  PomeloUser as PrismaPomeloUserModel,
  PomeloCard as PrimsaPomeloCardModel,
  NobaCard as PrismaNobaCardModel,
  PomeloTransaction as PrismaPomeloTransactionModel,
} from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { RepoErrorCode, RepoException } from "../../../../core/exception/repo.exception";
import { PomeloUser, PomeloUserSaveRequest } from "../../domain/PomeloUser";
import { PomeloRepo } from "../pomelo.repo";
import { SQLPomeloRepo } from "../sql.pomelo.repo";
import { createTestConsumer } from "../../../consumer/test_utils/test.utils";
import {
  createPomeloCardWithPredefinedPomeloUser,
  createPomeloCardWithPomeloUser,
  createPomeloTransaction,
  createPomeloUser,
} from "../../public/test_utils/util";
import { PomeloCard, PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../../domain/PomeloCard";
import { CardProvider, NobaCard, NobaCardStatus, NobaCardType } from "../../../psp/card/domain/NobaCard";
import { createNobaCard } from "../../../psp/card/test_utils/util";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransaction,
  PomeloTransactionSaveRequest,
  PomeloTransactionStatus,
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";
import { AlertService } from "../../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

const getAllPomeloUserRecords = async (prismaService: PrismaService): Promise<PrismaPomeloUserModel[]> => {
  return prismaService.pomeloUser.findMany({});
};

const getAllPomeloTransactionRecords = async (
  prismaService: PrismaService,
): Promise<PrismaPomeloTransactionModel[]> => {
  return prismaService.pomeloTransaction.findMany({});
};

const getAllPomeloCardRecords = async (prismaService: PrismaService): Promise<PrimsaPomeloCardModel[]> => {
  return prismaService.pomeloCard.findMany({});
};

const getAllNobaCardRecords = async (prismaService: PrismaService): Promise<PrismaNobaCardModel[]> => {
  return prismaService.nobaCard.findMany({});
};

describe("SqlPomeloRepoTests", () => {
  jest.setTimeout(20000);

  let pomeloRepo: PomeloRepo;
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
        SQLPomeloRepo,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    pomeloRepo = app.get<SQLPomeloRepo>(SQLPomeloRepo);
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

    await prismaService.pomeloUser.deleteMany();
    await prismaService.pomeloCard.deleteMany();
    await prismaService.consumer.deleteMany();
  });

  describe("createPomeloUser", () => {
    it("should throw an error if the consumer does not exist", async () => {
      const pomeloUserSaveRequest: PomeloUserSaveRequest = {
        consumerID: uuid(),
        pomeloUserID: uuid(),
      };
      try {
        await pomeloRepo.createPomeloUser(pomeloUserSaveRequest);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
      }

      expect(await getAllPomeloUserRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'pomeloUserID' is not specified", async () => {
      const pomeloUserSaveRequest: PomeloUserSaveRequest = {
        consumerID: uuid(),
      } as any;
      try {
        await pomeloRepo.createPomeloUser(pomeloUserSaveRequest);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloUserID"));
      }

      expect(await getAllPomeloUserRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'consumerID' is not specified", async () => {
      const pomeloUserSaveRequest: PomeloUserSaveRequest = {
        pomeloUserID: uuid(),
      } as any;
      try {
        await pomeloRepo.createPomeloUser(pomeloUserSaveRequest);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("consumerID"));
      }

      expect(await getAllPomeloUserRecords(prismaService)).toStrictEqual([]);
    });

    it("should create a PomeloUser", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUserSaveRequest: PomeloUserSaveRequest = {
        consumerID: consumerID,
        pomeloUserID: uuid(),
      };
      const response = await pomeloRepo.createPomeloUser(pomeloUserSaveRequest);

      const allUsers = await getAllPomeloUserRecords(prismaService);
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toStrictEqual({
        consumerID: consumerID,
        pomeloID: pomeloUserSaveRequest.pomeloUserID,
        id: response.id,
        createdTimestamp: response.createdTimestamp,
        updatedTimestamp: response.updatedTimestamp,
      });
    });
  });

  describe("getPomeloUserByConsumerID", () => {
    it("should return null when matching 'consumerID' is not found", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1: PomeloUser = await createPomeloUser(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2: PomeloUser = await createPomeloUser(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloUserByConsumerID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloUser with the matching 'consumerID'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1: PomeloUser = await createPomeloUser(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2: PomeloUser = await createPomeloUser(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloUserByConsumerID(consumerID1);

      expect(response).toStrictEqual(pomeloUser1);
    });
  });

  describe("getPomeloUserByPomeloID", () => {
    it("should return null when matching 'pomeloID' is not found", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1: PomeloUser = await createPomeloUser(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2: PomeloUser = await createPomeloUser(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloUserByPomeloUserID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloUser with the matching 'pomeloID'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1: PomeloUser = await createPomeloUser(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2: PomeloUser = await createPomeloUser(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloUserByPomeloUserID(pomeloUser1.pomeloID);

      expect(response).toStrictEqual(pomeloUser1);
    });
  });

  describe("createPomeloCard", () => {
    it("should throw an error if the consumer does not exist", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        pomeloUserID: uuid(),
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
        last4Digits: "1234",
      };
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'pomeloCardID' is not specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloUserID: uuid(),
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloCardID"));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'nobaConsumerID' is not specified", async () => {
      const request: PomeloCardSaveRequest = {
        pomeloCardID: uuid(),
        pomeloUserID: uuid(),
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("nobaConsumerID"));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'pomeloUserID' is not specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloUserID"));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error an invalid value for 'status' is specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        pomeloUserID: uuid(),
        status: "INVALID_STATUS",
        type: NobaCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("status"));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error an invalid value for 'type' is specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        pomeloUserID: uuid(),
        status: NobaCardStatus.ACTIVE,
        type: "INVALID_TYPE",
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("type"));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw error if the 'pomeloUserID' is invalid", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const pomeloCardID: string = uuid();

      const request: PomeloCardSaveRequest = {
        nobaConsumerID: consumerID,
        pomeloUserID: uuid(),
        pomeloCardID: pomeloCardID,
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
        last4Digits: "1234",
      };

      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
      expect(await getAllNobaCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should create a PomeloCard & NobaCard simultaneously", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const pomeloUser: PomeloUser = await createPomeloUser(consumerID, prismaService);
      const pomeloCardID: string = uuid();

      const request: PomeloCardSaveRequest = {
        nobaConsumerID: consumerID,
        pomeloUserID: pomeloUser.pomeloID,
        pomeloCardID: pomeloCardID,
        status: NobaCardStatus.ACTIVE,
        type: NobaCardType.VIRTUAL,
        last4Digits: "1234",
      };

      const response: NobaCard = await pomeloRepo.createPomeloCard(request);

      expect(response.provider).toBe(CardProvider.POMELO);
      expect(response.consumerID).toBe(request.nobaConsumerID);
      expect(response.type).toBe(request.type);
      expect(response.status).toBe(request.status);

      const allPomeloCards = await getAllPomeloCardRecords(prismaService);
      expect(allPomeloCards).toHaveLength(1);
      expect(allPomeloCards[0]).toStrictEqual({
        pomeloUserID: pomeloUser.pomeloID,
        pomeloCardID: request.pomeloCardID,
        nobaCardID: response.id,
        id: expect.any(String),
        createdTimestamp: expect.any(Date),
        updatedTimestamp: expect.any(Date),
      });

      const allNobaCards = await getAllNobaCardRecords(prismaService);
      expect(allNobaCards).toHaveLength(1);
      expect(allNobaCards[0]).toStrictEqual({
        consumerID: consumerID,
        provider: CardProvider.POMELO,
        type: request.type,
        status: request.status,
        id: response.id,
        createdTimestamp: response.createdTimestamp,
        updatedTimestamp: response.updatedTimestamp,
        last4Digits: request.last4Digits,
      });
    });
  });

  describe("updatePomeloCard", () => {
    it("should throw error if 'nobaCardID' is not specified", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const request: PomeloCardUpdateRequest = {
        status: NobaCardStatus.BLOCKED,
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("nobaCardID"));
      }

      const allCards = await getAllNobaCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(NobaCardStatus.ACTIVE);
    });

    it("should throw error if 'status' is not specified", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaCardID: nobaCard.id,
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("status"));
      }

      const allCards = await getAllNobaCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(NobaCardStatus.ACTIVE);
    });

    it("should throw error if 'status' value is not valid", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaCardID: nobaCard.id,
        status: "INVALID_STATUS",
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("status"));
      }

      const allCards = await getAllNobaCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(NobaCardStatus.ACTIVE);
    });

    it("should throw NOT_FOUND error if the requested `nobaCardID` record was not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaCardID: uuid(),
        status: NobaCardStatus.BLOCKED,
      };
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.NOT_FOUND);
        expect(err.message).toEqual(expect.stringContaining("nobaCardID"));
        expect(err.message).toEqual(expect.stringContaining(`${request.nobaCardID}`));
      }

      const allCards = await getAllNobaCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(NobaCardStatus.ACTIVE);
    });

    it("should update the requested record successfully", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPomeloUser(consumerID1, nobaCard1.id, prismaService);

      const consumerID2 = await createTestConsumer(prismaService);
      const nobaCard2: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPomeloUser(consumerID2, nobaCard2.id, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaCardID: nobaCard2.id,
        status: NobaCardStatus.BLOCKED,
      };

      const response = await pomeloRepo.updatePomeloCard(request);

      const allCards = await getAllNobaCardRecords(prismaService);
      expect(allCards).toHaveLength(2);
      expect(allCards).toContainEqual(nobaCard1);
      expect(allCards).toContainEqual({
        ...nobaCard2,
        status: NobaCardStatus.BLOCKED,
        updatedTimestamp: expect.any(Date),
      });

      expect(allCards).toContainEqual(response);
    });
  });

  describe("getPomeloCardByPomeloCardID", () => {
    it("should return null when card with same 'pomeloCardID' doesn't exists", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const response = await pomeloRepo.getPomeloCardByPomeloCardID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloCard with the matching 'pomeloCardID'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUserID1 = await createPomeloUser(consumerID1, prismaService);
      const nobaCard11: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard11: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUserID1.pomeloID,
        nobaCard11.id,
        prismaService,
      );
      const nobaCard12: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard12: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUserID1.pomeloID,
        nobaCard12.id,
        prismaService,
      );

      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUserID2 = await createPomeloUser(consumerID2, prismaService);
      const nobaCard21: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard21: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUserID2.pomeloID,
        nobaCard21.id,
        prismaService,
      );
      const nobaCard22: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard22: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUserID2.pomeloID,
        nobaCard22.id,
        prismaService,
      );

      const response = await pomeloRepo.getPomeloCardByPomeloCardID(pomeloCard21.pomeloCardID);

      expect(response).toStrictEqual(pomeloCard21);
    });
  });

  describe("getPomeloCardByNobaCardID", () => {
    it("should return null when matching 'nobaCardID' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const response = await pomeloRepo.getPomeloCardByNobaCardID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloCard with the matching 'nobaCardID'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);

      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );

      const response = await pomeloRepo.getPomeloCardByNobaCardID(nobaCard2.id);

      expect(response).toStrictEqual(pomeloCard2);
    });
  });

  describe("getNobaConsumerIDHoldingPomeloCard", () => {
    it("should return null when matching card with '(pomeloCardID, pomeloUserID)' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPomeloUser(consumerID, nobaCard.id, prismaService);

      const response = await pomeloRepo.getNobaConsumerIDHoldingPomeloCard(uuid(), uuid());

      expect(response).toBe(null);
    });

    it("should return null if matching pomeloCardID doesn't belong to specified pomeloUserID", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID1, prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaCard2: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );

      const response = await pomeloRepo.getNobaConsumerIDHoldingPomeloCard(pomeloCard1.pomeloCardID, uuid());

      expect(response).toBe(null);
    });

    it("should return null if matching pomeloUserID exist but doesn't belong to specified pomeloCardID", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID1, prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaCard2: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );

      const response = await pomeloRepo.getNobaConsumerIDHoldingPomeloCard(uuid(), pomeloCard1.pomeloUserID);

      expect(response).toBe(null);
    });

    it("should return consumerID with the matching '(pomeloCardID, pomeloUserID)'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1 = await createPomeloUser(consumerID1, prismaService);
      const nobaCard11: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard11: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser1.pomeloID,
        nobaCard11.id,
        prismaService,
      );
      const nobaCard12: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard12: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser1.pomeloID,
        nobaCard12.id,
        prismaService,
      );

      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2 = await createPomeloUser(consumerID2, prismaService);
      const nobaCard21: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard21: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser2.pomeloID,
        nobaCard21.id,
        prismaService,
      );
      const nobaCard22: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard22: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser2.pomeloID,
        nobaCard22.id,
        prismaService,
      );

      const response = await pomeloRepo.getNobaConsumerIDHoldingPomeloCard(
        pomeloCard21.pomeloCardID,
        pomeloUser2.pomeloID,
      );

      expect(response).toStrictEqual(consumerID2);
    });
  });

  describe("createPomeloTransaction", () => {
    describe("Static Validation errors", () => {
      const completeRequest: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        settlementDate: "2023-05-22",
        parentPomeloTransactionID: null,
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        pomeloUserID: uuid(),
        amountInUSD: 10,
        localAmount: 500,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 10,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 500,
        transactionCurrency: PomeloCurrency.COP,
        pomeloTransactionType: PomeloTransactionType.PURCHASE,
        pointType: PomeloPointType.ECOMMERCE,
        entryMode: PomeloEntryMode.CONTACTLESS,
        countryCode: "COL",
        origin: PomeloOrigin.DOMESTIC,
        source: PomeloSource.CLEARING,
        merchantName: "MERCHANT NAME",
        merchantMCC: "MCC",
      };

      const requiredFields = [
        "pomeloTransactionID",
        "settlementDate",
        "nobaTransactionID",
        "pomeloCardID",
        "pomeloUserID",
        "amountInUSD",
        "localAmount",
        "localCurrency",
        "pomeloIdempotencyKey",
        "settlementAmount",
        "settlementCurrency",
        "transactionAmount",
        "transactionCurrency",
        "pomeloTransactionType",
        "pointType",
        "entryMode",
        "countryCode",
        "origin",
        "source",
        "merchantName",
        "merchantMCC",
      ];
      it.each(requiredFields)("should throw an error if '%s' is not specified", async field => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(completeRequest));
        delete request[field];

        try {
          await pomeloRepo.createPomeloTransaction(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }

        expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
      });

      const enumFields = [
        "localCurrency",
        "settlementCurrency",
        "transactionCurrency",
        "pomeloTransactionType",
        "pointType",
        "entryMode",
        "origin",
        "source",
      ];
      it.each(enumFields)("should throw an error if the '%s' is invalid", async field => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(completeRequest));
        request[field] = "INVALID";

        try {
          await pomeloRepo.createPomeloTransaction(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }

        expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
      });
    });

    describe("Dynamic Validation errors", () => {
      let consumerID: string;
      let nobaCard: NobaCard;
      let pomeloCard: PomeloCard;
      let pomeloUser: PomeloUser;
      let validRequest: PomeloTransactionSaveRequest;

      beforeEach(async () => {
        consumerID = await createTestConsumer(prismaService);
        pomeloUser = await createPomeloUser(consumerID, prismaService);
        nobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
        pomeloCard = await createPomeloCardWithPredefinedPomeloUser(pomeloUser.pomeloID, nobaCard.id, prismaService);

        validRequest = {
          pomeloIdempotencyKey: uuid(),
          pomeloTransactionID: uuid(),
          settlementDate: "2022-05-22",
          parentPomeloTransactionID: null,
          nobaTransactionID: uuid(),
          pomeloCardID: pomeloCard.pomeloCardID,
          pomeloUserID: pomeloUser.pomeloID,
          amountInUSD: 10,
          localAmount: 500,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 10,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 500,
          transactionCurrency: PomeloCurrency.COP,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pointType: PomeloPointType.ECOMMERCE,
          entryMode: PomeloEntryMode.CONTACTLESS,
          countryCode: "COL",
          origin: PomeloOrigin.DOMESTIC,
          source: PomeloSource.CLEARING,
          merchantName: "MERCHANT NAME",
          merchantMCC: "MCC",
        };
      });

      it("should throw an error if the PomeloCard does not exist", async () => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequest));
        request.pomeloCardID = uuid();

        try {
          await pomeloRepo.createPomeloTransaction(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeInstanceOf(RepoException);
          expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
        }

        expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
      });

      it("should throw an error if the PomeloUser does not exist", async () => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequest));
        request.pomeloUserID = uuid();

        try {
          await pomeloRepo.createPomeloTransaction(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeInstanceOf(RepoException);
          expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
        }

        expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
      });

      it("should throw error if the specified 'parentPomeloTransactionID' doesn't exist", async () => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequest));
        request.parentPomeloTransactionID = uuid();

        try {
          await pomeloRepo.createPomeloTransaction(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeInstanceOf(RepoException);
          expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
        }

        expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
      });
    });

    describe("Success scenarios", () => {
      let consumerID: string;
      let nobaCard: NobaCard;
      let pomeloCard: PomeloCard;
      let pomeloUser: PomeloUser;
      let validRequestWithoutParentTransaction: PomeloTransactionSaveRequest;

      beforeEach(async () => {
        consumerID = await createTestConsumer(prismaService);
        pomeloUser = await createPomeloUser(consumerID, prismaService);
        nobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
        pomeloCard = await createPomeloCardWithPredefinedPomeloUser(pomeloUser.pomeloID, nobaCard.id, prismaService);

        validRequestWithoutParentTransaction = {
          pomeloIdempotencyKey: uuid(),
          pomeloTransactionID: uuid(),
          settlementDate: "2022-05-22",
          parentPomeloTransactionID: null,
          nobaTransactionID: uuid(),
          pomeloCardID: pomeloCard.pomeloCardID,
          pomeloUserID: pomeloUser.pomeloID,
          amountInUSD: 10,
          localAmount: 500,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 10,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 500,
          transactionCurrency: PomeloCurrency.COP,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pointType: PomeloPointType.ECOMMERCE,
          entryMode: PomeloEntryMode.CONTACTLESS,
          countryCode: "COL",
          origin: PomeloOrigin.DOMESTIC,
          source: PomeloSource.CLEARING,
          merchantName: "MERCHANT NAME",
          merchantMCC: "MCC",
        };
      });

      it("should successfully links the new transaction with specified 'parentPomeloTransactionID'", async () => {
        const request1: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequestWithoutParentTransaction));
        const pomeloTransaction1: PomeloTransaction = await pomeloRepo.createPomeloTransaction(request1);

        let request2: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequestWithoutParentTransaction));
        request2 = {
          ...request2,
          pomeloIdempotencyKey: uuid(),
          pomeloTransactionID: uuid(),
          parentPomeloTransactionID: request1.pomeloTransactionID,
          nobaTransactionID: uuid(),
        };
        const pomeloTransaction2: PomeloTransaction = await pomeloRepo.createPomeloTransaction(request2);

        expect(pomeloTransaction1).toStrictEqual({
          id: expect.any(String),
          pomeloCardID: request1.pomeloCardID,
          pomeloIdempotencyKey: request1.pomeloIdempotencyKey,
          pomeloTransactionID: request1.pomeloTransactionID,
          settlementDate: "2022-05-22",
          parentPomeloTransactionID: null,
          nobaTransactionID: request1.nobaTransactionID,
          amountInUSD: request1.amountInUSD,
          localAmount: request1.localAmount,
          localCurrency: request1.localCurrency,
          status: PomeloTransactionStatus.PENDING,
          countryCode: request1.countryCode,
          entryMode: request1.entryMode,
          origin: request1.origin,
          pointType: request1.pointType,
          pomeloTransactionType: request1.pomeloTransactionType,
          pomeloUserID: request1.pomeloUserID,
          settlementAmount: request1.settlementAmount,
          settlementCurrency: request1.settlementCurrency,
          transactionAmount: request1.transactionAmount,
          transactionCurrency: request1.transactionCurrency,
          source: request1.source,
          merchantName: "MERCHANT NAME",
          merchantMCC: "MCC",
          createdTimestamp: expect.any(Date),
          updatedTimestamp: expect.any(Date),
        });
        expect(pomeloTransaction2).toStrictEqual({
          id: expect.any(String),
          pomeloCardID: request2.pomeloCardID,
          pomeloIdempotencyKey: request2.pomeloIdempotencyKey,
          pomeloTransactionID: request2.pomeloTransactionID,
          settlementDate: "2022-05-22",
          parentPomeloTransactionID: request1.pomeloTransactionID,
          nobaTransactionID: request2.nobaTransactionID,
          amountInUSD: request2.amountInUSD,
          localAmount: request2.localAmount,
          localCurrency: request2.localCurrency,
          status: PomeloTransactionStatus.PENDING,
          countryCode: request2.countryCode,
          entryMode: request2.entryMode,
          origin: request2.origin,
          pointType: request2.pointType,
          pomeloTransactionType: request2.pomeloTransactionType,
          pomeloUserID: request2.pomeloUserID,
          settlementAmount: request2.settlementAmount,
          settlementCurrency: request2.settlementCurrency,
          transactionAmount: request2.transactionAmount,
          transactionCurrency: request2.transactionCurrency,
          source: request2.source,
          merchantName: "MERCHANT NAME",
          merchantMCC: "MCC",
          createdTimestamp: expect.any(Date),
          updatedTimestamp: expect.any(Date),
        });

        const allTransactions = await getAllPomeloTransactionRecords(prismaService);
        expect(allTransactions).toHaveLength(2);
        expect(allTransactions).toContainEqual(pomeloTransaction1);
        expect(allTransactions).toContainEqual(pomeloTransaction2);
      });

      it("should successfully create a PomeloTransaction with 'default' PENDING status", async () => {
        const request: PomeloTransactionSaveRequest = JSON.parse(JSON.stringify(validRequestWithoutParentTransaction));
        const pomeloTransaction: PomeloTransaction = await pomeloRepo.createPomeloTransaction(request);

        expect(pomeloTransaction).toStrictEqual({
          id: expect.any(String),
          pomeloCardID: request.pomeloCardID,
          pomeloIdempotencyKey: request.pomeloIdempotencyKey,
          pomeloTransactionID: request.pomeloTransactionID,
          settlementDate: "2022-05-22",
          parentPomeloTransactionID: null,
          nobaTransactionID: request.nobaTransactionID,
          amountInUSD: request.amountInUSD,
          localAmount: request.localAmount,
          localCurrency: request.localCurrency,
          status: PomeloTransactionStatus.PENDING,
          countryCode: request.countryCode,
          entryMode: request.entryMode,
          origin: request.origin,
          pointType: request.pointType,
          pomeloTransactionType: request.pomeloTransactionType,
          pomeloUserID: request.pomeloUserID,
          settlementAmount: request.settlementAmount,
          settlementCurrency: request.settlementCurrency,
          transactionAmount: request.transactionAmount,
          transactionCurrency: request.transactionCurrency,
          merchantName: "MERCHANT NAME",
          merchantMCC: "MCC",
          source: request.source,
          createdTimestamp: expect.any(Date),
          updatedTimestamp: expect.any(Date),
        });
        const allTransactions = await getAllPomeloTransactionRecords(prismaService);
        expect(allTransactions).toHaveLength(1);
        expect(allTransactions[0]).toStrictEqual(pomeloTransaction);
      });
    });
  });

  describe("updatePomeloTransactionStatus", () => {
    it("should throw NOT_FOUND error if the transaction with sepecified `pomeloTransactionID` is not found", async () => {
      try {
        await pomeloRepo.updatePomeloTransactionStatus(uuid(), PomeloTransactionStatus.INSUFFICIENT_FUNDS);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.NOT_FOUND);
      }
    });

    it("should update the status of the specified PomeloTransaction", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);

      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaTransactionID1 = uuid();
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID1,
        null,
        {},
        prismaService,
      );

      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );
      const nobaTransactionID2 = uuid();
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID2,
        null,
        {},
        prismaService,
      );

      await pomeloRepo.updatePomeloTransactionStatus(
        pomeloTransaction1.pomeloTransactionID,
        PomeloTransactionStatus.INSUFFICIENT_FUNDS,
      );

      const allTransactions = await getAllPomeloTransactionRecords(prismaService);
      expect(allTransactions).toHaveLength(2);
      expect(allTransactions).toContainEqual({
        ...pomeloTransaction1,
        status: PomeloTransactionStatus.INSUFFICIENT_FUNDS,
        updatedTimestamp: expect.any(Date),
      });
      expect(allTransactions).toContainEqual({
        ...pomeloTransaction2,
        status: PomeloTransactionStatus.PENDING,
      });
    });
  });

  describe("getPomeloTransactionByNobaTransactionID", () => {
    it("should return null when matching 'nobaTransactionID' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard.id,
        prismaService,
      );
      const nobaTransactionID = uuid();
      const pomeloTransaction: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByNobaTransactionID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloTransaction with the matching 'nobaTransactionID'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);

      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaTransactionID1 = uuid();
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID1,
        null,
        {},
        prismaService,
      );

      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );
      const nobaTransactionID2 = uuid();
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID2,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByNobaTransactionID(nobaTransactionID2);

      expect(response).toStrictEqual(pomeloTransaction2);
    });
  });

  describe("getPomeloTransactionByPomeloIdempotencyKey", () => {
    it("should return null when matching 'pomeloIdempotencyKey' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard.id,
        prismaService,
      );
      const nobaTransactionID = uuid();
      const pomeloTransaction: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloTransaction with the matching 'pomeloIdempotencyKey'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);

      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaTransactionID1 = uuid();
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID1,
        null,
        {},
        prismaService,
      );

      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );
      const nobaTransactionID2 = uuid();
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID2,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(
        pomeloTransaction1.pomeloIdempotencyKey,
      );

      expect(response).toStrictEqual(pomeloTransaction1);
    });
  });

  describe("getPomeloTransactionByPomeloTransactionID", () => {
    it("should return null when matching 'pomeloTransactionID' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard.id,
        prismaService,
      );
      const nobaTransactionID = uuid();
      const pomeloTransaction: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByPomeloTransactionID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloTransaction with the matching 'pomeloTransactionID'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);

      const nobaCard1: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const nobaTransactionID1 = uuid();
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID1,
        null,
        {},
        prismaService,
      );

      const nobaCard2: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard2.id,
        prismaService,
      );
      const nobaTransactionID2 = uuid();
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser.pomeloID,
        nobaTransactionID2,
        null,
        {},
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByPomeloTransactionID(
        pomeloTransaction2.pomeloTransactionID,
      );

      expect(response).toStrictEqual(pomeloTransaction2);
    });
  });

  describe("getPomeloUserTransactionsForSettlementDate", () => {
    it("should return empty array when matching 'pomeloUserID' exists but there is no matching 'settlementDate'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard.id,
        prismaService,
      );
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-23" },
        prismaService,
      );
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-24" },
        prismaService,
      );

      const response = await pomeloRepo.getPomeloUserTransactionsForSettlementDate(pomeloUser.pomeloID, "2023-05-20");

      expect(response).toStrictEqual([]);
    });

    it("should return empty array when matching 'settlementDate' exists but there is no matching 'pomeloUserID'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloUser = await createPomeloUser(consumerID, prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser.pomeloID,
        nobaCard.id,
        prismaService,
      );
      const pomeloTransaction1: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-23" },
        prismaService,
      );
      const pomeloTransaction2: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        pomeloUser.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-23" },
        prismaService,
      );

      const response = await pomeloRepo.getPomeloUserTransactionsForSettlementDate(uuid(), "2023-05-23");

      expect(response).toStrictEqual([]);
    });

    it("should return all matching PomeloTransaction with the matching 'pomeloUserID' & 'settlementDate'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1 = await createPomeloUser(consumerID1, prismaService);
      const nobaCard1: NobaCard = await createNobaCard(consumerID1, CardProvider.POMELO, prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser1.pomeloID,
        nobaCard1.id,
        prismaService,
      );
      const pomeloTransaction11: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser1.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-23" },
        prismaService,
      );
      const pomeloTransaction12: PomeloTransaction = await createPomeloTransaction(
        pomeloCard1.pomeloCardID,
        pomeloUser1.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-24" },
        prismaService,
      );

      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2 = await createPomeloUser(consumerID2, prismaService);
      const nobaCard2: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCardWithPredefinedPomeloUser(
        pomeloUser2.pomeloID,
        nobaCard2.id,
        prismaService,
      );
      const pomeloTransaction21: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser2.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-24" },
        prismaService,
      );
      const pomeloTransaction22: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser2.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-26" },
        prismaService,
      );
      const pomeloTransaction23: PomeloTransaction = await createPomeloTransaction(
        pomeloCard2.pomeloCardID,
        pomeloUser2.pomeloID,
        uuid(),
        null,
        { settlementDate: "2023-05-24" },
        prismaService,
      );

      const response = await pomeloRepo.getPomeloUserTransactionsForSettlementDate(pomeloUser2.pomeloID, "2023-05-24");

      expect(response).toHaveLength(2);
      expect(response).toContainEqual(pomeloTransaction21);
      expect(response).toContainEqual(pomeloTransaction23);
    });
  });
});
