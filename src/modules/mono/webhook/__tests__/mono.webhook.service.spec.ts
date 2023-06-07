import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
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
  MonoAccountCreditedEvent,
} from "../../dto/mono.webhook.dto";
import { getMockKMSServiceWithDefaults } from "../../../common/mocks/mock.kms.service";
import { KmsService } from "../../../common/kms.service";
import { getRandomMonoTransaction } from "../../test_utils/utils";
import { AlertService } from "../../../common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../common/mocks/mock.alert.service";
import { MonoWebhookService } from "../../webhook/mono.webhook.service";
import { EmployerService } from "../../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../../modules/employer/mocks/mock.employer.service";
import { PayrollStatus } from "../../../../modules/employer/domain/Payroll";
import { getRandomPayroll } from "../../../../modules/employer/test_utils/payroll.test.utils";

describe("MonoServiceTests", () => {
  jest.setTimeout(20000);

  let monoRepo: IMonoRepo;
  let monoWebhookMappers: MonoWebhookMappers;
  let kmsService: KmsService;
  let consumerService: ConsumerService;
  let employerService: EmployerService;
  let alertService: AlertService;
  let app: TestingModule;
  let monoWebhookService: MonoWebhookService;

  beforeEach(async () => {
    monoRepo = getMockMonoRepoWithDefaults();
    monoWebhookMappers = getMockMonoWebhookHandlersWithDefaults();
    kmsService = getMockKMSServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();
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
          provide: EmployerService,
          useFactory: () => instance(employerService),
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
        when(alertService.raiseCriticalAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseCriticalAlert).last();
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
        when(alertService.raiseCriticalAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseCriticalAlert).last();
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
        when(alertService.raiseCriticalAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(monoRepo.updateMonoTransaction(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseCriticalAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "MONO_TRANSACTION_NOT_FOUND" }));
      });
    });

    describe("account_credited", () => {
      it("should update the state to 'FUNDED' along with 'transactionID' if there is a unique match of document_number", async () => {
        const monoTransaction: MonoTransaction = getRandomMonoTransaction(MonoTransactionType.WITHDRAWAL);
        const convertedEvent: MonoAccountCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          accountNumber: "ACCOUNT_12345",
          currency: MonoCurrency.COP,
          transactionID: "MONO_TRANSACTION_ID",
          payerDocumentNumber: "DOCUMENT_12345",
          payerName: "PAYER",
          description: "Account Credited",
        };
        const employerID = "EMPLOYER_ID";
        const { payroll } = getRandomPayroll(employerID);

        const webhookBody = {
          event: {
            data: {},
            type: "account_credited",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookMappers.convertAccountCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(100, "DOCUMENT_12345"),
        ).thenResolve([payroll]);
        when(employerService.updatePayroll(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        const [updatePayrollCallID, updatePayrollCallBody] = capture(employerService.updatePayroll).last();
        expect(updatePayrollCallID).toBe(payroll.id);
        expect(updatePayrollCallBody).toStrictEqual({
          status: PayrollStatus.FUNDED,
          paymentMonoTransactionID: "MONO_TRANSACTION_ID",
        });
      });

      it("should try with 'bankName' if documentNumber doesn't provide unique match", async () => {
        const convertedEvent: MonoAccountCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          accountNumber: "ACCOUNT_12345",
          currency: MonoCurrency.COP,
          transactionID: "MONO_TRANSACTION_ID",
          payerDocumentNumber: "DOCUMENT_12345",
          payerName: "PAYER",
          description: "Account Credited",
        };
        const employerID = "EMPLOYER_ID";
        const { payroll: payroll1 } = getRandomPayroll(employerID);
        const { payroll: payroll2 } = getRandomPayroll(employerID);
        const { payroll: payroll3 } = getRandomPayroll(employerID);

        const webhookBody = {
          event: {
            data: {},
            type: "account_credited",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookMappers.convertAccountCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(100, "DOCUMENT_12345"),
        ).thenResolve([payroll1, payroll2]);
        when(employerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(100, "PAYER")).thenResolve([
          payroll3,
        ]);
        when(employerService.updatePayroll(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        const [updatePayrollCallID, updatePayrollCallBody] = capture(employerService.updatePayroll).last();
        expect(updatePayrollCallID).toBe(payroll3.id);
        expect(updatePayrollCallBody).toStrictEqual({
          status: PayrollStatus.FUNDED,
          paymentMonoTransactionID: "MONO_TRANSACTION_ID",
        });
      });

      it("should try the intersection between the payrolls matching 'bankName' & matching documentNumber if they both aren't unique", async () => {
        const convertedEvent: MonoAccountCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          accountNumber: "ACCOUNT_12345",
          currency: MonoCurrency.COP,
          transactionID: "MONO_TRANSACTION_ID",
          payerDocumentNumber: "DOCUMENT_12345",
          payerName: "PAYER",
          description: "Account Credited",
        };
        const employerID = "EMPLOYER_ID";
        const { payroll: payroll1 } = getRandomPayroll(employerID);
        const { payroll: payroll2 } = getRandomPayroll(employerID);
        const { payroll: payroll3 } = getRandomPayroll(employerID);

        const webhookBody = {
          event: {
            data: {},
            type: "account_credited",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookMappers.convertAccountCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(100, "DOCUMENT_12345"),
        ).thenResolve([payroll1, payroll2]);
        when(employerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(100, "PAYER")).thenResolve([
          payroll3,
          payroll2,
        ]);
        when(employerService.updatePayroll(anyString(), anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        const [updatePayrollCallID, updatePayrollCallBody] = capture(employerService.updatePayroll).last();
        expect(updatePayrollCallID).toBe(payroll2.id);
        expect(updatePayrollCallBody).toStrictEqual({
          status: PayrollStatus.FUNDED,
          paymentMonoTransactionID: "MONO_TRANSACTION_ID",
        });
      });

      it("should raise an alert if there are multiple matches after intersection", async () => {
        const convertedEvent: MonoAccountCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          accountNumber: "ACCOUNT_12345",
          currency: MonoCurrency.COP,
          transactionID: "MONO_TRANSACTION_ID",
          payerDocumentNumber: "DOCUMENT_12345",
          payerName: "PAYER",
          description: "Account Credited",
        };
        const employerID = "EMPLOYER_ID";
        const { payroll: payroll1 } = getRandomPayroll(employerID);
        const { payroll: payroll2 } = getRandomPayroll(employerID);
        const { payroll: payroll3 } = getRandomPayroll(employerID);

        const webhookBody = {
          event: {
            data: {},
            type: "account_credited",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookMappers.convertAccountCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(100, "DOCUMENT_12345"),
        ).thenResolve([payroll1, payroll2, payroll3]);
        when(employerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(100, "PAYER")).thenResolve([
          payroll3,
          payroll2,
        ]);
        when(alertService.raiseCriticalAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(employerService.updatePayroll(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseCriticalAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "UNMATCHED_ACCOUNT_CREDITED_MONO_EVENT" }));
      });

      it("should raise an alert if there are no matches after intersection", async () => {
        const convertedEvent: MonoAccountCreditedEvent = {
          accountID: "accountID",
          amount: 100,
          accountNumber: "ACCOUNT_12345",
          currency: MonoCurrency.COP,
          transactionID: "MONO_TRANSACTION_ID",
          payerDocumentNumber: "DOCUMENT_12345",
          payerName: "PAYER",
          description: "Account Credited",
        };
        const employerID = "EMPLOYER_ID";
        const { payroll: payroll1 } = getRandomPayroll(employerID);
        const { payroll: payroll2 } = getRandomPayroll(employerID);
        const { payroll: payroll3 } = getRandomPayroll(employerID);

        const webhookBody = {
          event: {
            data: {},
            type: "account_credited",
          },
          timestamp: "2022-12-29T15:42:08.325158Z",
        };
        const webhookSignature = "signature";

        when(monoWebhookMappers.convertAccountCredited(deepEqual(webhookBody), webhookSignature)).thenReturn(
          convertedEvent,
        );
        when(
          employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(100, "DOCUMENT_12345"),
        ).thenResolve([payroll1, payroll2, payroll3]);
        when(employerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(100, "PAYER")).thenResolve([
          payroll3,
          payroll2,
        ]);
        when(alertService.raiseCriticalAlert(anything())).thenResolve();

        await monoWebhookService.processWebhookEvent(webhookBody, webhookSignature);

        verify(employerService.updatePayroll(anyString(), anything())).never();

        const [alertCall] = capture(alertService.raiseCriticalAlert).last();
        expect(alertCall).toEqual(expect.objectContaining({ key: "UNMATCHED_ACCOUNT_CREDITED_MONO_EVENT" }));
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
