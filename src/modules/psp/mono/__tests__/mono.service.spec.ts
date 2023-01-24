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
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { MonoService } from "../mono.service";
import { MonoClientCollectionLinkRequest } from "../../dto/mono.client.dto";
import { CreateMonoTransactionRequest } from "../../dto/mono.service.dto";
import { InternalServiceErrorException } from "../../../../core/exception/CommonAppException";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { ConsumerService } from "../../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../../modules/consumer/mocks/mock.consumer.service";
import { MonoWebhookHandlers } from "../mono.webhook";
import { getMockMonoWebhookHandlersWithDefaults } from "../mocks/mock.mono.webhook";
import { CollectionIntentCreditedEvent } from "../../dto/mono.webhook.dto";

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

describe("MonoServiceTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoClient: MonoClient;
  let monoService: MonoService;
  let monoWebhookHandlers: MonoWebhookHandlers;
  let consumerService: ConsumerService;
  let app: TestingModule;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoClient = getMockMonoClientWithDefaults();
    monoWebhookHandlers = getMockMonoWebhookHandlersWithDefaults();
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
        {
          provide: MonoWebhookHandlers,
          useFactory: () => instance(monoWebhookHandlers),
        },
        MonoService,
      ],
    }).compile();

    monoService = app.get<MonoService>(MonoService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("getSupportedBanks", () => {
    it("should return supported banks", async () => {
      when(monoClient.getSupportedBanks()).thenResolve([
        {
          code: "007",
          id: "bank_705urpPYaZjD0DYLIZqRee",
          name: "BANCOLOMBIA",
          supported_account_types: ["savings_account", "checking_account"],
        },
        {
          code: "051",
          id: "bank_7BcCOfq1cz3JnJhe5Icsf0",
          name: "DAVIVIENDA BANK",
          supported_account_types: ["savings_account", "checking_account"],
        },
      ]);

      const banks = await monoService.getSupportedBanks();
      expect(banks.length).toBe(2);
      expect(banks[0].name).toBe("Bancolombia");
      expect(banks[1].name).toBe("Davivienda Bank");
    });

    it("should keep abbreviations in caps", async () => {
      when(monoClient.getSupportedBanks()).thenResolve([
        {
          code: "023",
          id: "bank_6SXxM8Z9OWdURWTHZwzE7p",
          name: "J.P. MORGAN COLOMBIA",
          supported_account_types: ["savings_account", "checking_account"],
        },
      ]);

      const banks = await monoService.getSupportedBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].name).toBe("J.P. Morgan Colombia");
    });

    it("should keep 'DE' in lowers", async () => {
      when(monoClient.getSupportedBanks()).thenResolve([
        {
          code: "023",
          id: "bank_6SXxM8Z9OWdURWTHZwzE7p",
          name: "BANCO DE OCCIDENTE",
          supported_account_types: ["savings_account", "checking_account"],
        },
      ]);

      const banks = await monoService.getSupportedBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].name).toBe("Banco de Occidente");
    });

    it("should preserve casing for <3 letter words", async () => {
      when(monoClient.getSupportedBanks()).thenResolve([
        {
          code: "286",
          id: "bank_5oWcTFt5ExaPzWQ1A6Nntn",
          name: "JFK COOPERATIVA FINANCIERA",
          supported_account_types: ["savings_account"],
        },
      ]);

      const banks = await monoService.getSupportedBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].name).toBe("JFK Cooperativa Financiera");
    });

    it("should keep BBVA in all caps", async () => {
      when(monoClient.getSupportedBanks()).thenResolve([
        {
          code: "013",
          id: "bank_4MIx1B3IkXnAqZ9QsrTiTa",
          name: "BBVA",
          supported_account_types: ["savings_account", "checking_account", "electronic_deposit"],
        },
      ]);

      const banks = await monoService.getSupportedBanks();
      expect(banks).toHaveLength(1);
      expect(banks[0].name).toBe("BBVA");
    });
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

  describe("updateMonoTransaction", () => {
    it("should update the state to 'SUCCESS' if the CollectionIntentCredited is sent in Webhook Event", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      const convertedEvent: CollectionIntentCreditedEvent = {
        accountID: "accountID",
        amount: 100,
        currency: MonoCurrency.COP,
        collectionLinkID: monoTransaction.collectionLinkID,
        monoTransactionID: "monoTransactionID",
      };

      const webhookBody = {
        event: {
          data: {},
          type: "collection_intent_credited",
        },
        timestamp: "2022-12-29T15:42:08.325158Z",
      };
      const webhookSignature = "signature";

      when(monoWebhookHandlers.convertCollectionLinkCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
        convertedEvent,
      );
      when(monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkID)).thenResolve(
        monoTransaction,
      );
      when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

      await monoService.processWebhookEvent(webhookBody, webhookSignature);

      const [receivedMonoID, receivedMonoTransactionUpdateRequest] = capture(monoRepo.updateMonoTransaction).last();
      expect(receivedMonoID).toBe(monoTransaction.id);
      expect(receivedMonoTransactionUpdateRequest).toStrictEqual({
        monoTransactionID: "monoTransactionID",
        state: MonoTransactionState.SUCCESS,
      });
    });

    it("should throw InternalServiceErrorException if the 'collectionLinkID' is not found", async () => {
      const monoTransaction: MonoTransaction = getRandomMonoTransaction();
      const convertedEvent: CollectionIntentCreditedEvent = {
        accountID: "accountID",
        amount: 100,
        currency: MonoCurrency.COP,
        collectionLinkID: monoTransaction.collectionLinkID,
        monoTransactionID: "monoTransactionID",
      };

      const webhookBody = {
        event: {
          data: {},
          type: "collection_intent_credited",
        },
        timestamp: "2022-12-29T15:42:08.325158Z",
      };
      const webhookSignature = "signature";

      when(monoWebhookHandlers.convertCollectionLinkCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
        convertedEvent,
      );
      when(monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkID)).thenResolve(null);

      await expect(monoService.processWebhookEvent(webhookBody, webhookSignature)).rejects.toThrowError(
        InternalServiceErrorException,
      );

      verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
    });

    it("should throw InternalServiceErrorException if unknown webhook event is sent", async () => {
      const webhookBody = {
        event: {
          data: {},
          type: "unknown",
        },
        timestamp: "2022-12-29T15:42:08.325158Z",
      };
      const webhookSignature = "signature";

      await expect(monoService.processWebhookEvent(webhookBody, webhookSignature)).rejects.toThrowError(
        InternalServiceErrorException,
      );

      verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
    });
  });
});
