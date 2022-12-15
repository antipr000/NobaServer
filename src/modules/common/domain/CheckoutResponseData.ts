import { PaymentMethodStatus } from "@prisma/client";

export class CheckoutResponseData {
  paymentMethodStatus: PaymentMethodStatus;
  responseCode: string;
  responseSummary: string;
}
