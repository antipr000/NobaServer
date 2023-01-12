import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../repo/mono.repo";
import { MonoCurrency, MonoTransaction, MonoTransactionCreateRequest, MonoTransactionState } from "../../domain/Mono";
import { MonoClient } from "../mono.client";
import { getMockMonoRepoWithDefaults } from "../mocks/mock.mono.repo";
import { getMockMonoClientWithDefaults } from "../mocks/mock.mono.client";
import { MONO_REPO_PROVIDER } from "../repo/mono.repo.module";
import { deepEqual, instance, when } from "ts-mockito";
import { MonoService } from "../mono.service";
import { MonoClientCollectionLinkRequest } from "../../dto/mono.client.dto";
import { CreateMonoTransactionRequest } from "../../dto/mono.service.dto";
import { InternalServiceErrorException } from "../../../../core/exception/CommonAppException";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { ConsumerService } from "../../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../../modules/consumer/mocks/mock.consumer.service";

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
  let consumerService: ConsumerService;
  let app: TestingModule;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoClient = getMockMonoClientWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

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
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
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

      const consumer: Consumer = Consumer.createConsumer({
        email: "test@noba.com",
        id: "CCCCCCCCCC",
        displayEmail: "test@noba.com",
        handle: "test",
        phone: "+1234567890",
        firstName: "First",
        lastName: "Last",
      });
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      const createMonoTransactionRequest: CreateMonoTransactionRequest = {
        amount: 100,
        currency: MonoCurrency.COP,
        nobaTransactionID: monoTransaction.nobaTransactionID,
        consumerID: consumer.props.id,
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
        transactionID: createMonoTransactionRequest.nobaTransactionID,
        consumerEmail: consumer.props.email,
        consumerName: "First Last",
        consumerPhone: consumer.props.phone,
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

      const consumer: Consumer = Consumer.createConsumer({
        email: "test@noba.com",
        id: "CCCCCCCCCC",
        displayEmail: "test@noba.com",
        handle: "test",
        phone: "+1234567890",
        firstName: "First",
        lastName: "Last",
      });
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      const createMonoTransactionRequest: CreateMonoTransactionRequest = {
        amount: 100,
        currency: MonoCurrency.COP,
        nobaTransactionID: monoTransaction.nobaTransactionID,
        consumerID: consumer.props.id,
      };

      const expectedMonoClientCreateCollectionLink: MonoClientCollectionLinkRequest = {
        amount: createMonoTransactionRequest.amount,
        currency: createMonoTransactionRequest.currency,
        transactionID: createMonoTransactionRequest.nobaTransactionID,
        consumerEmail: consumer.props.email,
        consumerName: "First Last",
        consumerPhone: consumer.props.phone,
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
