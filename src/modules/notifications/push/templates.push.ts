import { PushNotificationParams } from "../domain/PushNotificationTypes";

export const pushNotificationBodyTemplates = {
  template_send_deposit_successfull_en: (params: PushNotificationParams) =>
    `Successfully deposited ${params.amount} ${params.currency} into your Noba account`,

  template_send_withdrawal_successfull_en: (params: PushNotificationParams) =>
    `Successfully withdrew ${params.amount} ${params.currency} from your Noba account`,

  template_send_transfer_successfull_sender_en: (params: PushNotificationParams) =>
    `Successfully sent ${params.amount} ${params.currency} to ${params.receiverHandle}`,

  template_send_transfer_successfull_receiver_en: (params: PushNotificationParams) =>
    `Received ${params.amount} ${params.currency} from ${params.senderHandle}`,
};

export const pushNotificationTitleTemplates = {
  template_send_deposit_successfull_en: () => "Deposit completed",
  template_send_withdrawal_successfull_en: () => "Withdrawal completed",
  template_send_transfer_successfull_sender_en: () => "Transfer completed",
  template_send_transfer_successfull_receiver_en: () => "Transfer received",
};
