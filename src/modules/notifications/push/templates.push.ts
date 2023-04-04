import { PushNotificationParams } from "../domain/PushNotificationTypes";

export const pushNotificationBodyTemplates = {
  template_send_deposit_successful_en: (params: PushNotificationParams) =>
    `Successfully deposited ${params.transactionParams.amount} ${params.transactionParams.currency} into your Noba account`,

  template_send_deposit_successful_es: (params: PushNotificationParams) =>
    `Se han depositado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} en tu cuenta de Noba`,

  template_send_deposit_failed_en: (params: PushNotificationParams) =>
    `Failed to deposit ${params.transactionParams.amount} ${params.transactionParams.currency} into your Noba account`,

  template_send_deposit_failed_es: (params: PushNotificationParams) =>
    `No se ha podido depositar ${params.transactionParams.amount} ${params.transactionParams.currency} en tu cuenta de Noba`,

  template_send_withdrawal_successful_en: (params: PushNotificationParams) =>
    `Successfully withdrew ${params.transactionParams.amount} ${params.transactionParams.currency} from your Noba account`,

  template_send_withdrawal_successful_es: (params: PushNotificationParams) =>
    `Se han retirado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} de tu cuenta de Noba`,

  template_send_withdrawal_failed_en: (params: PushNotificationParams) =>
    `Failed to withdraw ${params.transactionParams.amount} ${params.transactionParams.currency} from your Noba account`,

  template_send_withdrawal_failed_es: (params: PushNotificationParams) =>
    `No se ha podido retirar ${params.transactionParams.amount} ${params.transactionParams.currency} de tu cuenta de Noba`,

  template_send_transfer_successful_sender_en: (params: PushNotificationParams) =>
    `Successfully sent ${params.transactionParams.amount} ${params.transactionParams.currency} to ${params.transactionParams.receiverHandle}`,

  template_send_transfer_successful_sender_es: (params: PushNotificationParams) =>
    `Se han enviado correctamente ${params.transactionParams.amount} ${params.transactionParams.currency} a ${params.transactionParams.receiverHandle}`,

  template_send_transfer_failed_en: (params: PushNotificationParams) =>
    `Failed to send ${params.transactionParams.amount} ${params.transactionParams.currency} to ${params.transactionParams.receiverHandle}`,

  template_send_transfer_failed_es: (params: PushNotificationParams) =>
    `No se ha podido enviar ${params.transactionParams.amount} ${params.transactionParams.currency} a ${params.transactionParams.receiverHandle}`,

  template_send_transfer_successful_receiver_en: (params: PushNotificationParams) =>
    `Received ${params.transactionParams.amount} ${params.transactionParams.currency} from ${params.transactionParams.senderHandle}`,

  template_send_transfer_successful_receiver_es: (params: PushNotificationParams) =>
    `Has recibido ${params.transactionParams.amount} ${params.transactionParams.currency} de ${params.transactionParams.senderHandle}`,

  template_send_collection_completed_en: (params: PushNotificationParams) => "Collection from bank account completed",

  template_send_collection_completed_es: (params: PushNotificationParams) =>
    "Recolección de cuenta bancaria completada",

  template_send_payroll_deposit_completed_en: (params: PushNotificationParams) =>
    `Payroll deposit of amount ${params.transactionParams.amount} ${params.transactionParams.currency} completed for company ${params.payrollParams.companyName}}`,

  template_send_payroll_deposit_completed_es: (params: PushNotificationParams) =>
    `Depósito de nómina de importe ${params.transactionParams.amount} ${params.transactionParams.currency} completado para la empresa ${params.payrollParams.companyName}}`,
};

export const pushNotificationTitleTemplates = {
  template_send_deposit_successful_en: () => "Deposit completed",
  template_send_deposit_successful_es: () => "Depósito completado",
  template_send_deposit_failed_en: () => "Deposit failed",
  template_send_deposit_failed_es: () => "Depósito fallido",
  template_send_withdrawal_successful_en: () => "Withdrawal completed",
  template_send_withdrawal_successful_es: () => "Retiro completado",
  template_send_withdrawal_failed_en: () => "Withdrawal failed",
  template_send_withdrawal_failed_es: () => "Retiro fallido",
  template_send_transfer_successful_sender_en: () => "Transfer completed",
  template_send_transfer_successful_sender_es: () => "Transferencia completada",
  template_send_transfer_failed_en: () => "Transfer failed",
  template_send_transfer_failed_es: () => "Transferencia fallida",
  template_send_transfer_successful_receiver_en: () => "Transfer received",
  template_send_transfer_successful_receiver_es: () => "Transferencia recibida",
  template_send_collection_completed_en: () => "Collection completed",
  template_send_collection_completed_es: () => "Recolección completada",
  template_send_payroll_deposit_completed_en: () => "Payroll deposit completed",
  template_send_payroll_deposit_completed_es: () => "Depósito de nómina completado",
};
