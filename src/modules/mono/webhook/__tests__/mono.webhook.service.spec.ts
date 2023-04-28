import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { IMonoRepo } from "../../repo/mono.repo";
import { MonoCurrency, MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../domain/Mono";
import { getMockMonoRepoWithDefaults } from "../../repo/mocks/mock.mono.repo";
import { MONO_REPO_PROVIDER } from "../../repo/mono.repo.module";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { ConsumerService } from "../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { MonoWebhookMappers } from "../../webhook/mono.webhook.mapper";
import { getMockMonoWebhookHandlersWithDefaults } from "../mocks/mock.mono.webhook.mapper";
import {
  BankTransferApprovedEvent,
  BankTransferRejectedEvent,
  CollectionIntentCreditedEvent,
} from "../../dto/mono.webhook.dto";
import { getMockKMSServiceWithDefaults } from "../../../common/mocks/mock.kms.service";
import { KmsService } from "../../../common/kms.service";
import { getRandomMonoTransaction } from "../../test_utils/utils";
import { AlertService } from "../../../common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../common/mocks/mock.alert.service";
import { MonoWebhookService } from "../../webhook/mono.webhook.service";

describe("MonoServiceTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoWebhookMappers: MonoWebhookMappers;
  let kmsService: KmsService;
  let consumerService: ConsumerService;
  let alertService: AlertService;
  let app: TestingModule;
  let monoWebhookService: MonoWebhookService;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoWebhookMappers = getMockMonoWebhookHandlersWithDefaults();
    kmsService = getMockKMSServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    alertService = getMockAlertServiceWithDefaults();

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
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: MonoWebhookMappers,
          useFactory: () => instance(monoWebhookMappers),
        },
        {
          provide: KmsService,
          useFactory: () => instance(kmsService),
        },
        {
          provide: AlertService,
          useFactory: () => instance(alertService),
        },
        MonoWebhookService,
      ],
    }).compile();

    monoWebhookService = app.get<MonoWebhookService>(MonoWebhookService);
  });

  afterEach(async () => {
    app.close();
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

        when(monoWebhookMappers.convertCollectionLinkCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkDepositDetails.collectionLinkID),
        ).thenResolve(monoTransaction);
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

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

        when(monoWebhookMappers.convertCollectionLinkCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          monoRepo.getMonoTransactionByCollectionLinkID(monoTransaction.collectionLinkDepositDetails.collectionLinkID),
        ).thenResolve(null);
        when(alertService.raiseAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
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

        when(monoWebhookMappers.convertBankTransferApproved(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(
          monoTransaction,
        );
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

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

        when(monoWebhookMappers.convertBankTransferApproved(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(null);
        when(alertService.raiseAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
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

        when(monoWebhookMappers.convertBankTransferRejected(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(
          monoTransaction,
        );
        when(monoRepo.updateMonoTransaction(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

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

        when(monoWebhookMappers.convertBankTransferRejected(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(monoRepo.getMonoTransactionByTransferID(monoTransaction.withdrawalDetails.transferID)).thenResolve(null);
        when(alertService.raiseAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
      });
    });

    it("should not process ignored events", async () => {
      const webhookBody = {
        event: {
          data: {},
          type: "batch_sent",
        },
        timestamp: "2022-12-29T15:42:08.325158Z",
      };
      const webhookSignature = "signature";

      await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

      verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
    });
  });

  it("should not throw an error if unknown webhook event is sent", async () => {
    const webhookBody = {
      event: {
        data: {},
        type: "unknown",
      },
      timestamp: "2022-12-29T15:42:08.325158Z",
    };
    const webhookSignature = "signature";

    await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

    verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();
  });
});
