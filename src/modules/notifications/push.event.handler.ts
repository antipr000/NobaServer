import { Inject, Injectable } from "@nestjs/common";
import { PushClient } from "./push/push.client";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { PushTemplates } from "./domain/PushTemplates";
import { SendTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendTransferReceivedEvent } from "./events/SendTransferReceivedEvent";
import { SendDepositFailedEvent } from "./events/SendDepositFailedEvent";
import { SendWithdrawalFailedEvent } from "./events/SendWithdrawalFailedEvent";
import { SendTransferFailedEvent } from "./events/SendTransferFailedEvent";
import { SendPayrollDepositCompletedEvent } from "./events/SendPayrollDepositCompletedEvent";
import { PushNotificationType } from "./domain/PushNotificationTypes";
import { PushTokenService } from "./push.token.service";
import { StubPushClient } from "./push/stub.push.client";

@Injectable()
export class PushEventHandler {
  @Inject("PushNotificationClient")
  private readonly pushClient: PushClient;

  @Inject()
  private readonly pushTokenService: PushTokenService;

  @OnEvent(`push.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  async sendDepositCompletedEvent(payload: SendDepositCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        templateKey: PushTemplates.getOrDefault(PushTemplates.DEPOSIT_COMPLETED_PUSH, payload.locale ?? "en"),
        notificationType: PushNotificationType.TRANSACTION_UPDATE,
        transactionRef: payload.params.transactionRef,
        params: {
          transactionParams: {
            amount: payload.params.creditAmount,
            currency: payload.params.creditCurrency,
          },
        },
      });
    }
  }

  @OnEvent(`push.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`)
  async sendDepositFailedEvent(payload: SendDepositFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);
    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.DEPOSIT_FAILED_PUSH, payload.locale ?? "en"),
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.creditAmount,
              currency: payload.params.creditCurrency,
            },
          },
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  async sendWithdrawalCompletedEvent(payload: SendWithdrawalCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);
    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.WITHDRAWAL_COMPLETED_PUSH, payload.locale ?? "en"),
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`)
  async sendWithdrawalFailedEvent(payload: SendWithdrawalFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.WITHDRAWAL_FAILED_PUSH, payload.locale ?? "en"),
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  async sendTransferCompletedEvent(payload: SendTransferCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.TRANSFER_COMPLETED_PUSH, payload.locale ?? "en"),
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
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_FAILED_EVENT}`)
  async sendTransferFailedEvent(payload: SendTransferFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.TRANSFER_FAILED_PUSH, payload.locale ?? "en"),
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
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`)
  async sendTransferReceivedEvent(payload: SendTransferReceivedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.TRANSFER_RECEIVED_PUSH, payload.locale ?? "en"),
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
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT}`)
  async sendPayrollDepositCompletedEvent(payload: SendPayrollDepositCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          templateKey: PushTemplates.getOrDefault(PushTemplates.PAYROLL_DEPOSIT_COMPLETED_PUSH, payload.locale ?? "en"),
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          params: {
            payrollParams: {
              companyName: payload.params.companyName,
            },
            transactionParams: {
              amount: payload.params.debitAmount,
              currency: payload.params.debitCurrency,
            },
          },
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent("push.get")
  public async getPreviousNotifications() {
    if (this.pushClient instanceof StubPushClient) {
      const notifications = this.pushClient.getPreviousPushNotifications();
      return notifications;
    }
  }

  @OnEvent("push.clear")
  public async clearPreviousNotifications() {
    if (this.pushClient instanceof StubPushClient) {
      this.pushClient.clearPreviousPushNotifications();
    }
  }
}
