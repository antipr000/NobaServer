import { PaymentMethod } from "../../../modules/consumer/domain/PaymentMethod";
import { ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { CheckoutResponseData } from "./CheckoutResponseData";

export type AddPaymentMethodResponse = {
  updatedConsumerData?: ConsumerProps;
  checkoutResponseData: CheckoutResponseData;
  newPaymentMethod?: PaymentMethod;
};
