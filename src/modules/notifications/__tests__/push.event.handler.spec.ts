import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, deepEqual, instance, verify, when } from "ts-mockito";
import { PushClient } from "../push/push.client";
import { PushEventHandler } from "../push.event.handler";
import { getMockPushClientWithDefaults } from "../mocks/mock.push.client";
import { WorkflowName } from "../../../modules/transaction/domain/Transaction";
import { TransactionParameters } from "../domain/TransactionNotificationParameters";
import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendTransferCompletedEvent } from "../events/SendTransferCompletedEvent";
import { SendTransferReceivedEvent } from "../events/SendTransferReceivedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendTransferFailedEvent } from "../events/SendTransferFailedEvent";
import { SendPayrollDepositCompletedEvent } from "../events/SendPayrollDepositCompletedEvent";
import { PushNotificationType } from "../domain/PushNotificationTypes";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { PushTokenService } from "../push.token.service";
import { getMockPushTokenServiceWithDefaults } from "../mocks/mock.pushtoken.service";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";

describe.each([
  ["en", "en"],
  ["es", "es"],
  ["es_co", "es"],
  ["hi", "en"],
])("PushEventHandler Tests", (locale: string, expectedSuffix: string) => {
  let mockPushClient: PushClient;
  let eventHandler: PushEventHandler;
  let mockPushTokenService: PushTokenService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    mockPushClient = getMockPushClientWithDefaults();
    mockPushTokenService = getMockPushTokenServiceWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: "PushNotificationClient",
          useFactory: () => instance(mockPushClient),
        },
        {
          provide: PushTokenService,
          useFactory: () => instance(mockPushTokenService),
        },
        PushEventHandler,
      ],
    }).compile();

    eventHandler = app.get<PushEventHandler>(PushEventHandler);
    when(mockPushClient.sendPushNotification(anything())).thenResolve();
  });

  it(`should call pushClient with Deposit completed event and ${locale} locale`, async () => {
    const payload: SendDepositCompletedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: getTransactionParams(WorkflowName.WALLET_DEPOSIT),
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendDepositCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_deposit_successful_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
            },
          },
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_deposit_successful_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
            },
          },
        }),
      ),
    ).once();
  });

  it(`should call pushClient with Deposit failed event and ${locale} locale`, async () => {
    const payload: SendDepositFailedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        reasonDeclined: "reason-declined",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendDepositFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_deposit_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
            },
          },
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_deposit_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
            },
          },
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Withdrawal completed event and ${locale} locale`, async () => {
    const payload: SendWithdrawalCompletedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendWithdrawalCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_withdrawal_successful_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_withdrawal_successful_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Withdrawal failed event and ${locale} locale`, async () => {
    const payload: SendWithdrawalFailedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        reasonDeclined: "reason-declined",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendWithdrawalFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_withdrawal_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_withdrawal_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Transfer completed event and ${locale} locale`, async () => {
    const payload: SendTransferCompletedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
        creditConsumer_firstName: "Justin",
        creditConsumer_lastName: "Ashworth",
        creditConsumer_handle: "justin",
        debitConsumer_handle: "gal",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendTransferCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_transfer_successful_sender_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
              receiverHandle: payload.params.creditConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_transfer_successful_sender_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
              receiverHandle: payload.params.creditConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Transfer failed event and ${locale} locale`, async () => {
    const payload: SendTransferFailedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
        creditConsumer_firstName: "Justin",
        creditConsumer_lastName: "Ashworth",
        creditConsumer_handle: "justin",
        debitConsumer_handle: "gal",
        reasonDeclined: "reason-declined",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendTransferFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_transfer_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
              receiverHandle: payload.params.creditConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_transfer_failed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
              receiverHandle: payload.params.creditConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Transfer completed event for receiver and ${locale} locale`, async () => {
    const payload: SendTransferReceivedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
        creditConsumer_firstName: "Justin",
        creditConsumer_lastName: "Ashworth",
        creditConsumer_handle: "justin",
        debitConsumer_handle: "gal",
        debitConsumer_firstName: "Gal",
        debitConsumer_lastName: "Ben Chanoch",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendTransferReceivedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_transfer_successful_receiver_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
              senderHandle: payload.params.debitConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.debitConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_transfer_successful_receiver_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
              senderHandle: payload.params.debitConsumer_handle,
            },
          },
          transferCounterPartyHandle: payload.params.debitConsumer_handle,
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Payroll deposit completed event and ${locale} locale`, async () => {
    const payload: SendPayrollDepositCompletedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        companyName: "FakeCompany",
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    await eventHandler.sendPayrollDepositCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          templateKey: `template_send_payroll_deposit_completed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
            payrollParams: {
              companyName: payload.params.companyName,
            },
          },
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          templateKey: `template_send_payroll_deposit_completed_${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
            payrollParams: {
              companyName: payload.params.companyName,
            },
          },
        }),
      ),
    ).once();
  });
});

function getTransactionParams(workflow: WorkflowName): TransactionParameters {
  switch (workflow) {
    case WorkflowName.WALLET_DEPOSIT:
      return {
        debitAmount: 5000,
        debitCurrency: "COP",
        creditAmount: 1,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };

    case WorkflowName.WALLET_WITHDRAWAL:
      return {
        debitAmount: 1,
        debitCurrency: "USD",
        creditAmount: 5000,
        creditCurrency: "COP",
        exchangeRate: 5000,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
    case WorkflowName.WALLET_TRANSFER:
      return {
        debitAmount: 10,
        debitCurrency: "USD",
        creditAmount: 9.43,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
    case WorkflowName.PAYROLL_DEPOSIT:
      return {
        debitAmount: 5000,
        debitCurrency: "COP",
        creditAmount: 1,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
  }
}
