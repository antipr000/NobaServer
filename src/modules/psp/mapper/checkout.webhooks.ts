import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PaymentCapturePendingWebhookData, PaymentPendingWebhookData } from "../domain/CheckoutTypes";

@Injectable()
export class CheckoutWebhooksMapper {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  // TODO: Add the corner cases where some of the expected field is missing.
  public convertRawPaymentPendingWebhook(data: any): PaymentPendingWebhookData {
    return {
      paymentID: data.id,
      amount: data.amount,
      currency: data.currency,
      processedOn: new Date(data.processed_on),
      idempotencyID: data.metadata.order_id,
    };
  }

  // TODO: Add the corner cases where some of the expected field is missing.
  public convertRawPaymentCapturePendingWebhook(data: any): PaymentCapturePendingWebhookData {
    return {
      paymentID: data.id,
      actionID: data.action_id,
      amount: data.amount,
      currency: data.currency,
      processedOn: new Date(data.processed_on),
      idempotencyID: data.metadata.order_id,
    };
  }
}
