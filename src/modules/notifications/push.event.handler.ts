import { Inject, Injectable } from "@nestjs/common";
import { PushClient } from "./push/push.client";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendDepositCompletedEvent } from "./events/SendDepositCompletedEvent";
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
import { EventRepo } from "./repos/event.repo";
import { EventHandlers } from "./domain/EventHandlers";
import { TemplateProcessor } from "../common/utils/template.processor";
import { SendCreditAdjustmentCompletedEvent } from "./events/SendCreditAdjustmentCompletedEvent";
import { SendScheduledReminderEvent } from "./events/SendScheduledReminderEvent";

@Injectable()
export class PushEventHandler {
  @Inject("PushNotificationClient")
  private readonly pushClient: PushClient;

  @Inject()
  private readonly pushTokenService: PushTokenService;

  @Inject("EventRepo")
  private readonly eventRepo: EventRepo;

  private async getOrDefaultTemplateData(
    eventIDOrName: string,
    locale: string,
  ): Promise<{
    title: string;
    body: string;
  }> {
    const event = await this.eventRepo.getEventByIDOrName(eventIDOrName);
    const pushTemplates = event.templates.filter(template => template.type === EventHandlers.PUSH);

    locale = locale?.toLowerCase() ?? "en";
    if (pushTemplates.find(template => template.locale === locale)) {
      const template = pushTemplates.find(template => template.locale === locale);
      return {
        title: template.templateTitle,
        body: template.templateBody,
      };
    }

    const localePrefix = locale.split("_")[0];

    if (pushTemplates.find(template => template.locale === localePrefix)) {
      const template = pushTemplates.find(template => template.locale === localePrefix);
      return {
        title: template.templateTitle,
        body: template.templateBody,
      };
    }
    const template = pushTemplates.find(template => template.locale === "en");
    return {
      title: template.templateTitle,
      body: template.templateBody,
    };
  }

  @OnEvent(`push.${NotificationEventType.SEND_SCHEDULED_REMINDER_EVENT}`)
  async sendScheduledReminderEvent(payload: SendScheduledReminderEvent): Promise<boolean> {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    if (pushTokens.length === 0) {
      return false;
    }

    const templateData = await this.getOrDefaultTemplateData(payload.eventID, payload.locale);

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      handle: payload.handle,
    });

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        notificationType: PushNotificationType.SCHEDULED_REMINDER,
        body,
        title: templateData.title,
      });
    }
    return true;
  }

  @OnEvent(`push.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`)
  async sendDepositCompletedEvent(payload: SendDepositCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.creditAmount,
      currency: payload.params.creditCurrency,
    });

    for (const pushToken of pushTokens) {
      await this.pushClient.sendPushNotification({
        token: pushToken,
        notificationType: PushNotificationType.TRANSACTION_UPDATE,
        transactionRef: payload.params.transactionRef,
        body,
        title: templateData.title,
      });
    }
  }

  @OnEvent(`push.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`)
  async sendDepositFailedEvent(payload: SendDepositFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.creditAmount,
      currency: payload.params.creditCurrency,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`)
  async sendWithdrawalCompletedEvent(payload: SendWithdrawalCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.debitAmount,
      currency: payload.params.debitCurrency,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`)
  async sendWithdrawalFailedEvent(payload: SendWithdrawalFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.debitAmount,
      currency: payload.params.debitCurrency,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`)
  async sendTransferCompletedEvent(payload: SendTransferCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.debitAmount,
      currency: payload.params.debitCurrency,
      receiverHandle: payload.params.creditConsumer_handle,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
          title: templateData.title,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_FAILED_EVENT}`)
  async sendTransferFailedEvent(payload: SendTransferFailedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.debitAmount,
      currency: payload.params.debitCurrency,
      receiverHandle: payload.params.creditConsumer_handle,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
          transferCounterPartyHandle: payload.params.creditConsumer_handle,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`)
  async sendTransferReceivedEvent(payload: SendTransferReceivedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.creditAmount,
      currency: payload.params.creditCurrency,
      senderHandle: payload.params.debitConsumer_handle,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
          transferCounterPartyHandle: payload.params.debitConsumer_handle,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT}`)
  async sendPayrollDepositCompletedEvent(payload: SendPayrollDepositCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);

    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.debitAmount,
      currency: payload.params.debitCurrency,
      companyName: payload.params.companyName,
    });

    const promises = pushTokens.map(
      async pushToken =>
        await this.pushClient.sendPushNotification({
          token: pushToken,
          notificationType: PushNotificationType.TRANSACTION_UPDATE,
          transactionRef: payload.params.transactionRef,
          body,
          title: templateData.title,
        }),
    );

    await Promise.all(promises);
  }

  @OnEvent(`push.${NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT}`)
  async sendCreditAdjustmentCompletedEvent(payload: SendCreditAdjustmentCompletedEvent) {
    const pushTokens = await this.pushTokenService.getPushTokensForConsumer(payload.nobaUserID);
    const templateData = await this.getOrDefaultTemplateData(
      NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT,
      payload.locale,
    );

    const body = TemplateProcessor.parseTemplateString(templateData.body, {
      amount: payload.params.creditAmount,
      currency: payload.params.creditCurrency,
    });

    const promises = pushTokens.map(async pushToken => {
      return await this.pushClient.sendPushNotification({
        token: pushToken,
        notificationType: PushNotificationType.TRANSACTION_UPDATE,
        transactionRef: payload.params.transactionRef,
        body,
        title: templateData.title,
      });
    });

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
