import { PomeloUser as PrismaPomeloUserModel, PomeloCard as PrimsaPomeloCardModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { RepoErrorCode, RepoException } from "../../../../core/exception/repo.exception";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";
import { PomeloRepo } from "../repos/pomelo.repo";
import { SqlPomeloRepo } from "../repos/sql.pomelo.repo";
import { createTestConsumer } from "../../../../modules/consumer/test_utils/test.utils";
import { createPomeloCard, createPomeloUser } from "../test_utils/util";
import {
  PomeloCard,
  PomeloCardSaveRequest,
  PomeloCardStatus,
  PomeloCardType,
  PomeloCardUpdateRequest,
} from "../domain/PomeloCard";

const getAllPomeloUserRecords = async (prismaService: PrismaService): Promise<PrismaPomeloUserModel[]> => {
  return prismaService.pomeloUser.findMany({});
};

const getAllPomeloCardRecords = async (prismaService: PrismaService): Promise<PrimsaPomeloCardModel[]> => {
  return prismaService.pomeloCard.findMany({});
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
      providers: [PrismaService, SqlPomeloRepo],
    }).compile();

    pomeloRepo = app.get<SqlPomeloRepo>(SqlPomeloRepo);
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
        expect(err.message).toEqual(expect.stringContaining(`pomeloUserID`));
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
        expect(err.message).toEqual(expect.stringContaining(`consumerID`));
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
        status: PomeloCardStatus.ACTIVE,
        type: PomeloCardType.VIRTUAL,
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
        status: PomeloCardStatus.ACTIVE,
        type: PomeloCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`pomeloCardID`));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error if the 'nobaConsumerID' is not specified", async () => {
      const request: PomeloCardSaveRequest = {
        pomeloCardID: uuid(),
        status: PomeloCardStatus.ACTIVE,
        type: PomeloCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`nobaConsumerID`));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error an invalid value for 'status' is specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        status: "INVALID_STATUS",
        type: PomeloCardType.VIRTUAL,
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`status`));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should throw an error an invalid value for 'type' is specified", async () => {
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        status: PomeloCardStatus.ACTIVE,
        type: "INVALID_TYPE",
      } as any;
      try {
        await pomeloRepo.createPomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`type`));
      }

      expect(await getAllPomeloCardRecords(prismaService)).toStrictEqual([]);
    });

    it("should create a PomeloCard", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const request: PomeloCardSaveRequest = {
        nobaConsumerID: consumerID,
        pomeloCardID: uuid(),
        status: PomeloCardStatus.ACTIVE,
        type: PomeloCardType.VIRTUAL,
      };

      const response = await pomeloRepo.createPomeloCard(request);

      expect(response.pomeloID).toBe(request.pomeloCardID);
      expect(response.nobaConsumerID).toBe(request.nobaConsumerID);
      expect(response.type).toBe(request.type);
      expect(response.status).toBe(request.status);

      const allUsers = await getAllPomeloCardRecords(prismaService);
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toStrictEqual({
        nobaConsumerID: consumerID,
        pomeloID: request.pomeloCardID,
        type: request.type,
        status: request.status,
        id: response.id,
        createdTimestamp: response.createdTimestamp,
        updatedTimestamp: response.updatedTimestamp,
      });
    });
  });

  describe("updatePomeloCard", () => {
    it("should throw error if 'nobaConsumerID' is not specified", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        pomeloCardID: uuid(),
        status: PomeloCardStatus.BLOCKED,
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`nobaConsumerID`));
      }

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(card.status);
    });

    it("should throw error if 'pomeloCardID' is not specified", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaConsumerID: uuid(),
        status: PomeloCardStatus.BLOCKED,
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`pomeloCardID`));
      }

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(card.status);
    });

    it("should throw error if 'status' is not specified", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`status`));
      }

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(card.status);
    });

    it("should throw error if 'status' value is not valid", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        status: "INVALID_STATUS",
      } as any;
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining(`status`));
      }

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(card.status);
    });

    it("should throw NOT_FOUND error if the requested (consumerID, pomeloCardID) record was not found", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaConsumerID: uuid(),
        pomeloCardID: uuid(),
        status: PomeloCardStatus.BLOCKED,
      };
      try {
        await pomeloRepo.updatePomeloCard(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(RepoException);
        expect(err.errorCode).toBe(RepoErrorCode.NOT_FOUND);
        expect(err.message).toEqual(expect.stringContaining(`consumerID`));
        expect(err.message).toEqual(expect.stringContaining(`pomeloCardID`));
        expect(err.message).toEqual(expect.stringContaining(`${request.nobaConsumerID}`));
        expect(err.message).toEqual(expect.stringContaining(`${request.pomeloCardID}`));
      }

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(card.status);
    });

    it("should update the requested record successfully", async () => {
      const consumerID: string = await createTestConsumer(prismaService);
      const card = await createPomeloCard(consumerID, prismaService);

      const request: PomeloCardUpdateRequest = {
        nobaConsumerID: consumerID,
        pomeloCardID: card.pomeloID,
        status: PomeloCardStatus.BLOCKED,
      };

      const response = await pomeloRepo.updatePomeloCard(request);

      const allCards = await getAllPomeloCardRecords(prismaService);
      expect(allCards).toHaveLength(1);
      expect(allCards[0].status).toBe(PomeloCardStatus.BLOCKED);

      expect(response).toStrictEqual(allCards[0]);
    });
  });

  describe("getPomeloCard", () => {
    it("should return null when cards with same 'consumerID' exists but matching '(consumerID, pomeloCardID)' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCard(consumerID, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCard(consumerID, prismaService);

      const response = await pomeloRepo.getPomeloCard(consumerID, uuid());

      expect(response).toBe(null);
    });

    it("should return null when cards with same 'pomeloCardID' exists but matching '(consumerID, pomeloCardID)' is not found", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const pomeloCard: PomeloCard = await createPomeloCard(consumerID, prismaService);

      const response = await pomeloRepo.getPomeloCard(uuid(), pomeloCard.pomeloID);

      expect(response).toBe(null);
    });

    it("should return PomeloCard with the matching '(consumerID, pomeloCardID)'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCard(consumerID1, prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCard(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloCard3: PomeloCard = await createPomeloCard(consumerID2, prismaService);
      const pomeloCard4: PomeloCard = await createPomeloCard(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloCard(consumerID2, pomeloCard3.pomeloID);

      expect(response).toStrictEqual(pomeloCard3);
    });
  });

  describe("getPomeloCardByID", () => {
    it("should return null when matching 'id' is not found", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCard(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCard(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloCardByID(uuid());

      expect(response).toBe(null);
    });

    it("should return PomeloCard with the matching 'id'", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const pomeloCard1: PomeloCard = await createPomeloCard(consumerID1, prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const pomeloCard2: PomeloCard = await createPomeloCard(consumerID2, prismaService);

      const response = await pomeloRepo.getPomeloCardByID(pomeloCard2.id);

      expect(response).toStrictEqual(pomeloCard2);
    });
  });
});
