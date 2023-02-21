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
  MonoTransactionSaveRequest,
  MonoTransactionState,
  MonoTransactionType,
  MonoTransactionUpdateRequest,
} from "../../domain/Mono";
import { createTestNobaTransaction } from "../../../transaction/test_utils/test.utils";
import { RepoException } from "../../../../core/exception/repo.exception";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaMonoModel[]> => {
  return prismaService.mono.findMany({});
};

const getRandomMonoTransaction = (transactionID: string, type: MonoTransactionType): MonoTransactionSaveRequest => {
  switch (type) {
    case MonoTransactionType.WITHDRAWAL:
      return {
        nobaTransactionID: transactionID,
        type: MonoTransactionType.WITHDRAWAL,
        withdrawalDetails: {
          transferID: uuid(),
          batchID: uuid(),
          declinationReason: "Insufficient funds",
        },
      };

    case MonoTransactionType.COLLECTION_LINK_DEPOSIT:
      return {
        nobaTransactionID: transactionID,
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        collectionLinkDepositDetails: {
          collectionLinkID: uuid(),
          collectionURL: `https://mono.com/collections/${uuid()}`,
        },
      };

    default:
      throw new Error(`Unsupported transaction type: ${type}`);
  }
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
    await prismaService.mono.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    await prismaService.consumer.deleteMany(); // clear all the dependencies
    await prismaService.transaction.deleteMany();
  });

  describe("createMonoTransaction", () => {
    it("should throw an error if the noba transaction does not exist", async () => {
      const nobaTransactionID: string = uuid();
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );

      await expect(monoRepo.createMonoTransaction(monoTransactionRequest)).rejects.toThrowError(RepoException);
    });

    it("should throw an error if tried to insert a transaction with duplicate nobaTransactionID", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      await monoRepo.createMonoTransaction(monoTransactionRequest);

      await expect(monoRepo.createMonoTransaction(monoTransactionRequest)).rejects.toThrowError(RepoException);
    });

    describe("COLLECTION_LINK_DEPOSIT", () => {
      it("should create a new transaction", async () => {
        const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
        const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
          nobaTransactionID,
          MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        );

        const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

        expect(monoTransaction.nobaTransactionID).toEqual(nobaTransactionID);
        expect(monoTransaction.collectionLinkDepositDetails.collectionLinkID).toEqual(
          monoTransactionRequest.collectionLinkDepositDetails.collectionLinkID,
        );
        expect(monoTransaction.collectionLinkDepositDetails.collectionURL).toEqual(
          monoTransactionRequest.collectionLinkDepositDetails.collectionURL,
        );
        expect(monoTransaction.state).toEqual(MonoTransactionState.PENDING);
        expect(monoTransaction.type).toEqual(MonoTransactionType.COLLECTION_LINK_DEPOSIT);

        expect(monoTransaction.createdTimestamp).toBeDefined();
        expect(monoTransaction.updatedTimestamp).toBeDefined();
        expect(monoTransaction.id).toBeDefined();
        expect(monoTransaction.withdrawalDetails).toBeUndefined();

        const allTransactions: PrismaMonoModel[] = await getAllTransactionRecords(prismaService);
        expect(allTransactions.length).toEqual(1);
        expect(allTransactions[0].nobaTransactionID).toEqual(nobaTransactionID);
        expect(allTransactions[0].collectionLinkID).toEqual(
          monoTransactionRequest.collectionLinkDepositDetails.collectionLinkID,
        );
        expect(allTransactions[0].collectionURL).toEqual(
          monoTransactionRequest.collectionLinkDepositDetails.collectionURL,
        );
        expect(allTransactions[0].state).toEqual(MonoTransactionState.PENDING);

        expect(allTransactions[0].createdTimestamp).toEqual(monoTransaction.createdTimestamp);
        expect(allTransactions[0].updatedTimestamp).toEqual(monoTransaction.updatedTimestamp);
        expect(allTransactions[0].id).toEqual(monoTransaction.id);
      });

      const requiredFields = ["collectionLinkID", "collectionURL"];
      test.each(requiredFields)("should throw an error if the %s is missing", async (field: string) => {
        const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
        const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
          nobaTransactionID,
          MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        );
        delete monoTransactionRequest.collectionLinkDepositDetails[field];

        try {
          await monoRepo.createMonoTransaction(monoTransactionRequest);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`collectionLinkDepositDetails.${field}`));
        }
      });

      // it("should throw an error if tried to insert a transaction with duplicate collectionLinkID", async () => {
      //   const nobaTransactionID1: string = await createTestNobaTransaction(prismaService);
      //   const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(nobaTransactionID1, MonoTransactionType.COLLECTION_LINK_DEPOSIT);
      //   await monoRepo.createMonoTransaction(monoTransactionRequest);

      //   const nobaTransactionID2: string = await createTestNobaTransaction(prismaService);
      //   const monoTransactionRequest2: MonoTransactionSaveRequest = getRandomMonoTransaction(nobaTransactionID2, MonoTransactionType.COLLECTION_LINK_DEPOSIT);
      //   monoTransactionRequest2.collectionLinkDepositDetails.collectionLinkID = monoTransactionRequest.collectionLinkDepositDetails.collectionLinkID;

      //   await expect(monoRepo.createMonoTransaction(monoTransactionRequest2)).rejects.toThrowError(DatabaseInternalErrorException);
      // });
    });

    describe("WITHDRAWAL", () => {
      it("should create a new transaction", async () => {
        const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
        const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
          nobaTransactionID,
          MonoTransactionType.WITHDRAWAL,
        );

        const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

        expect(monoTransaction.nobaTransactionID).toEqual(nobaTransactionID);
        expect(monoTransaction.withdrawalDetails.batchID).toEqual(monoTransactionRequest.withdrawalDetails.batchID);
        expect(monoTransaction.withdrawalDetails.transferID).toEqual(
          monoTransactionRequest.withdrawalDetails.transferID,
        );
        expect(monoTransaction.withdrawalDetails.declinationReason).toEqual(
          monoTransactionRequest.withdrawalDetails.declinationReason,
        );
        expect(monoTransaction.state).toEqual(MonoTransactionState.PENDING);
        expect(monoTransaction.type).toEqual(MonoTransactionType.WITHDRAWAL);

        expect(monoTransaction.createdTimestamp).toBeDefined();
        expect(monoTransaction.updatedTimestamp).toBeDefined();
        expect(monoTransaction.id).toBeDefined();
        expect(monoTransaction.collectionLinkDepositDetails).toBeUndefined();

        const allTransactions: PrismaMonoModel[] = await getAllTransactionRecords(prismaService);
        expect(allTransactions.length).toEqual(1);
        expect(allTransactions[0].nobaTransactionID).toEqual(nobaTransactionID);
        expect(allTransactions[0].batchID).toEqual(monoTransactionRequest.withdrawalDetails.batchID);
        expect(allTransactions[0].transferID).toEqual(monoTransactionRequest.withdrawalDetails.transferID);
        expect(allTransactions[0].declinationReason).toEqual(
          monoTransactionRequest.withdrawalDetails.declinationReason,
        );
        expect(allTransactions[0].state).toEqual(MonoTransactionState.PENDING);

        expect(allTransactions[0].createdTimestamp).toEqual(monoTransaction.createdTimestamp);
        expect(allTransactions[0].updatedTimestamp).toEqual(monoTransaction.updatedTimestamp);
        expect(allTransactions[0].id).toEqual(monoTransaction.id);
      });

      it("should create a new transaction without 'declinationReason'", async () => {
        const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
        const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
          nobaTransactionID,
          MonoTransactionType.WITHDRAWAL,
        );
        delete monoTransactionRequest.withdrawalDetails.declinationReason;

        const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

        expect(monoTransaction.nobaTransactionID).toEqual(nobaTransactionID);
        expect(monoTransaction.withdrawalDetails.batchID).toEqual(monoTransactionRequest.withdrawalDetails.batchID);
        expect(monoTransaction.withdrawalDetails.transferID).toEqual(
          monoTransactionRequest.withdrawalDetails.transferID,
        );
        expect(monoTransaction.withdrawalDetails.declinationReason).toBeUndefined();
        expect(monoTransaction.state).toEqual(MonoTransactionState.PENDING);
        expect(monoTransaction.type).toEqual(MonoTransactionType.WITHDRAWAL);

        expect(monoTransaction.createdTimestamp).toBeDefined();
        expect(monoTransaction.updatedTimestamp).toBeDefined();
        expect(monoTransaction.id).toBeDefined();
        expect(monoTransaction.collectionLinkDepositDetails).toBeUndefined();

        const allTransactions: PrismaMonoModel[] = await getAllTransactionRecords(prismaService);
        expect(allTransactions.length).toEqual(1);
        expect(allTransactions[0].nobaTransactionID).toEqual(nobaTransactionID);
        expect(allTransactions[0].batchID).toEqual(monoTransactionRequest.withdrawalDetails.batchID);
        expect(allTransactions[0].transferID).toEqual(monoTransactionRequest.withdrawalDetails.transferID);
        expect(allTransactions[0].declinationReason).toBeNull();
        expect(allTransactions[0].state).toEqual(MonoTransactionState.PENDING);

        expect(allTransactions[0].createdTimestamp).toEqual(monoTransaction.createdTimestamp);
        expect(allTransactions[0].updatedTimestamp).toEqual(monoTransaction.updatedTimestamp);
        expect(allTransactions[0].id).toEqual(monoTransaction.id);
      });

      const requiredFields = ["transferID", "batchID"];
      test.each(requiredFields)("should throw an error if the %s is missing", async (field: string) => {
        const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
        const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
          nobaTransactionID,
          MonoTransactionType.WITHDRAWAL,
        );
        delete monoTransactionRequest.withdrawalDetails[field];

        try {
          await monoRepo.createMonoTransaction(monoTransactionRequest);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`withdrawalDetails.${field}`));
        }
      });
    });
  });

  describe("getMonoTransactionByNobaTransactionID", () => {
    it("should return the transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByNobaTransactionID(
        nobaTransactionID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toEqual(monoTransaction);
    });

    it("should return the 'correct' transaction if multiple transaction exists", async () => {
      const nobaTransactionID1: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest1: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID1,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction1: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest1);

      const nobaTransactionID2: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest2: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID2,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
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
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByCollectionLinkID(
        monoTransactionRequest.collectionLinkDepositDetails.collectionLinkID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toEqual(monoTransaction);
    });

    it("should return 'null' if the transaction doesn't exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
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
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        state: MonoTransactionState.SUCCESS,
      };

      const retrievedMonoTransaction = await monoRepo.updateMonoTransaction(monoTransaction.id, updatedMonoTransaction);
      expect(retrievedMonoTransaction.state).toEqual(updatedMonoTransaction.state);
      expect(retrievedMonoTransaction.updatedTimestamp).not.toEqual(monoTransaction.updatedTimestamp);

      expect(retrievedMonoTransaction.collectionLinkDepositDetails.collectionLinkID).toEqual(
        monoTransaction.collectionLinkDepositDetails.collectionLinkID,
      );
      expect(retrievedMonoTransaction.collectionLinkDepositDetails.collectionURL).toEqual(
        monoTransaction.collectionLinkDepositDetails.collectionURL,
      );
      expect(retrievedMonoTransaction.createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(retrievedMonoTransaction.nobaTransactionID).toEqual(monoTransaction.nobaTransactionID);
      expect(retrievedMonoTransaction.monoTransactionID).toEqual(monoTransaction.monoTransactionID);
      expect(retrievedMonoTransaction.id).toEqual(monoTransaction.id);

      const retrievedMonoTransactionFromDB = await monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
      expect(retrievedMonoTransactionFromDB).toEqual(retrievedMonoTransaction);
    });

    it("should update the 'monoPaymentTransactionID' of Mono transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        monoPaymentTransactionID: uuid(),
      };

      const retrievedMonoTransaction = await monoRepo.updateMonoTransaction(monoTransaction.id, updatedMonoTransaction);
      expect(retrievedMonoTransaction.collectionLinkDepositDetails.monoPaymentTransactionID).toEqual(
        updatedMonoTransaction.monoPaymentTransactionID,
      );
      expect(retrievedMonoTransaction.updatedTimestamp).not.toEqual(monoTransaction.updatedTimestamp);

      expect(retrievedMonoTransaction.state).toEqual(monoTransaction.state);
      expect(retrievedMonoTransaction.collectionLinkDepositDetails.collectionLinkID).toEqual(
        monoTransaction.collectionLinkDepositDetails.collectionLinkID,
      );
      expect(retrievedMonoTransaction.collectionLinkDepositDetails.collectionURL).toEqual(
        monoTransaction.collectionLinkDepositDetails.collectionURL,
      );
      expect(retrievedMonoTransaction.createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(retrievedMonoTransaction.nobaTransactionID).toEqual(monoTransaction.nobaTransactionID);
      expect(retrievedMonoTransaction.id).toEqual(monoTransaction.id);

      const retrievedMonoTransactionFromDB = await monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
      expect(retrievedMonoTransactionFromDB).toEqual(retrievedMonoTransaction);
    });

    it("should update the 'declinationReason' of Mono transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.WITHDRAWAL,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        declinationReason: "DECLINATION_REASON",
      };

      const retrievedMonoTransaction = await monoRepo.updateMonoTransaction(monoTransaction.id, updatedMonoTransaction);
      expect(retrievedMonoTransaction.withdrawalDetails.declinationReason).toEqual("DECLINATION_REASON");
      expect(retrievedMonoTransaction.updatedTimestamp).not.toEqual(monoTransaction.updatedTimestamp);

      expect(retrievedMonoTransaction.state).toEqual(monoTransaction.state);
      expect(retrievedMonoTransaction.collectionLinkDepositDetails).toBeUndefined();
      expect(retrievedMonoTransaction.withdrawalDetails.batchID).toEqual(monoTransaction.withdrawalDetails.batchID);
      expect(retrievedMonoTransaction.withdrawalDetails.transferID).toEqual(
        monoTransaction.withdrawalDetails.transferID,
      );
      expect(retrievedMonoTransaction.createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(retrievedMonoTransaction.nobaTransactionID).toEqual(monoTransaction.nobaTransactionID);
      expect(retrievedMonoTransaction.id).toEqual(monoTransaction.id);

      const retrievedMonoTransactionFromDB = await monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID);
      expect(retrievedMonoTransactionFromDB).toEqual(retrievedMonoTransaction);
    });

    it("should throw an error if the transaction does not exist", async () => {
      const nobaTransactionID: string = uuid();
      const monoRecordID: string = uuid();
      const updatedMonoTransaction: MonoTransactionUpdateRequest = {
        state: MonoTransactionState.SUCCESS,
      };

      await expect(monoRepo.updateMonoTransaction(monoRecordID, updatedMonoTransaction)).rejects.toThrowError();
    });
  });

  describe("getMonoTransactionByTransferID", () => {
    it("should return the transaction if it exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.WITHDRAWAL,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByTransferID(
        monoTransactionRequest.withdrawalDetails.transferID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toEqual(monoTransaction);
    });

    it("should return 'null' if the transaction with same collectionLinkID exist", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.COLLECTION_LINK_DEPOSIT,
      );
      const monoTransaction: MonoTransaction = await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByTransferID(
        monoTransactionRequest.collectionLinkDepositDetails.collectionLinkID,
      );

      // Note that we don't need to verify the state from DB as create tests would take care of that.
      expect(retrievedMonoTransaction).toBeNull();
    });

    it("should return 'null' if the transaction doesn't exists", async () => {
      const nobaTransactionID: string = await createTestNobaTransaction(prismaService);
      const monoTransactionRequest: MonoTransactionSaveRequest = getRandomMonoTransaction(
        nobaTransactionID,
        MonoTransactionType.WITHDRAWAL,
      );
      await monoRepo.createMonoTransaction(monoTransactionRequest);

      const retrievedMonoTransaction: MonoTransaction = await monoRepo.getMonoTransactionByCollectionLinkID(
        "INVALID_COLLECTION_LINK_ID",
      );

      expect(retrievedMonoTransaction).toBeNull();
    });
  });
});
