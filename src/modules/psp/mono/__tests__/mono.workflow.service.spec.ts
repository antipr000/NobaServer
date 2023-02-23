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
import { CollectionIntentCreditedEvent } from "../../dto/mono.webhook.dto";
import { getMockKMSServiceWithDefaults } from "../../../../modules/common/mocks/mock.kms.service";
import { KmsService } from "../../../../modules/common/kms.service";
import { KmsKeyType } from "../../../../config/configtypes/KmsConfigs";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { getRandomMonoTransaction } from "../test_utils/utils";
import { MonoWorkflowService } from "../mono.workflow.service";
import { MonoClientErrorCode, MonoClientException } from "../exception/mono.client.exception";
import { WorkflowException } from "../../../../core/exception/workflow.exception";

describe("MonoWorkflowServiceTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoClient: MonoClient;
  let monoWorkflowService: MonoWorkflowService;
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
        MonoWorkflowService,
      ],
    }).compile();

    monoWorkflowService = app.get<MonoWorkflowService>(MonoWorkflowService);
  });

  afterEach(async () => {
    app.close();
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

        const returnedMonoTransaction: MonoTransaction = await monoWorkflowService.createMonoTransaction(
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

        await expect(
          monoWorkflowService.createMonoTransaction(createMonoTransactionRequest),
        ).rejects.toThrowServiceException(ServiceErrorCode.UNABLE_TO_PROCESS);
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

        await expect(
          monoWorkflowService.createMonoTransaction(createMonoTransactionRequest),
        ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
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

        await expect(
          monoWorkflowService.createMonoTransaction(createMonoTransactionRequest),
        ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "COP");
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

        try {
          await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
          expect(e.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
          expect(e.message).toEqual(expect.stringContaining("Consumer"));
        }
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

        try {
          await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
          expect(e.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(e.message).toEqual(expect.stringContaining("COP"));
          expect(e.message).toEqual(expect.stringContaining("USD"));
        }
      });

      it("should throw NobaWorkflowException if MonoClientException is thrown", async () => {
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

        when(monoClient.transfer(anything())).thenResolve({
          batchID: monoTransaction.withdrawalDetails.batchID,
          transferID: monoTransaction.withdrawalDetails.transferID,
          state: "SUCCESS",
          declinationReason: null,
        });
        when(monoRepo.createMonoTransaction(anything())).thenReject(
          new MonoClientException({ errorCode: MonoClientErrorCode.TRANSFER_FAILED }),
        );

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

        expect(monoWorkflowService.createMonoTransaction(createMonoTransactionRequest)).rejects.toThrow(
          WorkflowException,
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

        try {
          await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
          expect(e.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
          expect(e.message).toEqual(expect.stringContaining("Consumer"));
        }
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

        try {
          await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
          expect(e.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(e.message).toEqual(expect.stringContaining("nobaPublicTransactionRef"));
        }
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
          when(monoRepo.getMonoTransactionByNobaTransactionID(monoTransaction.nobaTransactionID)).thenResolve(
            monoTransaction,
          );

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

          expect(
            monoWorkflowService.createMonoTransaction(createMonoTransactionRequest),
          ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION, "withdrawal");
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

        try {
          await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(ServiceException);
          expect(e.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(e.message).toEqual(expect.stringContaining("encryptedAccountNumber"));
        }
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
        const response: MonoTransaction = await monoWorkflowService.createMonoTransaction(createMonoTransactionRequest);

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
});
