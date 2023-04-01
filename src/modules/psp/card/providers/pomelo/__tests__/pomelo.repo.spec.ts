import {
  PomeloUser as PrismaPomeloUserModel,
  PomeloCard as PrimsaPomeloCardModel,
  NobaCard as PrismaNobaCardModel,
  PomeloTransaction as PrismaPomeloTransactionModel,
} from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { RepoErrorCode, RepoException } from "../../../../../../core/exception/repo.exception";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";
import { PomeloRepo } from "../repos/pomelo.repo";
import { SQLPomeloRepo } from "../repos/sql.pomelo.repo";
import { createTestConsumer } from "../../../../../../modules/consumer/test_utils/test.utils";
import {
  createPomeloCard,
  createPomeloCardWithPredefinedPomeloUser,
  createPomeloTransaction,
  createPomeloUser,
} from "../test_utils/util";
import { PomeloCard, PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../domain/PomeloCard";
import { CardProvider, NobaCard, NobaCardStatus, NobaCardType } from "../../../../card/domain/NobaCard";
import { createNobaCard } from "../../../../card/test_utils/util";
import { PomeloCurrency, PomeloTransaction, PomeloTransactionSaveRequest } from "../domain/PomeloTransaction";

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

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLPomeloRepo],
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

      const response = await pomeloRepo.getPomeloUserByPomeloID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloUser with the matching 'pomeloID'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloUser1: PomeloUser = await createPomeloUser(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloUser2: PomeloUser = await createPomeloUser(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloUserByPomeloID(pomeloUser1.pomeloID);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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
      const pomeloCard1: PomeloCard = await createPomeloCard(consumerID1, nobaCard1.id, prismaService);

      const consumerID2 = await createTestConsumer(prismaService);
      const nobaCard2: NobaCard = await createNobaCard(consumerID2, CardProvider.POMELO, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCard(consumerID2, nobaCard2.id, prismaService);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

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

  describe("createPomeloTransaction", () => {
    it("should throw an error if the 'pomeloTransactionID' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloTransactionID"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'nobaTransactionID' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("nobaTransactionID"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'pomeloCardID' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloCardID"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'amountInUSD' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("amountInUSD"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'amountInLocalCurrency' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("amountInLocalCurrency"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'localCurrency' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("localCurrency"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'localCurrency' is invalid", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: "INVALID",
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("localCurrency"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'pomeloIdempotencyKey' is not specified", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      } as any;
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("pomeloIdempotencyKey"));
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the PomeloCard does not exist", async () => {
      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: uuid(),
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      };
      try {
        await pomeloRepo.createPomeloTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.DATABASE_INTERNAL_ERROR);
      }

      expect(await getAllPomeloTransactionRecords(prismaService)).toStrictEqual([]);
    });

    it("should successfully create a PomeloTransaction", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);

      const request: PomeloTransactionSaveRequest = {
        pomeloIdempotencyKey: uuid(),
        pomeloTransactionID: uuid(),
        nobaTransactionID: uuid(),
        pomeloCardID: pomeloCard.pomeloCardID,
        amountInUSD: 10,
        amountInLocalCurrency: 500,
        localCurrency: PomeloCurrency.COP,
      };
      const pomeloTransaction: PomeloTransaction = await pomeloRepo.createPomeloTransaction(request);

      expect(pomeloTransaction).toEqual({
        id: expect.any(String),
        pomeloCardID: request.pomeloCardID,
        pomeloIdempotencyKey: request.pomeloIdempotencyKey,
        pomeloTransactionID: request.pomeloTransactionID,
        nobaTransactionID: request.nobaTransactionID,
        amountInUSD: request.amountInUSD,
        amountInLocalCurrency: request.amountInLocalCurrency,
        localCurrency: request.localCurrency,
        createdTimestamp: expect.any(Date),
        updatedTimestamp: expect.any(Date),
      });
      const allTransactions = await getAllPomeloTransactionRecords(prismaService);
      expect(allTransactions).toHaveLength(1);
      expect(allTransactions[0]).toStrictEqual({
        id: pomeloTransaction.id,
        pomeloIdempotencyKey: request.pomeloIdempotencyKey,
        pomeloCardID: request.pomeloCardID,
        pomeloTransactionID: request.pomeloTransactionID,
        nobaTransactionID: request.nobaTransactionID,
        amountInUSD: request.amountInUSD,
        amountInLocalCurrency: request.amountInLocalCurrency,
        localCurrency: request.localCurrency,
        createdTimestamp: pomeloTransaction.createdTimestamp,
        updatedTimestamp: pomeloTransaction.updatedTimestamp,
      });
    });
  });

  describe("getPomeloTransactionByNobaTransactionID", () => {
    it("should return null when matching 'nobaTransactionID' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);
      const nobaTransactionID = uuid();
      const pomeloTransaction: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        nobaTransactionID,
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
        nobaTransactionID1,
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
        nobaTransactionID2,
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByNobaTransactionID(nobaTransactionID2);

      expect(response).toStrictEqual(pomeloTransaction2);
    });
  });

  describe("getPomeloTransactionByPomeloIdempotencyKey", () => {
    it("should return null when matching 'pomeloIdempotencyKey' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const nobaCard: NobaCard = await createNobaCard(consumerID, CardProvider.POMELO, prismaService);
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, nobaCard.id, prismaService);
      const nobaTransactionID = uuid();
      const pomeloTransaction: PomeloTransaction = await createPomeloTransaction(
        pomeloCard.pomeloCardID,
        nobaTransactionID,
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
        nobaTransactionID1,
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
        nobaTransactionID2,
        prismaService,
      );

      const response = await pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(
        pomeloTransaction1.pomeloIdempotencyKey,
      );

      expect(response).toStrictEqual(pomeloTransaction1);
    });
  });
});
