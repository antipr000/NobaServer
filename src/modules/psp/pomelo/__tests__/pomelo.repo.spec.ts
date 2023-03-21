import { PomeloUser as PrismaPomeloUserModel } from "@prisma/client";
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
import { createPomeloUser } from "../test_utils/util";

const getAllPomeloUserRecords = async (prismaService: PrismaService): Promise<PrismaPomeloUserModel[]> => {
  return prismaService.pomeloUser.findMany({});
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
});
