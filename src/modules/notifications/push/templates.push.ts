import { PushNotificationParams } from "../domain/PushNotificationTypes";

export const pushNotificationBodyTemplates = {
  template_send_deposit_successful_en: (params: PushNotificationParams) =>
    `Successfully deposited ${params.transactionParams.amount} ${params.transactionParams.currency} into your Noba account`,

  template_send_deposit_successful_es: (params: PushNotificationParams) =>
    `Se han depositado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} en tu cuenta de Noba`,

  template_send_withdrawal_successful_en: (params: PushNotificationParams) =>
    `Successfully withdrew ${params.transactionParams.amount} ${params.transactionParams.currency} from your Noba account`,

  template_send_withdrawal_successful_es: (params: PushNotificationParams) =>
    `Se han retirado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} de tu cuenta de Noba`,

  template_send_transfer_successful_sender_en: (params: PushNotificationParams) =>
    `Successfully sent ${params.transactionParams.amount} ${params.transactionParams.currency} to ${params.transactionParams.receiverHandle}`,

  template_send_transfer_successful_sender_es: (params: PushNotificationParams) =>
    `Se han enviado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} a ${params.transactionParams.receiverHandle}`,

  template_send_transfer_successful_receiver_en: (params: PushNotificationParams) =>
    `Received ${params.transactionParams.amount} ${params.transactionParams.currency} from ${params.transactionParams.senderHandle}`,

  template_send_transfer_successful_receiver_es: (params: PushNotificationParams) =>
    `Has recibido ${params.transactionParams.amount} ${params.transactionParams.currency} de ${params.transactionParams.senderHandle}`,
};

export const pushNotificationTitleTemplates = {
  template_send_deposit_successful_en: () => "Deposit completed",
  template_send_deposit_successful_es: () => "Depósito completado",
  template_send_withdrawal_successful_en: () => "Withdrawal completed",
  template_send_withdrawal_successful_es: () => "Retiro completado",
  template_send_transfer_successful_sender_en: () => "Transfer completed",
  template_send_transfer_successful_sender_es: () => "Transferencia completada",
  template_send_transfer_successful_receiver_en: () => "Transfer received",
  template_send_transfer_successful_receiver_es: () => "Transferencia recibida",
};
