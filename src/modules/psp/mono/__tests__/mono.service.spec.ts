import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../repo/mono.repo";
import { MonoTransaction, MonoTransactionCreateRequest, MonoTransactionState } from "../../domain/Mono";
import { MonoClient } from "../mono.client";
import { getMockMonoRepoWithDefaults } from "../mocks/mock.mono.repo";
import { getMockMonoClientWithDefaults } from "../mocks/mock.mono.client";
import { MONO_REPO_PROVIDER } from "../repo/mono.repo.module";
import { deepEqual, instance, when } from "ts-mockito";
import { MonoService } from "../mono.service";
import { MonoClientCollectionLinkRequest, MonoCurrency } from "../../dto/mono.client.dto";
import { CreateMonoTransactionRequest } from "../../dto/mono.service.dto";
import { InternalServiceErrorException } from "../../../../core/exception/CommonAppException";

const getRandomMonoTransaction = (): MonoTransaction => {
  return {
    collectionLinkID: uuid(),
    collectionURL: `https://mono.com/collections/${uuid()}`,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    nobaTransactionID: uuid(),
    state: MonoTransactionState.PENDING,
    id: uuid(),
    monoTransactionID: uuid(),
  };
};

describe("SqlMonoRepoTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoClient: MonoClient;
  let monoService: MonoService;
  let app: TestingModule;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoClient = getMockMonoClientWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MONO_REPO_PROVIDER,
          useFactory: () => instance(monoRepo),
        },
        {
          provide: MonoClient,
          useFactory: () => instance(monoClient),
        },
        MonoService,
      ],
    }).compile();

    monoService = app.get<MonoService>(MonoService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("getTransactionByNobaTransactionID", () => {
    it("should return null if no transaction exists", async () => {
      const nobaTransactionID = uuid();
      when(monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID)).thenResolve(null);

      const monoTransaction = await monoService.getTransactionByNobaTransactionID(nobaTransactionID);

      expect(monoTransaction).toBeNull();
    });

    it("should return Mono transaction if it exists", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
        monoTransaction,
      );

      const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByNobaTransactionID(
        monoTransaction.nobaTransactionID,
      );

      expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
    });
  });

  describe("getTransactionByCollectionLinkID", () => {
    it("should return null if no transaction exists", async () => {
      const collectionLinkID = uuid();
      when(monoRepo.getMonoTransactionByCollectionLinkID(collectionLinkID)).thenResolve(null);

      const monoTransaction = await monoService.getTransactionByCollectionLinkID(collectionLinkID);

      expect(monoTransaction).toBeNull();
    });

    it("should return Mono transaction if it exists", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      when(monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkID)).thenResolve(
        monoTransaction,
      );

      const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByCollectionLinkID(
        monoTransaction.collectionLinkID,
      );

      expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
    });
  });

  describe("createMonoTransaction", () => {
    it("should create a Mono transaction", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      const createMonoTransactionRequest: CreateMonoTransactionRequest = {
        amount: 100,
        consumerEmail: "test@noba.com",
        consumerName: "Test User",
        consumerPhone: "1234567890",
        currency: MonoCurrency.COP,
        nobaTransactionID: monoTransaction.nobaTransactionID,
      };

      const expectedDBMonoTransactionCreateRequest: MonoTransactionCreateRequest = {
        collectionLinkID: monoTransaction.collectionLinkID,
        nobaTransactionID: monoTransaction.nobaTransactionID,
        collectionURL: monoTransaction.collectionURL,
      };
      when(monoRepo.createMonoTransaction(deepEqual(expectedDBMonoTransactionCreateRequest))).thenResolve(
        monoTransaction,
      );

      const expectedMonoClientCreateCollectionLink: MonoClientCollectionLinkRequest = {
        amount: createMonoTransactionRequest.amount,
        currency: createMonoTransactionRequest.currency,
        consumerEmail: createMonoTransactionRequest.consumerEmail,
        consumerName: createMonoTransactionRequest.consumerName,
        consumerPhone: createMonoTransactionRequest.consumerPhone,
        transactionID: createMonoTransactionRequest.nobaTransactionID,
      };
      when(monoClient.createCollectionLink(deepEqual(expectedMonoClientCreateCollectionLink))).thenResolve({
        collectionLinkID: monoTransaction.collectionLinkID,
        collectionLink: monoTransaction.collectionURL,
      });

      const returnedMonoTransaction: MonoTransaction = await monoService.createMonoTransaction(
        createMonoTransactionRequest,
      );

      expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
    });

    it("shouldn't save the transaction if Mono client failed to create a Collection Link", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      const createMonoTransactionRequest: CreateMonoTransactionRequest = {
        amount: 100,
        consumerEmail: "test@noba.com",
        consumerName: "Test User",
        consumerPhone: "1234567890",
        currency: MonoCurrency.COP,
        nobaTransactionID: monoTransaction.nobaTransactionID,
      };

      const expectedMonoClientCreateCollectionLink: MonoClientCollectionLinkRequest = {
        amount: createMonoTransactionRequest.amount,
        currency: createMonoTransactionRequest.currency,
        consumerEmail: createMonoTransactionRequest.consumerEmail,
        consumerName: createMonoTransactionRequest.consumerName,
        consumerPhone: createMonoTransactionRequest.consumerPhone,
        transactionID: createMonoTransactionRequest.nobaTransactionID,
      };
      when(monoClient.createCollectionLink(deepEqual(expectedMonoClientCreateCollectionLink))).thenThrow(
        new InternalServiceErrorException({}),
      );

      await expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowError(
        InternalServiceErrorException,
      );
    });
  });
});
