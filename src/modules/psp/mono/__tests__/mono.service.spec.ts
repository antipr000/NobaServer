import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../repo/mono.repo";
import {
  MonoCurrency,
  MonoTransaction,
  MonoTransactionSaveRequest,
  MonoTransactionState,
  MonoTransactionType,
  TERMINAL_STATES,
} from "../../domain/Mono";
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
import {
  BankTransferApprovedEvent,
  BankTransferRejectedEvent,
  CollectionIntentCreditedEvent,
} from "../../dto/mono.webhook.dto";
import { getMockKMSServiceWithDefaults } from "../../../../modules/common/mocks/mock.kms.service";
import { KmsService } from "../../../../modules/common/kms.service";
import { KmsKeyType } from "../../../../config/configtypes/KmsConfigs";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { getRandomMonoTransaction } from "../test_utils/utils";
import { HealthCheckStatus } from "../../../../core/domain/HealthCheckTypes";
import { MonoClientErrorCode, MonoClientException } from "../exception/mono.client.exception";
import * as alertUtils from "../../../../core/system.alerts";

describe("MonoServiceTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoClient: MonoClient;
  let monoService: MonoService;
  let monoWebhookHandlers: MonoWebhookHandlers;
  let kmsService: KmsService;
  let consumerService: ConsumerService;
  let app: TestingModule;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoClient = getMockMonoClientWithDefaults();
    monoWebhookHandlers = getMockMonoWebhookHandlersWithDefaults();
    kmsService = getMockKMSServiceWithDefaults();
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
        {
          provide: KmsService,
          useFactory: () => instance(kmsService),
        },
        MonoService,
      ],
    }).compile();

    monoService = app.get<MonoService>(MonoService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("checkMonoHealth", () => {
    it("should return status as OK when mono is healthy", async () => {
      when(monoClient.getHealth()).thenResolve({ status: HealthCheckStatus.OK });
      const health = await monoService.checkMonoHealth();
      expect(health.status).toBe(HealthCheckStatus.OK);
    });

    it("should return status as UNAVAILABLE when mono is healthy", async () => {
      when(monoClient.getHealth()).thenResolve({ status: HealthCheckStatus.UNAVAILABLE });
      const health = await monoService.checkMonoHealth();
      expect(health.status).toBe(HealthCheckStatus.UNAVAILABLE);
    });
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

  describe("getBalance", () => {
    it("should return the current balance", async () => {
      const accountNumber = "1234567890";
      when(monoClient.getAccountBalance(accountNumber)).thenResolve({
        amount: 1000,
        currency: "COP",
      });

      const balance = await monoService.getBalance(accountNumber);
      expect(balance).toStrictEqual({
        balance: 1000,
        currency: "COP",
      });
    });

    it("should throw error if account number doesn't exist", async () => {
      const accountNumber = "1234567890";
      when(monoClient.getAccountBalance(accountNumber)).thenThrow(
        new MonoClientException({
          errorCode: MonoClientErrorCode.UNKNOWN,
          message: "Failed to fetch data from Mono",
        }),
      );

      expect(monoService.getBalance(accountNumber)).rejects.toThrowServiceException(ServiceErrorCode.UNKNOWN);
    });
  });

  describe("getTransactionByNobaTransactionID", () => {
    it("should throw error if no transaction exists", async () => {
      const nobaTransactionID = uuid();
      when(monoRepo.getMonoTransactionByNobaTransactionID(nobaTransactionID)).thenResolve(null);

      try {
        await monoService.getTransactionByNobaTransactionID(nobaTransactionID);
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceException);
        expect(e.errorCode).toBe(ServiceErrorCode.DOES_NOT_EXIST);
      }
    });

    describe("COLLECTION_LINK_DEPOSIT", () => {
      it("should return Mono transaction if it exists", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.COLLECTION_LINK_DEPOSIT);
        when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
          monoTransaction,
        );

        const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByNobaTransactionID(
          monoTransaction.nobaTransactionID,
        );

        expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
      });
    });

    describe("WITHDRAWAL", () => {
      it("should 'refresh', persist to database & then return Mono transaction if it exists", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
          monoTransaction,
        );
        when(monoClient.getTransferStatus(monoTransaction.withdrawalDetails.transferID)).thenResolve({
          state: MonoTransactionState.SUCCESS,
          lastUpdatedTimestamp: new Date(),
        });
        when(monoRepo.updateMonoTransaction(monoTransaction.id, anything())).thenResolve();

        const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByNobaTransactionID(
          monoTransaction.nobaTransactionID,
        );

        expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
        verify(monoClient.getTransferStatus(monoTransaction.withdrawalDetails.transferID)).once();
        verify(
          monoRepo.updateMonoTransaction(monoTransaction.id, deepEqual({ state: MonoTransactionState.SUCCESS })),
        ).once();
      });

      it("shouldn't call Mono client if the MonoTransaction is already in a terminal state", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

        TERMINAL_STATES.forEach(terminalState => async () => {
          monoTransaction.state = terminalState;
          when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
            monoTransaction,
          );

          const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByNobaTransactionID(
            monoTransaction.nobaTransactionID,
          );

          expect(returnedMonoTransaction).toStrictEqual(monoTransaction);

          verify(monoClient.getTransferStatus(anything())).never();
          verify(monoRepo.updateMonoTransaction(anything(), anything())).never();
        });
      });

      it("shouldn't call update on database if the status is not changed", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
          monoTransaction,
        );
        when(monoClient.getTransferStatus(monoTransaction.withdrawalDetails.transferID)).thenResolve({
          state: monoTransaction.state,
          lastUpdatedTimestamp: new Date(),
        });

        const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByNobaTransactionID(
          monoTransaction.nobaTransactionID,
        );

        expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
        verify(monoClient.getTransferStatus(monoTransaction.withdrawalDetails.transferID)).once();
      });
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
      when(
        monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkDepositDetails.collectionLinkID),
      ).thenResolve(monoTransaction);

      const returnedMonoTransaction: MonoTransaction = await monoService.getTransactionByCollectionLinkID(
        monoTransaction.collectionLinkDepositDetails.collectionLinkID,
      );

      expect(returnedMonoTransaction).toStrictEqual(monoTransaction);
    });
  });

  describe("createMonoTransaction", () => {
    describe("COLLECTION_LINK_DEPOSIT", () => {
      it("should create a Mono transaction", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction();

        const consumer: Consumer = Consumer.createConsumer({
          email: "test@noba.com",
          id: "CCCCCCCCCC",
          displayEmail: "test@noba.com",
          handle: "test",
          phone: "+573000000000",
          firstName: "First",
          lastName: "Last",
        });
        when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        };

        const expectedDBMonoTransactionCreateRequest: MonoTransactionSaveRequest = {
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          collectionLinkDepositDetails: {
            collectionLinkID: monoTransaction.collectionLinkDepositDetails.collectionLinkID,
            collectionURL: monoTransaction.collectionLinkDepositDetails.collectionURL,
          },
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
          collectionLinkID: monoTransaction.collectionLinkDepositDetails.collectionLinkID,
          collectionLink: monoTransaction.collectionLinkDepositDetails.collectionURL,
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
          phone: "+573000000000",
          firstName: "First",
          lastName: "Last",
        });
        when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
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
          new MonoClientException({
            errorCode: MonoClientErrorCode.UNKNOWN,
            message: "Unknown error",
          }),
        );

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.UNABLE_TO_PROCESS,
        );
      });

      it("should throw service exception when phone number is invalid", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction();

        const consumer: Consumer = Consumer.createConsumer({
          email: "test@noba.com",
          id: "CCCCCCCCCC",
          displayEmail: "test@noba.com",
          handle: "test",
          phone: "+579100000000",
          firstName: "First",
          lastName: "Last",
        });
        when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
        );
      });

      it("should throw ServiceException if the Currency is not COP", async () => {
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
          currency: "USD" as any,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
          "COP",
        );
      });

      it("should throw ServiceException if the Consumer is not found", async () => {
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
        when(consumerService.getConsumer(consumer.props.id)).thenResolve(null);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
          "Consumer",
        );
      });
    });

    describe("WITHDRAWAL", () => {
      it("should throw ServiceException if the Currency is not COP", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

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
          currency: "USD" as any,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.WITHDRAWAL,
          nobaPublicTransactionRef: "1234567890",
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
          "COP",
        );
      });

      it("should throw ServiceException if the Consumer is not found", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

        const consumer: Consumer = Consumer.createConsumer({
          email: "test@noba.com",
          id: "CCCCCCCCCC",
          displayEmail: "test@noba.com",
          handle: "test",
          phone: "+1234567890",
          firstName: "First",
          lastName: "Last",
        });
        when(consumerService.getConsumer(consumer.props.id)).thenResolve(null);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.WITHDRAWAL,
          nobaPublicTransactionRef: "1234567890",
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.DOES_NOT_EXIST,
          "Consumer",
        );
      });

      it("should throw ServiceException if the nobaPublicTransactionRef is not provided", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

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
          type: MonoTransactionType.WITHDRAWAL,
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
          "nobaPublicTransactionRef",
        );
      });

      const withdrawalsRequiredFields = [
        "bankCode",
        "encryptedAccountNumber",
        "accountType",
        "documentNumber",
        "documentType",
      ];
      test.each(withdrawalsRequiredFields)(
        "should throw ServiceException if the withdrawalDetails.%s is not provided",
        async field => {
          const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

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
            type: MonoTransactionType.WITHDRAWAL,
            nobaPublicTransactionRef: "nobaTransactionRef",
            withdrawalDetails: {
              accountType: "accountType",
              bankCode: "bankCode",
              documentNumber: "documentNumber",
              documentType: "documentType",
              encryptedAccountNumber: "encryptedAccountNumber",
            },
          };
          delete createMonoTransactionRequest.withdrawalDetails[field];

          expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
            ServiceErrorCode.SEMANTIC_VALIDATION,
            "withdrawal",
          );
        },
      );

      it("should throw ServiceException if account number decryption fails", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

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
          type: MonoTransactionType.WITHDRAWAL,
          nobaPublicTransactionRef: "nobaTransactionRef",
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };

        when(kmsService.decryptString("encryptedAccountNumber", KmsKeyType.SSN)).thenResolve(null);
        when(monoRepo.getMonoTransactionByNobaTransactionID(anyString())).thenResolve(null);

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.SEMANTIC_VALIDATION,
          "encryptedAccountNumber",
        );
      });

      it("should throw ServiceException if transaction already exists", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);

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
          type: MonoTransactionType.WITHDRAWAL,
          nobaPublicTransactionRef: "nobaTransactionRef",
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };

        const decryptedAccountNumber = "1234567890";
        when(kmsService.decryptString("encryptedAccountNumber", KmsKeyType.SSN)).thenResolve(decryptedAccountNumber);
        when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
          monoTransaction,
        );

        expect(monoService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrowServiceException(
          ServiceErrorCode.ALREADY_EXISTS,
        );
      });

      it("should initiate the WITHDRAWAL from NOBA account to Consumer Account", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
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

        const decryptedAccountNumber = "1234567890";
        when(kmsService.decryptString("encryptedAccountNumber", KmsKeyType.SSN)).thenResolve(decryptedAccountNumber);
        when(monoRepo.getMonoTransactionByNobaTransactionID(anyString())).thenResolve(null);

        when(monoClient.transfer(anything())).thenResolve({
          batchID: monoTransaction.withdrawalDetails.batchID,
          transferID: monoTransaction.withdrawalDetails.transferID,
          state: "SUCCESS",
          declinationReason: null,
        });
        when(monoRepo.createMonoTransaction(anything())).thenResolve(monoTransaction);

        const createMonoTransactionRequest: CreateMonoTransactionRequest = {
          amount: 100,
          currency: MonoCurrency.COP,
          nobaTransactionID: monoTransaction.nobaTransactionID,
          consumerID: consumer.props.id,
          type: MonoTransactionType.WITHDRAWAL,
          nobaPublicTransactionRef: "nobaTransactionRef",
          withdrawalDetails: {
            accountType: "accountType",
            bankCode: "bankCode",
            documentNumber: "documentNumber",
            documentType: "documentType",
            encryptedAccountNumber: "encryptedAccountNumber",
          },
        };
        const response: MonoTransaction = await monoService.createMonoTransaction(createMonoTransactionRequest);

        expect(response).toEqual(monoTransaction);

        const [monoTransactionArg] = capture(monoRepo.createMonoTransaction).last();
        expect(monoTransactionArg).toEqual({
          nobaTransactionID: monoTransaction.nobaTransactionID,
          type: MonoTransactionType.WITHDRAWAL,
          withdrawalDetails: {
            batchID: monoTransaction.withdrawalDetails.batchID,
            transferID: monoTransaction.withdrawalDetails.transferID,
          },
        });

        const [transferRequestArg] = capture(monoClient.transfer).last();
        expect(transferRequestArg).toEqual({
          amount: 100,
          currency: MonoCurrency.COP,
          accountNumber: decryptedAccountNumber,
          accountType: "accountType",
          bankCode: "bankCode",
          consumerEmail: consumer.props.email,
          consumerName: "First Last",
          documentNumber: "documentNumber",
          documentType: "documentType",
          transactionID: monoTransaction.nobaTransactionID,
          transactionRef: "nobaTransactionRef",
        });
      });
    });
  });

  describe("processWebhookEvent", () => {
    describe("collection_intent_credited", () => {
      it("should update the state to 'SUCCESS' if the CollectionIntentCredited is sent in Webhook Event", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction();
        const convertedEvent: CollectionIntentCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          collectionLinkID: monoTransaction.collectionLinkDepositDetails.collectionLinkID,
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
        when(
          monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkDepositDetails.collectionLinkID),
        ).thenResolve(monoTransaction);
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        const [receivedMonoID, receivedMonoTransactionUpdateRequest] = capture(monoRepo.updateMonoTransaction).last();
        expect(receivedMonoID).toBe(monoTransaction.id);
        expect(receivedMonoTransactionUpdateRequest).toStrictEqual({
          monoPaymentTransactionID: "monoTransactionID",
          state: MonoTransactionState.SUCCESS,
        });
      });

      it("should raise an alert and return without error if the 'collectionLinkID' is not found", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction();
        const convertedEvent: CollectionIntentCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          collectionLinkID: monoTransaction.collectionLinkDepositDetails.collectionLinkID,
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
        when(
          monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkDepositDetails.collectionLinkID),
        ).thenResolve(null);

        const alertLogSpy = jest.spyOn(alertUtils, "formatAlertLog");

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        expect(alertLogSpy).toHaveBeenCalledWith(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
      });
    });

    describe("bank_transfer_approved", () => {
      it("should update the state to 'SUCCESS' if valid BankTransferApprovedEvent is sent in Webhook Event", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        const convertedEvent: BankTransferApprovedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          transferID: monoTransaction.withdrawalDetails.transferID,
          batchID: monoTransaction.withdrawalDetails.batchID,
        };

        const webhookBody = {
          event: {
            data: {},
            type: "bank_transfer_approved",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookHandlers.convertBankTransferApproved(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(
          monoTransaction,
        );
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        const [receivedMonoID, receivedMonoTransactionUpdateRequest] = capture(monoRepo.updateMonoTransaction).last();
        expect(receivedMonoID).toBe(monoTransaction.id);
        expect(receivedMonoTransactionUpdateRequest).toStrictEqual({
          state: MonoTransactionState.SUCCESS,
        });
      });

      it("should raise an alert and return if the 'transferID' is not found", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        const convertedEvent: BankTransferApprovedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          transferID: monoTransaction.withdrawalDetails.transferID,
          batchID: monoTransaction.withdrawalDetails.batchID,
        };

        const webhookBody = {
          event: {
            data: {},
            type: "bank_transfer_approved",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookHandlers.convertBankTransferApproved(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(null);

        const alertLogSpy = jest.spyOn(alertUtils, "formatAlertLog");

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        expect(alertLogSpy).toHaveBeenCalledWith(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
      });
    });

    describe("bank_transfer_rejected", () => {
      it("should update the state to 'SUCCESS' if valid BankTransferRejectedEvent is sent in Webhook Event", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        const convertedEvent: BankTransferRejectedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          transferID: monoTransaction.withdrawalDetails.transferID,
          batchID: monoTransaction.withdrawalDetails.batchID,
          state: MonoTransactionState.DECLINED,
          declinationReason: "Transaction Declined",
        };

        const webhookBody = {
          event: {
            data: {},
            type: "bank_transfer_rejected",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookHandlers.convertBankTransferRejected(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(
          monoTransaction,
        );
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        const [receivedMonoID, receivedMonoTransactionUpdateRequest] = capture(monoRepo.updateMonoTransaction).last();
        expect(receivedMonoID).toBe(monoTransaction.id);
        expect(receivedMonoTransactionUpdateRequest).toStrictEqual({
          state: MonoTransactionState.DECLINED,
          declinationReason: "Transaction Declined",
        });
      });

      it("should raise an alert and return without error if the 'transferID' is not found", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        const convertedEvent: BankTransferRejectedEvent = {
          accountID: "accountID",
          amount: 100,
          currency: MonoCurrency.COP,
          transferID: monoTransaction.withdrawalDetails.transferID,
          batchID: monoTransaction.withdrawalDetails.batchID,
          state: MonoTransactionState.DECLINED,
          declinationReason: "Transaction Declined",
        };

        const webhookBody = {
          event: {
            data: {},
            type: "bank_transfer_rejected",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookHandlers.convertBankTransferRejected(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(null);

        const alertLogSpy = jest.spyOn(alertUtils, "formatAlertLog");

        await monoService.processWebhookEvent(webhookBody, webhookSignature);

        expect(alertLogSpy).toHaveBeenCalledWith(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
      });
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

      expect(monoService.processWebhookEvent(webhookBody, webhookSignature)).rejects.toThrowError(
        InternalServiceErrorException,
      );

      verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
    });
  });
});
