import { Mono as PrismaMonoModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../repo/mono.repo";
import { SqlMonoRepo } from "../repo/sql.mono.repo";
import { MonoTransaction, MonoTransactionCreateRequest, MonoTransactionState } from "../../domain/Mono";
import { createTestNobaTransaction } from "../../../transaction/test_utils/test.utils";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaMonoModel[]> => {
  return prismaService.mono.findMany({});
};

const getRandomMonoTransaction = (transactionID: string): MonoTransactionCreateRequest => {
  const transaction: MonoTransactionCreateRequest = {
    collectionLinkID: uuid(),
    nobaTransactionID: transactionID,
    collectionUrl: `https://mono.com/collection/${uuid()}`,
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
      expect(monoTransaction.collectionUrl).toEqual(monoTransactionRequest.collectionUrl);
      expect(monoTransaction.state).toEqual(MonoTransactionState.PENDING);
      expect(monoTransaction.createdTimestamp).toBeDefined();
      expect(monoTransaction.updatedTimestamp).toBeDefined();
      expect(monoTransaction.id).toBeDefined();

      const allTransactions: PrismaMonoModel[] = await getAllTransactionRecords(prismaService);
      expect(allTransactions.length).toEqual(1);
      expect(allTransactions[0].nobaTransactionID).toEqual(nobaTransactionID);
      expect(allTransactions[0].collectionLinkID).toEqual(monoTransactionRequest.collectionLinkID);
      expect(allTransactions[0].collectionUrl).toEqual(monoTransactionRequest.collectionUrl);
      expect(allTransactions[0].state).toEqual(MonoTransactionState.PENDING);

      expect(allTransactions[0].createdTimestamp).toEqual(monoTransaction.createdTimestamp);
      expect(allTransactions[0].updatedTimestamp).toEqual(monoTransaction.updatedTimestamp);
      expect(allTransactions[0].id).toEqual(monoTransaction.id);
    });
  });
});
