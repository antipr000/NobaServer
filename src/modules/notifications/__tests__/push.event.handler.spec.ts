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
import { EventRepo } from "../repos/event.repo";
import { getMockEventRepoWithDefaults } from "../mocks/mock.event.repo";
import { NotificationEventType } from "../domain/NotificationTypes";
import { EventHandlers } from "../domain/EventHandlers";
import { SendCreditAdjustmentCompletedEvent } from "../events/SendCreditAdjustmentCompletedEvent";
import { SendScheduledReminderEvent } from "../events/SendScheduledReminderEvent";
import { LocaleUtils } from "../../../core/utils/LocaleUtils";

describe.each([
  ["en", "en"],
  ["es", "es"],
  ["es_co", "es"],
  ["hi", "en"],
])("PushEventHandler Tests", (locale: string, expectedSuffix: string) => {
  let mockPushClient: PushClient;
  let eventHandler: PushEventHandler;
  let mockPushTokenService: PushTokenService;
  let mockEventRepo: EventRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    mockPushClient = getMockPushClientWithDefaults();
    mockPushTokenService = getMockPushTokenServiceWithDefaults();
    mockEventRepo = getMockEventRepoWithDefaults();

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
        {
          provide: "EventRepo",
          useFactory: () => instance(mockEventRepo),
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Deposited {{amount}} {{currency}} to your Noba account. Message is in es",
          templateTitle: "Deposited completed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Deposited {{amount}} {{currency}} to your Noba account. Message is in en",
          templateTitle: "Deposited completed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendDepositCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Deposited ${payload.params.creditAmount} ${payload.params.creditCurrency} to your Noba account. Message is in ${expectedSuffix}`,
          title: `Deposited completed title in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Deposited ${payload.params.creditAmount} ${payload.params.creditCurrency} to your Noba account. Message is in ${expectedSuffix}`,
          title: `Deposited completed title in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Failed to deposit {{amount}} {{currency}} to your Noba account. Message is in es",
          templateTitle: "Deposit failed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Failed to deposit {{amount}} {{currency}} to your Noba account. Message is in en",
          templateTitle: "Deposit failed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendDepositFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          title: `Deposit failed title in ${expectedSuffix}`,
          body: `Failed to deposit ${payload.params.creditAmount} ${payload.params.creditCurrency} to your Noba account. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          title: `Deposit failed title in ${expectedSuffix}`,
          body: `Failed to deposit ${payload.params.creditAmount} ${payload.params.creditCurrency} to your Noba account. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Successfully withdrawn {{amount}} {{currency}} from your Noba account. Message is in es",
          templateTitle: "Withdrawal completed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Successfully withdrawn {{amount}} {{currency}} from your Noba account. Message is in en",
          templateTitle: "Withdrawal completed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendWithdrawalCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Withdrawal completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Successfully withdrawn ${payload.params.debitAmount} ${payload.params.debitCurrency} from your Noba account. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Withdrawal completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Successfully withdrawn ${payload.params.debitAmount} ${payload.params.debitCurrency} from your Noba account. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Failed to withdraw {{amount}} {{currency}} from your Noba account. Message is in es",
          templateTitle: "Withdrawal failed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Failed to withdraw {{amount}} {{currency}} from your Noba account. Message is in en",
          templateTitle: "Withdrawal failed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendWithdrawalFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Withdrawal failed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Failed to withdraw ${payload.params.debitAmount} ${payload.params.debitCurrency} from your Noba account. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Withdrawal failed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Failed to withdraw ${payload.params.debitAmount} ${payload.params.debitCurrency} from your Noba account. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Successfully transferred {{amount}} {{currency}} to {{receiverHandle}}. Message is in es",
          templateTitle: "Transfer completed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Successfully transferred {{amount}} {{currency}} to {{receiverHandle}}. Message is in en",
          templateTitle: "Transfer completed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendTransferCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Transfer completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Successfully transferred ${payload.params.debitAmount} ${payload.params.debitCurrency} to ${payload.params.creditConsumer_handle}. Message is in ${expectedSuffix}`,
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Transfer completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Successfully transferred ${payload.params.debitAmount} ${payload.params.debitCurrency} to ${payload.params.creditConsumer_handle}. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_FAILED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Failed to transfer {{amount}} {{currency}} to {{receiverHandle}}. Message is in es",
          templateTitle: "Transfer failed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Failed to transfer {{amount}} {{currency}} to {{receiverHandle}}. Message is in en",
          templateTitle: "Transfer failed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendTransferFailedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Transfer failed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Failed to transfer ${payload.params.debitAmount} ${payload.params.debitCurrency} to ${payload.params.creditConsumer_handle}. Message is in ${expectedSuffix}`,
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Transfer failed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Failed to transfer ${payload.params.debitAmount} ${payload.params.debitCurrency} to ${payload.params.creditConsumer_handle}. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Received {{amount}} {{currency}} from {{senderHandle}}. Message is in es",
          templateTitle: "Transfer received title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Received {{amount}} {{currency}} from {{senderHandle}}. Message is in en",
          templateTitle: "Transfer received title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendTransferReceivedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Transfer received title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Received ${payload.params.creditAmount} ${payload.params.creditCurrency} from ${payload.params.debitConsumer_handle}. Message is in ${expectedSuffix}`,
          transferCounterPartyHandle: payload.params.debitConsumer_handle,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Transfer received title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Received ${payload.params.creditAmount} ${payload.params.creditCurrency} from ${payload.params.debitConsumer_handle}. Message is in ${expectedSuffix}`,
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

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "Received {{amount}} {{currency}} from {{companyName}}. Message is in es",
          templateTitle: "Payroll deposit completed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Received {{amount}} {{currency}} from {{companyName}}. Message is in en",
          templateTitle: "Payroll deposit completed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendPayrollDepositCompletedEvent(payload);

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Payroll deposit completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Received ${payload.params.debitAmount} ${payload.params.debitCurrency} from ${payload.params.companyName}. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Payroll deposit completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `Received ${payload.params.debitAmount} ${payload.params.debitCurrency} from ${payload.params.companyName}. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();
  });

  it(`should call PushClient with Credit adjustment completed event and ${locale} locale`, async () => {
    const payload: SendCreditAdjustmentCompletedEvent = {
      email: "fake+user@noba.com",
      firstName: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.CREDIT_ADJUSTMENT),
      },
      locale: locale,
    };

    when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
      "push-token-1",
      "push-token-2",
    ]);

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT,
      handlers: [EventHandlers.PUSH, EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "{{amount}} {{currency}} was added to your Noba account. Message is in es",
          templateTitle: "Credit adjustment completed title in es",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "{{amount}} {{currency}} was added to your Noba account. Message is in en",
          templateTitle: "Credit adjustment completed title in en",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.PUSH,
        },
      ],
    });

    await eventHandler.sendCreditAdjustmentCompletedEvent(payload);
    console.log({
      token: "push-token-1",
      title: `Credit adjustment completed title in ${expectedSuffix}`,
      notificationType: PushNotificationType.TRANSACTION_UPDATE,
      transactionRef: payload.params.transactionRef,
      body: `${payload.params.creditAmount} ${payload.params.creditCurrency} was added to your Noba account. Message is in ${expectedSuffix}`,
    });
    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-1",
          title: `Credit adjustment completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `${payload.params.creditAmount} ${payload.params.creditCurrency} was added to your Noba account. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();

    verify(
      mockPushClient.sendPushNotification(
        deepEqual({
          token: "push-token-2",
          title: `Credit adjustment completed title in ${expectedSuffix}`,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body: `${payload.params.creditAmount} ${payload.params.creditCurrency} was added to your Noba account. Message is in ${expectedSuffix}`,
        }),
      ),
    ).once();
  });

  describe("sendScheduledReminderEvent", () => {
    it(`should send Scheduled Reminder Email with ${expectedSuffix} template when locale is ${locale}`, async () => {
      const payload: SendScheduledReminderEvent = {
        eventID: "fake-event-id",
        firstName: "First",
        lastName: "Last",
        email: "fake+email@noba.com",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([
        "push-token-1",
        "push-token-2",
      ]);

      when(mockEventRepo.getEventByIDOrName(payload.eventID)).thenResolve({
        id: "fake-event-id",
        name: "Some Fake Event",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [EventHandlers.EMAIL],
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            templateTitle: "Scheduled reminder title in en",
            templateBody: "Scheduled reminder body in en",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.PUSH,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            templateTitle: "Scheduled reminder title in es",
            templateBody: "Scheduled reminder body in es",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.PUSH,
          },
        ],
      });

      when(mockPushClient.sendPushNotification(anything())).thenResolve();

      const response = await eventHandler.sendScheduledReminderEvent(payload);
      expect(response).toBeTruthy();

      verify(
        mockPushClient.sendPushNotification(
          deepEqual({
            token: "push-token-1",
            title: `Scheduled reminder title in ${expectedSuffix}`,
            notificationType: PushNotificationType.SCHEDULED_REMINDER,
            body: `Scheduled reminder body in ${expectedSuffix}`,
          }),
        ),
      ).once();

      verify(
        mockPushClient.sendPushNotification(
          deepEqual({
            token: "push-token-2",
            title: `Scheduled reminder title in ${expectedSuffix}`,
            notificationType: PushNotificationType.SCHEDULED_REMINDER,
            body: `Scheduled reminder body in ${expectedSuffix}`,
          }),
        ),
      ).once();
    });

    it("should return false when no push tokens exist", async () => {
      const payload: SendScheduledReminderEvent = {
        eventID: "fake-event-id",
        firstName: "First",
        lastName: "Last",
        email: "fake+email@noba.com",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockPushTokenService.getPushTokensForConsumer(payload.nobaUserID)).thenResolve([]);

      when(mockEventRepo.getEventByIDOrName(payload.eventID)).thenResolve({
        id: "fake-event-id",
        name: "Some Fake Event",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [EventHandlers.EMAIL],
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            templateTitle: "Scheduled reminder title in en",
            templateBody: "Scheduled reminder body in en",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.PUSH,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            templateTitle: "Scheduled reminder title in es",
            templateBody: "Scheduled reminder body in es",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.PUSH,
          },
        ],
      });

      when(mockPushClient.sendPushNotification(anything())).thenResolve();

      const response = await eventHandler.sendScheduledReminderEvent(payload);
      expect(response).toBeFalsy();
    });
  });
});

