import { Inject, Injectable } from "@nestjs/common";
import { PushClient } from "./push/push.client";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
import { PushTemplates } from "./domain/PushTemplates";
import { SendTransferCompletedEvent } from "./events/SendTransferCompletedEvent";
import { SendWithdrawalCompletedEvent } from "./events/SendWithdrawalCompletedEvent";
import { SendTransferReceivedEvent } from "./events/SendTransferReceivedEvent";

@Injectable()
export class PushEventHandler {
  @Inject("PushNotificationClient")
  private readonly pushClient: PushClient;

  @OnEvent(`push.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  async sendDepositCompletedEvent(payload: SendDepositCompletedEvent) {
    const pushTokens = payload.pushTokens;

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        templateKey: PushTemplates.getOrDefault(PushTemplates.DEPOSIT_COMPLETED_PUSH, payload.locale ?? "en"),
        params: {
          amount: payload.params.creditAmount,
          currency: payload.params.creditCurrency,
        },
      });
    }
  }

  @OnEvent(`push.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  async sendWithdrawalCompletedEvent(payload: SendWithdrawalCompletedEvent) {
    const pushTokens = payload.pushTokens;

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        templateKey: PushTemplates.getOrDefault(PushTemplates.WITHDRAWAL_COMPLETED_PUSH, payload.locale ?? "en"),
        params: {
          amount: payload.params.debitAmount,
          currency: payload.params.debitCurrency,
        },
      });
    }
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  async sendTransferCompletedEvent(payload: SendTransferCompletedEvent) {
    const pushTokens = payload.pushTokens;

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        templateKey: PushTemplates.getOrDefault(PushTemplates.TRANSFER_COMPLETED_PUSH, payload.locale ?? "en"),
        params: {
          amount: payload.params.debitAmount,
          currency: payload.params.debitCurrency,
          receiverHandle: payload.params.creditConsumer_handle,
        },
        transferCounterPartyHandle: payload.params.creditConsumer_handle,
      });
    }
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`)
  async sendTransferReceivedEvent(payload: SendTransferReceivedEvent) {
    const pushTokens = payload.pushTokens;

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        templateKey: PushTemplates.getOrDefault(PushTemplates.TRANSFER_RECEIVED_PUSH, payload.locale ?? "en"),
        params: {
          amount: payload.params.creditAmount,
          currency: payload.params.creditCurrency,
          senderHandle: payload.params.debitConsumer_handle,
        },
        transferCounterPartyHandle: payload.params.debitConsumer_handle,
      });
    }
  }
}
