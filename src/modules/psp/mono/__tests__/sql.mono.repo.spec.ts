import { Mono as PrismaMonoModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../repo/mono.repo";
import { SqlMonoRepo } from "../repo/sql.mono.repo";
import {
  MonoTransaction,
  MonoTransactionCreateRequest,
  MonoTransactionState,
  MonoTransactionUpdateRequest,
} from "../../domain/Mono";
import { createTestNobaTransaction } from "../../../transaction/test_utils/test.utils";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaMonoModel[]> => {
  return prismaService.mono.findMany({});
};

const getRandomMonoTransaction = (transactionID: string): MonoTransactionCreateRequest => {
  const transaction: MonoTransactionCreateRequest = {
    collectionLinkID: uuid(),
    nobaTransactionID: transactionID,
    collectionURL: `https://mono.com/collection/${uuid()}`,
  };

  return transaction;
};

describe("SqlMonoRepoTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SqlMonoRepo],
    }).compile();

    monoRepo = app.get<SqlMonoRepo>(SqlMonoRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  beforeEach(async () => {
    await prismaService.transaction.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    await prismaService.consumer.deleteMany(); // clear all the dependencies
  });

  describe("createMonoTransaction", () => {
    it("should create a new transaction", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);

      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      expect(monoTransaction.nobaTransactionID).toEqual(nobaTransactionID);
      expect(monoTransaction.collectionLinkID).toEqual(monoTransactionRequest.collectionLinkID);
      expect(monoTransaction.collectionURL).toEqual(monoTransactionRequest.collectionURL);
      expect(monoTransaction.state).toEqual(MonoTransactionState.PENDING);
      expect(monoTransaction.createdTimestamp).toBeDefined();
      expect(monoTransaction.updatedTimestamp).toBeDefined();
      expect(monoTransaction.id).toBeDefined();

      const allTransactions: PrismaMonoModel[] = await getAllTransactionRecords(prismaService);
      expect(allTransactions.length).toEqual(1);
      expect(allTransactions[0].nobaTransactionID).toEqual(nobaTransactionID);
      expect(allTransactions[0].collectionLinkID).toEqual(monoTransactionRequest.collectionLinkID);
      expect(allTransactions[0].collectionUrl).toEqual(monoTransactionRequest.collectionURL);
      expect(allTransactions[0].state).toEqual(MonoTransactionState.PENDING);

      expect(allTransactions[0].createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(allTransactions[0].updatedTimestamp).toEqual(monoTransaction.updatedTimestamp);
      expect(allTransactions[0].id).toEqual(monoTransaction.id);
    });

    it("should throw an error if the noba transaction does not exist", async () => {
      const nobaTransactionID: string = uuid();
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);

      await expect(monoRepo.createMonoTransaction(monoTransactionRequest)).rejects.toThrowError();
    });

    it("should throw an error if tried to insert a transaction with duplicate nobaTransactionID", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      await monoRepo.createMonoTransaction(monoTransactionRequest);

      await expect(monoRepo.createMonoTransaction(monoTransactionRequest)).rejects.toThrowError();
    });

    it("should throw an error if tried to insert a transaction with duplicate collectionLinkID", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      await monoRepo.createMonoTransaction(monoTransactionRequest);

      const monoTransactionRequest2: MonoTransactionCreateRequest = getRandomMonoTransaction(uuid());
      monoTransactionRequest2.collectionLinkID = monoTransactionRequest.collectionLinkID;

      await expect(monoRepo.createMonoTransaction(monoTransactionRequest2)).rejects.toThrowError();
    });
  });

  describe("getMonoTransactionByNobaTransactionID", () => {
    it("should return the transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByNobaTransactionID(
        nobaTransactionID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toEqual(monoTransaction);
    });

    it("should return the 'correct' transaction if multiple transaction exists", async () => {
      const nobaTransactionID1: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest1: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID1);
      const monoTransaction1: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest1);

      const nobaTransactionID2: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest2: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID2);
      const monoTransaction2: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest2);

      const retrievedMonoTransaction1: MonoTransaction = await monoRepo.getMonoTransactionByNobaTransactionID(
        nobaTransactionID1,
      );
      const retrievedMonoTransaction2: MonoTransaction = await monoRepo.getMonoTransactionByNobaTransactionID(
        nobaTransactionID2,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction1).toEqual(monoTransaction1);
      expect(retrievedMonoTransaction2).toEqual(monoTransaction2);
    });

    it("should return 'null' if the transaction does not exist", async () => {
      const nobaTransactionID: string = uuid();

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByNobaTransactionID(
        nobaTransactionID,
      );

      expect(retrievedMonoTransaction).toBeNull();
    });
  });

  describe("getMonoTransactionByCollectionLinkID", () => {
    it("should return the transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByCollectionLinkID(
        monoTransactionRequest.collectionLinkID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toEqual(monoTransaction);
    });

    it("should return 'null' if the transaction doesn't exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByCollectionLinkID(
        "INVALID_COLLECTION_LINK_ID",
      );

      expect(retrievedMonoTransaction).toBeNull();
    });
  });

  describe("updateMonoTransaction", () => {
    it("should update the 'state' of Mono transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        state: MonoTransactionState.SUCCESS,
      };

      const retrievedMonoTransaction = await monoRepo.updateMonoTransaction(nobaTransactionID, updatedMonoTransaction);
      expect(retrievedMonoTransaction.state).toEqual(updatedMonoTransaction.state);
      expect(retrievedMonoTransaction.updatedTimestamp).not.toEqual(monoTransaction.updatedTimestamp);

      expect(retrievedMonoTransaction.collectionLinkID).toEqual(monoTransaction.collectionLinkID);
      expect(retrievedMonoTransaction.collectionURL).toEqual(monoTransaction.collectionURL);
      expect(retrievedMonoTransaction.createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(retrievedMonoTransaction.nobaTransactionID).toEqual(monoTransaction.nobaTransactionID);
      expect(retrievedMonoTransaction.monoTransactionID).toEqual(monoTransaction.monoTransactionID);
      expect(retrievedMonoTransaction.id).toEqual(monoTransaction.id);

      const retrievedMonoTransactionFromDB = await monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
      expect(retrievedMonoTransactionFromDB).toEqual(retrievedMonoTransaction);
    });

    it("should update the 'monoTransactionID' of Mono transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionCreateRequest = getRandomMonoTransaction(nobaTransactionID);
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        monoTransactionID: uuid(),
      };

      const retrievedMonoTransaction = await monoRepo.updateMonoTransaction(nobaTransactionID, updatedMonoTransaction);
      expect(retrievedMonoTransaction.monoTransactionID).toEqual(updatedMonoTransaction.monoTransactionID);
      expect(retrievedMonoTransaction.updatedTimestamp).not.toEqual(monoTransaction.updatedTimestamp);

      expect(retrievedMonoTransaction.state).toEqual(monoTransaction.state);
      expect(retrievedMonoTransaction.collectionLinkID).toEqual(monoTransaction.collectionLinkID);
      expect(retrievedMonoTransaction.collectionURL).toEqual(monoTransaction.collectionURL);
      expect(retrievedMonoTransaction.createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(retrievedMonoTransaction.nobaTransactionID).toEqual(monoTransaction.nobaTransactionID);
      expect(retrievedMonoTransaction.id).toEqual(monoTransaction.id);

      const retrievedMonoTransactionFromDB = await monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
      expect(retrievedMonoTransactionFromDB).toEqual(retrievedMonoTransaction);
    });

    it("should throw an error if the transaction does not exist", async () => {
      const nobaTransactionID: string = uuid();
      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        state: MonoTransactionState.SUCCESS,
      };

      await expect(monoRepo.updateMonoTransaction(nobaTransactionID, updatedMonoTransaction)).rejects.toThrowError();
    });
  });
});