function getTransactionParams(workflow: WorkflowName): TransactionParameters {
  switch (workflow) {
    case WorkflowName.WALLET_DEPOSIT:
      return {
        debitAmount: LocaleUtils.localizeAmount(5000, "en"),
        debitAmountNumber: 5000,
        debitCurrency: "COP",
        creditAmount: LocaleUtils.localizeAmount(1, "en"),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, "en"),
        nobaFees: LocaleUtils.localizeAmount(0.34, "en"),
        totalFees: LocaleUtils.localizeAmount(0.57, "en"),
        totalFeesNumber: 0.57,
      };

    case WorkflowName.WALLET_WITHDRAWAL:
      return {
        debitAmount: LocaleUtils.localizeAmount(1, "en"),
        debitAmountNumber: 1,
        debitCurrency: "USD",
        creditAmount: LocaleUtils.localizeAmount(5000, "en"),
        creditAmountNumber: 5000,
        creditCurrency: "COP",
        exchangeRate: LocaleUtils.localizeAmount(5000, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, "en"),
        nobaFees: LocaleUtils.localizeAmount(0.34, "en"),
        totalFees: LocaleUtils.localizeAmount(0.57, "en"),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.WALLET_TRANSFER:
      return {
        debitAmount: LocaleUtils.localizeAmount(10, "en"),
        debitAmountNumber: 10,
        debitCurrency: "USD",
        creditAmount: LocaleUtils.localizeAmount(9.43, "en"),
        creditAmountNumber: 9.43,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, "en"),
        nobaFees: LocaleUtils.localizeAmount(0.34, "en"),
        totalFees: LocaleUtils.localizeAmount(0.57, "en"),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.PAYROLL_DEPOSIT:
      return {
        debitAmount: LocaleUtils.localizeAmount(5000, "en"),
        debitAmountNumber: 5000,
        debitCurrency: "COP",
        creditAmount: LocaleUtils.localizeAmount(1, "en"),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, "en"),
        nobaFees: LocaleUtils.localizeAmount(0.34, "en"),
        totalFees: LocaleUtils.localizeAmount(0.57, "en"),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.CREDIT_ADJUSTMENT:
      return {
        creditAmount: LocaleUtils.localizeAmount(1, "en"),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        debitAmount: null,
        debitAmountNumber: null,
        debitCurrency: null,
        exchangeRate: LocaleUtils.localizeAmount(1, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: null,
        nobaFees: null,
        totalFees: null,
        totalFeesNumber: null,
      };
  }
}
