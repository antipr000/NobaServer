import { PaymentMethodStatus } from "../../../modules/consumer/domain/VerificationStatus";

export class CheckoutResponseData {
  paymentMethodStatus: PaymentMethodStatus;
  responseCode: string;
  responseSummary: string;
}
